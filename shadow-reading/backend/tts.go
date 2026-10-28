package main

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Voice 是接口返回的英语音色描述，前端据此展示名称与口音。
type Voice struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Locale string `json:"locale"`
	Gender string `json:"gender"`
}

// 服务端只允许白名单音色，避免把任意字符串透传给 CLI。
var voiceList = []Voice{
	{"en-US-AriaNeural", "Aria · 美音女声", "en-US", "Female"},
	{"en-US-GuyNeural", "Guy · 美音男声", "en-US", "Male"},
	{"en-GB-SoniaNeural", "Sonia · 英音女声", "en-GB", "Female"},
	{"en-US-JennyNeural", "Jenny · 美音女声", "en-US", "Female"},
	{"en-GB-RyanNeural", "Ryan · 英音男声", "en-GB", "Male"},
}

const defaultVoice = "en-US-AriaNeural"

var voiceSet = func() map[string]bool {
	m := make(map[string]bool, len(voiceList))
	for _, v := range voiceList {
		m[v.ID] = true
	}
	return m
}()

func validVoice(id string) bool { return voiceSet[id] }

// errTTSCLIMissing 表示本机没有可执行的 edge-tts，音频接口应返回 503。
var errTTSCLIMissing = errors.New("未找到 edge-tts 可执行文件")

// ttsAttempts 为单段音频的最大尝试次数。
const ttsAttempts = 3

// tts 负责调用 edge-tts 生成音频并维护缓存。
type tts struct {
	dir     string // 缓存根目录（AUDIO_DIR）
	bin     string // CLI 可执行文件路径，空表示未找到
	exec    func(context.Context, string, ...string) *exec.Cmd
	mu      sync.Mutex // 保证同一时刻只有一个 CLI 进程
	last    time.Time  // 上次调用起始时间，用于强制最小间隔
	minGap  time.Duration
	backoff time.Duration
	timeout time.Duration
}

func newTTS(dir string) *tts {
	return &tts{
		dir:     dir,
		bin:     resolveBin(),
		exec:    exec.CommandContext,
		minGap:  1200 * time.Millisecond,
		backoff: 2 * time.Second,
		timeout: 60 * time.Second,
	}
}

// resolveBin 按 EDGE_TTS_BIN → PATH 中的 edge-tts → 用户虚拟环境顺序查找可执行文件。
func resolveBin() string {
	if p := os.Getenv("EDGE_TTS_BIN"); executable(p) {
		return p
	}
	if p, err := exec.LookPath("edge-tts"); err == nil {
		return p
	}
	if home, err := os.UserHomeDir(); err == nil {
		p := filepath.Join(home, ".venvs", "edge-tts", "bin", "edge-tts")
		if executable(p) {
			return p
		}
	}
	return ""
}

func executable(path string) bool {
	if path == "" {
		return false
	}
	fi, err := os.Stat(path)
	return err == nil && !fi.IsDir() && fi.Mode()&0o111 != 0
}

// textHash 为英文原文摘要，取 SHA-1 前 12 位，文章编辑后文本变化会得到新文件名。
func textHash(text string) string {
	sum := sha1.Sum([]byte(text))
	return hex.EncodeToString(sum[:])[:12]
}

// cachePath 生成缓存路径：{dir}/{文章ID}/{音色}/{段落序号}-{文本哈希}.mp3。
func (t *tts) cachePath(articleID int64, voice string, index int, text string) string {
	return filepath.Join(t.dir, strconv.FormatInt(articleID, 10), voice, fmt.Sprintf("%d-%s.mp3", index, textHash(text)))
}

// cached 判断缓存文件是否存在且非空。
func cached(path string) bool {
	fi, err := os.Stat(path)
	return err == nil && !fi.IsDir() && fi.Size() > 0
}

// 朗读前剥离 Markdown 标记用的正则。
var (
	speechListPrefix = regexp.MustCompile(`^\s*(?:[-*+]|\d+[.)])\s+`)
	speechImage      = regexp.MustCompile(`!\[([^\]]*)\]\([^)]*\)`)
	speechLink       = regexp.MustCompile(`\[([^\]]*)\]\([^)]*\)`)
	speechBold       = regexp.MustCompile(`\*\*([^*]+)\*\*`)
)

// speechText 去掉 Markdown 标记，避免朗读时念出 #、**、反引号和链接地址。
// 逐行处理后再合并成一句话；单个下划线保持原样，避免破坏 snake_case。
func speechText(s string) string {
	parts := make([]string, 0, 4)
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		line = mdHeading.ReplaceAllString(line, "")
		line = strings.TrimPrefix(line, "> ")
		line = speechListPrefix.ReplaceAllString(line, "")
		line = speechImage.ReplaceAllString(line, "$1")
		line = speechLink.ReplaceAllString(line, "$1")
		line = speechBold.ReplaceAllString(line, "$1")
		line = strings.ReplaceAll(line, "`", "")
		parts = append(parts, line)
	}
	return strings.Join(parts, " ")
}

// segmentText 按阅读页顺序取该段落的英语原文：0 为英语标题，1..N 为第 N 组正文。
// 代码段与表格段不朗读，返回 false，音频接口对它返回 404，由前端跳过。
func segmentText(a Article, index int) (string, bool) {
	if index == 0 {
		return speechText(a.Title.En), true
	}
	if index >= 1 && index <= len(a.Segments) {
		seg := a.Segments[index-1]
		if seg.Kind == kindCode || seg.Kind == kindTable {
			return "", false
		}
		return speechText(seg.En), true
	}
	return "", false
}

