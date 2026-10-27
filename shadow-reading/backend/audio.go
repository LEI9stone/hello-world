package main

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
)

// voicesHandler 返回服务端支持的英语音色白名单。
func voicesHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, voiceList)
}

// audioStatusHandler 返回该文章各音色已生成的段落数量，供前端选择默认音色与展示进度。
func audioStatusHandler(s *store, t *tts) http.HandlerFunc {
	type voiceState struct {
		ID    string `json:"id"`
		Label string `json:"label"`
		Ready int    `json:"ready"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		a, err := s.article(r.Context(), id)
		if err != nil {
			dbError(w, err)
			return
		}
		voices := make([]voiceState, 0, len(voiceList))
		for _, v := range voiceList {
			voices = append(voices, voiceState{v.ID, v.Label, t.readyCount(a, v.ID)})
		}
		writeJSON(w, 200, struct {
			Total  int          `json:"total"`
			Voices []voiceState `json:"voices"`
		}{Total: readableCount(a), Voices: voices})
	}
}

// audioHandler 按「段落」粒度返回预生成并缓存的 MP3。
func audioHandler(s *store, t *tts) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		index, err := strconv.Atoi(r.PathValue("index"))
		if err != nil || index < 0 {
			fail(w, 400, "段落序号必须是非负整数")
			return
		}
		voice := r.URL.Query().Get("voice")
		if voice == "" {
			voice = defaultVoice
		}
		if !validVoice(voice) {
			fail(w, 400, "不支持的英语音色")
			return
		}
		a, err := s.article(r.Context(), id)
		if err != nil {
			dbError(w, err)
			return
		}
		text, ok := segmentText(a, index)
		if !ok {
			fail(w, 404, "音频段落不存在")
			return
		}
		file := t.cachePath(id, voice, index, text)
		if !cached(file) {
			if t.bin == "" {
				fail(w, 503, "朗读服务不可用：未找到 edge-tts，请检查部署配置")
				return
			}
			// 生成与请求生命周期解耦，客户端断开也会完成缓存。
			ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), t.timeout)
			err = t.ensure(ctx, text, voice, file)
			cancel()
			if err != nil {
				var te *ttsError
				if errors.As(err, &te) && te.rateLimited {
					log.Print("音频生成受到限流")
				} else {
					log.Print("音频生成失败")
				}
				fail(w, 502, "音频生成失败，请稍后重试")
				return
			}
		}
		serveAudio(w, r, file)
	}
}

// serveAudio 以支持 Range 与条件请求的方式返回缓存 MP3。
func serveAudio(w http.ResponseWriter, r *http.Request, file string) {
	f, err := os.Open(file)
	if err != nil {
		log.Print("音频缓存读取失败")
		fail(w, 500, "音频读取失败")
		return
	}
	defer f.Close()
	fi, err := f.Stat()
	if err != nil {
		log.Print("音频缓存读取失败")
		fail(w, 500, "音频读取失败")
		return
	}
	name := filepath.Base(file)
	sum := sha1.Sum([]byte(name))
	// ETag 取自缓存文件名哈希，配合 no-cache 让浏览器复用但每次校验；文章编辑后文件名变化即换新音频。
	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("ETag", `"`+hex.EncodeToString(sum[:])+`"`)
	http.ServeContent(w, r, name, fi.ModTime(), f)
}
