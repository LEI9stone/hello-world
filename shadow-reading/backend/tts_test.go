package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// newTestTTS 构造一个关闭人为等待的 tts，便于测试快速运行。
func newTestTTS(t *testing.T, dir string) *tts {
	t.Helper()
	s := newTTS(dir)
	s.minGap = 0
	s.backoff = 0
	return s
}

// writeScript 写出一个可执行的假 edge-tts 脚本，避免测试真的联网调用。
func writeScript(t *testing.T, body string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "fake-edge-tts")
	if err := os.WriteFile(path, []byte("#!/bin/sh\n"+body), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

// mediaArgs 是脚本共用的参数解析片段，用于取出 --write-media 的输出路径。
const mediaArgs = `media=""
while [ $# -gt 0 ]; do case "$1" in --write-media) media=$2; shift;; esac; shift; done
`

func successScript(t *testing.T, counter string) string {
	return writeScript(t, mediaArgs+fmt.Sprintf(`if [ -n '%s' ]; then printf 'x\n' >> '%s'; fi
printf 'MP3' > "$media"
exit 0
`, counter, counter))
}

// failingScript 前 failUntil 次调用失败并输出 message，之后成功生成文件。
func failingScript(t *testing.T, counter, message string, failUntil int) string {
	return writeScript(t, mediaArgs+fmt.Sprintf(`n=0
if [ -f '%s' ]; then n=$(wc -l < '%s'); n=$(echo $n | tr -d ' '); fi
n=$((n+1))
printf 'x\n' >> '%s'
if [ $n -le %d ]; then echo '%s' >&2; exit 1; fi
printf 'MP3' > "$media"
exit 0
`, counter, counter, counter, failUntil, message))
}

// partialScript 先写入部分内容再失败，用于验证不会留下半成品。
func partialScript(t *testing.T) string {
	return writeScript(t, mediaArgs+`printf 'PARTIAL' > "$media"
echo 'boom' >&2
exit 1
`)
}

func countLines(t *testing.T, path string) int {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	return strings.Count(string(data), "\n")
}

func TestVoicesEndpoint(t *testing.T) {
	w := httptest.NewRecorder()
	handler(&store{}, newTestTTS(t, t.TempDir())).ServeHTTP(w, httptest.NewRequest("GET", "/api/voices", nil))
	if w.Code != 200 {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	var voices []Voice
	if err := json.Unmarshal(w.Body.Bytes(), &voices); err != nil {
		t.Fatal(err)
	}
	got := map[string]Voice{}
	for _, v := range voices {
		if v.Label == "" || v.Locale == "" || v.Gender == "" {
			t.Fatalf("音色字段不完整: %+v", v)
		}
		got[v.ID] = v
	}
	for _, id := range []string{"en-US-AriaNeural", "en-US-GuyNeural", "en-GB-SoniaNeural", "en-US-JennyNeural", "en-GB-RyanNeural"} {
		if _, ok := got[id]; !ok {
			t.Fatalf("缺少音色 %s", id)
		}
	}
	if got[defaultVoice].Gender != "Female" {
		t.Fatalf("默认音色描述异常: %+v", got[defaultVoice])
	}
}

func TestSegmentTextBounds(t *testing.T) {
	a := Article{Title: Title{En: "Hello World"}, Segments: []Segment{{En: "first"}, {En: "second"}}}
	if text, ok := segmentText(a, 0); !ok || text != "Hello World" {
		t.Fatalf("段落0应为标题: %q %v", text, ok)
	}
	if text, ok := segmentText(a, 2); !ok || text != "second" {
		t.Fatalf("段落2应为第二组正文: %q %v", text, ok)
	}
	for _, index := range []int{3, 4, -1} {
		if _, ok := segmentText(a, index); ok {
			t.Fatalf("越界索引 %d 不应命中", index)
		}
	}
}

func TestSpeechText(t *testing.T) {
	cases := []struct{ in, want string }{
		{"# Installation", "Installation"},
		{"Use **strong** text.", "Use strong text."},
		{"Run `cargo build`.", "Run cargo build."},
		{"See [the guide](https://example.com).", "See the guide."},
		{"- First item\n1. Second item", "First item Second item"},
		{"> A quoted line", "A quoted line"},
		{"Keep snake_case intact.", "Keep snake_case intact."},
	}
	for _, c := range cases {
		if got := speechText(c.in); got != c.want {
			t.Fatalf("%q: got=%q want=%q", c.in, got, c.want)
		}
	}
	// 代码段与表格段仍然跳过朗读。
	a := Article{Segments: []Segment{{Kind: kindCode, En: "func main() {}"}, {Kind: kindTable, En: "| a | b |"}}}
	for _, index := range []int{1, 2} {
		if _, ok := segmentText(a, index); ok {
			t.Fatalf("不应朗读第 %d 段", index)
		}
	}
}

func TestRateLimitClassification(t *testing.T) {
	for _, c := range []struct {
		output string
		want   bool
	}{{"429 Too Many Requests", true}, {"server returned 403 Forbidden", true}, {"connection reset by peer", false}, {"", false}} {
		if got := isRateLimited(c.output); got != c.want {
			t.Fatalf("%q: got=%v want=%v", c.output, got, c.want)
		}
	}
}

func TestCacheHitSkipsCLI(t *testing.T) {
	dir := t.TempDir()
	s := newTestTTS(t, dir)
	counter := filepath.Join(t.TempDir(), "count")
	s.bin = successScript(t, counter)
	text := "Go is an open source programming language."
	dest := s.cachePath(1, defaultVoice, 1, text)
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(dest, []byte("MP3"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := s.ensure(context.Background(), text, defaultVoice, dest); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(counter); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("命中缓存不应调用 CLI: %v", err)
	}
}

func TestTextChangeProducesNewFile(t *testing.T) {
	s := newTestTTS(t, t.TempDir())
	counter := filepath.Join(t.TempDir(), "count")
	s.bin = successScript(t, counter)
	first := s.cachePath(1, defaultVoice, 1, "The original sentence.")
	second := s.cachePath(1, defaultVoice, 1, "An edited sentence.")
	if first == second {
		t.Fatal("文本变化必须产生不同文件名")
	}
	if err := s.ensure(context.Background(), "The original sentence.", defaultVoice, first); err != nil {
		t.Fatal(err)
	}
	if err := s.ensure(context.Background(), "An edited sentence.", defaultVoice, second); err != nil {
		t.Fatal(err)
	}
	if !cached(first) || !cached(second) {
		t.Fatal("两次生成都应落盘")
	}
	if lines := countLines(t, counter); lines != 2 {
		t.Fatalf("应各生成一次，实际调用 %d 次", lines)
	}
}

func TestRetryThenSucceed(t *testing.T) {
	s := newTestTTS(t, t.TempDir())
	counter := filepath.Join(t.TempDir(), "count")
	s.bin = failingScript(t, counter, "temporary failure", 2)
	dest := s.cachePath(1, defaultVoice, 0, "Retry title")
	if err := s.ensure(context.Background(), "Retry title", defaultVoice, dest); err != nil {
		t.Fatalf("重试后应成功: %v", err)
	}
	if !cached(dest) {
		t.Fatal("最终应生成音频")
	}
	if lines := countLines(t, counter); lines != 3 {
		t.Fatalf("最多尝试3次，实际 %d 次", lines)
	}
}

func TestRateLimitedFailure(t *testing.T) {
	s := newTestTTS(t, t.TempDir())
	counter := filepath.Join(t.TempDir(), "count")
	s.bin = failingScript(t, counter, "429 Too Many Requests", 999)
	dest := s.cachePath(1, defaultVoice, 0, "Limited")
	err := s.ensure(context.Background(), "Limited", defaultVoice, dest)
	var te *ttsError
	if !errors.As(err, &te) || !te.rateLimited {
		t.Fatalf("应识别为限流类失败: %v", err)
	}
	if lines := countLines(t, counter); lines != 3 {
		t.Fatalf("应尝试3次，实际 %d 次", lines)
	}
}

func TestOtherFailureClassification(t *testing.T) {
	s := newTestTTS(t, t.TempDir())
	counter := filepath.Join(t.TempDir(), "count")
	s.bin = failingScript(t, counter, "connection reset", 999)
	dest := s.cachePath(1, defaultVoice, 0, "Broken")
	err := s.ensure(context.Background(), "Broken", defaultVoice, dest)
	var te *ttsError
	if !errors.As(err, &te) || te.rateLimited {
		t.Fatalf("不应识别为限流类失败: %v", err)
	}
}

func TestFailureLeavesNoPartialFile(t *testing.T) {
	dir := t.TempDir()
	s := newTestTTS(t, dir)
	s.bin = partialScript(t)
	album := filepath.Join(dir, "1", defaultVoice)
	dest := filepath.Join(album, "1-abc.mp3")
	if err := s.ensure(context.Background(), "text", defaultVoice, dest); err == nil {
		t.Fatal("失败时应返回错误")
	}
	if _, err := os.Stat(dest); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("不应留下成品文件: %v", err)
	}
	entries, err := os.ReadDir(album)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Fatalf("不应留下临时文件: %v", entries)
	}
}

func TestMissingCLI(t *testing.T) {
	s := newTestTTS(t, t.TempDir())
	s.bin = ""
	dest := s.cachePath(1, defaultVoice, 0, "No CLI")
	if err := s.ensure(context.Background(), "No CLI", defaultVoice, dest); !errors.Is(err, errTTSCLIMissing) {
		t.Fatalf("应返回未找到 CLI: %v", err)
	}
}

func TestResolveBinFromEnv(t *testing.T) {
	path := writeScript(t, "exit 0")
	t.Setenv("EDGE_TTS_BIN", path)
	if got := resolveBin(); got != path {
		t.Fatalf("应优先使用 EDGE_TTS_BIN: %q", got)
	}
}