// readableCount 为可朗读的段落总数：英语标题加非代码、非表格的正文段。
func readableCount(a Article) int {
	total := 1
	for _, seg := range a.Segments {
		if seg.Kind != kindCode && seg.Kind != kindTable {
			total++
		}
	}
	return total
}

// isRateLimited 判断 edge-tts 失败输出是否属于限流类（非官方接口高频会 403/429）。
func isRateLimited(output string) bool {
	lower := strings.ToLower(output)
	for _, marker := range []string{"403", "429", "too many requests", "rate"} {
		if strings.Contains(lower, marker) {
			return true
		}
	}
	return false
}

// ttsError 记录一次生成失败的分类，限流类失败会采用更长退避。
type ttsError struct {
	rateLimited bool
	err         error
}

func (e *ttsError) Error() string { return e.err.Error() }
func (e *ttsError) Unwrap() error { return e.err }

// ensure 确保缓存文件存在；未命中时串行调用 CLI 生成，失败按指数退避重试。
func (t *tts) ensure(ctx context.Context, text, voice, dest string) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	// 拿到锁后再确认一次，避免并发请求重复生成。
	if cached(dest) {
		return nil
	}
	if t.bin == "" {
		return errTTSCLIMissing
	}
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	// 文本通过临时文件传给 CLI（-f），不把长文本放进命令行参数。
	source, err := os.CreateTemp("", "edge-tts-*.txt")
	if err != nil {
		return err
	}
	sourceName := source.Name()
	defer os.Remove(sourceName)
	if _, err = source.WriteString(text); err != nil {
		source.Close()
		return err
	}
	if err = source.Close(); err != nil {
		return err
	}
	// 输出先写同目录临时文件，成功后原子重命名，失败不留下半成品。
	temp, err := os.CreateTemp(filepath.Dir(dest), ".edge-tts-*.mp3")
	if err != nil {
		return err
	}
	tempName := temp.Name()
	temp.Close()
	os.Remove(tempName)
	defer os.Remove(tempName)
	var lastErr error
	for attempt := 0; attempt < ttsAttempts; attempt++ {
		if attempt > 0 {
			if err = t.sleep(ctx, t.retryDelay(attempt, lastErr)); err != nil {
				return err
			}
		}
		if err = t.waitGap(ctx); err != nil {
			return err
		}
		attemptCtx, cancel := context.WithTimeout(ctx, t.timeout)
		output, runErr := t.invoke(attemptCtx, sourceName, voice, tempName)
		cancel()
		if runErr == nil && cached(tempName) {
			return os.Rename(tempName, dest)
		}
		if runErr == nil {
			runErr = errors.New("edge-tts 未生成音频输出")
		}
		lastErr = &ttsError{rateLimited: isRateLimited(output), err: runErr}
	}
	return lastErr
}

// retryDelay 计算第 attempt 次重试前的等待时间，限流类失败退避更久。
func (t *tts) retryDelay(attempt int, lastErr error) time.Duration {
	delay := t.backoff << (attempt - 1)
	var te *ttsError
	if errors.As(lastErr, &te) && te.rateLimited {
		delay *= 2
	}
	return delay
}

// waitGap 保证相邻两次 CLI 调用之间至少间隔 minGap。
func (t *tts) waitGap(ctx context.Context) error {
	if wait := t.minGap - time.Since(t.last); wait > 0 {
		if err := t.sleep(ctx, wait); err != nil {
			return err
		}
	}
	t.last = time.Now()
	return nil
}

func (t *tts) sleep(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

// invoke 执行一次 edge-tts；参数以独立片元传递，不经 shell，用户文本不参与命令拼接。
func (t *tts) invoke(ctx context.Context, source, voice, media string) (string, error) {
	cmd := t.exec(ctx, t.bin, "-f", source, "-v", voice, "--write-media", media, "--no-progress")
	var stderr bytes.Buffer
	cmd.Stdout = io.Discard
	cmd.Stderr = &stderr
	err := cmd.Run()
	return stderr.String(), err
}

// warm 在后台把默认音色的整篇音频生成到缓存，让阅读页打开即可播放。
// 失败或限流时提前结束，剩余段落仍由播放时的按需生成补齐，不影响文章保存。
func (t *tts) warm(ctx context.Context, a Article) {
	if t.bin == "" {
		log.Print("跳过音频预热：未找到 edge-tts")
		return
	}
	total := 1 + len(a.Segments)
	for index := 0; index < total; index++ {
		if ctx.Err() != nil {
			log.Print("音频预热中断：任务已取消")
			return
		}
		text, ok := segmentText(a, index)
		if !ok {
			continue // 代码段与表格段没有音频，跳过
		}
		dest := t.cachePath(a.ID, defaultVoice, index, text)
		if err := t.ensure(ctx, text, defaultVoice, dest); err != nil {
			var te *ttsError
			if errors.As(err, &te) && te.rateLimited {
				log.Print("音频预热受限流影响，剩余段落改为播放时生成")
			} else {
				log.Print("音频预热失败，剩余段落改为播放时生成")
			}
			return
		}
	}
	log.Printf("音频预热完成：文章%d 共%d段", a.ID, readableCount(a))
}

// readyCount 统计指定音色已缓存的段落数量，用于前端判断音频是否就绪。
func (t *tts) readyCount(a Article, voice string) int {
	total := 1 + len(a.Segments)
	ready := 0
	for index := 0; index < total; index++ {
		text, ok := segmentText(a, index)
		if !ok {
			continue // 代码段与表格段没有音频，不计入就绪数
		}
		if cached(t.cachePath(a.ID, voice, index, text)) {
			ready++
		}
	}
	return ready
}
