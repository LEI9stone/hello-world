package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const maxBody = 2 << 20

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if value != nil {
		_ = json.NewEncoder(w).Encode(value)
	}
}
func fail(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
func decode(w http.ResponseWriter, r *http.Request, out any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBody)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	err := dec.Decode(out)
	if err == nil {
		var extra any
		err = dec.Decode(&extra)
		if errors.Is(err, io.EOF) {
			return true
		}
		if err == nil {
			err = errors.New("多个JSON值")
		}
	}
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		fail(w, 413, "请求内容超过2 MiB限制")
	} else {
		fail(w, 400, "请求必须为有效JSON，字段和类型须符合接口要求")
	}
	return false
}
func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		fail(w, 400, "标识必须是正整数")
		return 0, false
	}
	return id, true
}
func dbError(w http.ResponseWriter, err error) {
	var v validationError
	if errors.Is(err, errNotFound) {
		fail(w, 404, "内容不存在")
	} else if errors.As(err, &v) {
		fail(w, 400, v.Error())
	} else {
		log.Print("数据库操作失败")
		fail(w, 503, "数据库暂时不可用，请稍后重试")
	}
}
func handler(s *store, t *tts) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		if err := s.db.PingContext(r.Context()); err != nil {
			dbError(w, err)
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/voices", voicesHandler)
	mux.HandleFunc("POST /api/parse", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Text string `json:"text"`
		}
		if !decode(w, r, &in) {
			return
		}
		if strings.TrimSpace(in.Text) == "" {
			fail(w, 400, "原文不能为空")
			return
		}
		result, err := parseJSON(in.Text)
		if err != nil {
			fail(w, 400, err.Error())
			return
		}
		writeJSON(w, 200, result)
	})
	mux.HandleFunc("GET /api/books", func(w http.ResponseWriter, r *http.Request) {
		books, err := s.books(r.Context())
		if err != nil {
			dbError(w, err)
			return
		}
		writeJSON(w, 200, books)
	})
	saveBook := func(w http.ResponseWriter, r *http.Request) {
		var id int64
		if r.Method == http.MethodPut {
			var ok bool
			id, ok = pathID(w, r)
			if !ok {
				return
			}
		}
		var in struct {
			Name string `json:"name"`
		}
		if !decode(w, r, &in) {
			return
		}
		if err := field(&in.Name, "书籍名称", 200); err != nil {
			fail(w, 400, err.Error())
			return
		}
		b, err := s.saveBook(r.Context(), id, in.Name)
		if err != nil {
			dbError(w, err)
			return
		}
		status := 200
		if r.Method == http.MethodPost {
			status = 201
		}
		writeJSON(w, status, b)
	}
	mux.HandleFunc("POST /api/books", saveBook)
	mux.HandleFunc("PUT /api/books/{id}", saveBook)
	mux.HandleFunc("GET /api/books/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		b, articles, err := s.detail(r.Context(), id)
		if err != nil {
			dbError(w, err)
			return
		}
		writeJSON(w, 200, struct {
			Book     Book      `json:"book"`
			Articles []Article `json:"articles"`
		}{b, articles})
	})
	mux.HandleFunc("DELETE /api/books/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		if err := s.deleteBook(r.Context(), id); err != nil {
			dbError(w, err)
			return
		}
		w.WriteHeader(204)
	})
	mux.HandleFunc("GET /api/articles/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		a, err := s.article(r.Context(), id)
		if err != nil {
			dbError(w, err)
			return
		}
		writeJSON(w, 200, a)
	})
	mux.HandleFunc("GET /api/articles/{id}/audio/{index}", audioHandler(s, t))
	mux.HandleFunc("GET /api/articles/{id}/audio-status", audioStatusHandler(s, t))
	saveArticle := func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var in ArticleInput
		if !decode(w, r, &in) {
			return
		}
		if err := in.validate(); err != nil {
			fail(w, 400, err.Error())
			return
		}
		var bid, aid int64
		status := 200
		if r.Method == http.MethodPost {
			bid = id
			status = 201
		} else {
			aid = id
		}
		a, err := s.saveArticle(r.Context(), bid, aid, nil, in)
		if err != nil {
			dbError(w, err)
			return
		}
		// 保存后立即返回，默认音色的整篇音频在后台预热；生成失败不影响文章数据。
		warmCtx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 10*time.Minute)
		go func() {
			defer cancel()
			t.warm(warmCtx, a)
		}()
		writeJSON(w, status, a)
	}
	mux.HandleFunc("POST /api/books/{id}/articles", saveArticle)
	mux.HandleFunc("PUT /api/articles/{id}", saveArticle)
	mux.HandleFunc("POST /api/articles/{id}/children", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var in ArticleInput
		if !decode(w, r, &in) {
			return
		}
		if err := in.validate(); err != nil {
			fail(w, 400, err.Error())
			return
		}
		a, err := s.saveArticle(r.Context(), 0, 0, &id, in)
		if err != nil {
			dbError(w, err)
			return
		}
		warmCtx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 10*time.Minute)
		go func() {
			defer cancel()
			t.warm(warmCtx, a)
		}()
		writeJSON(w, 201, a)
	})
	mux.HandleFunc("DELETE /api/articles/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		if err := s.deleteArticle(r.Context(), id); err != nil {
			dbError(w, err)
			return
		}
		w.WriteHeader(204)
	})
	mux.HandleFunc("PUT /api/books/{id}/order", func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var in struct {
			IDs []int64 `json:"articleIds"`
		}
		if !decode(w, r, &in) {
			return
		}
		if in.IDs == nil || len(in.IDs) > 10000 {
			fail(w, 400, "articleIds必须是最多10000项的数组")
			return
		}
		if err := s.order(r.Context(), id, in.IDs); err != nil {
			dbError(w, err)
			return
		}
		w.WriteHeader(204)
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		r = r.WithContext(ctx)
		// 未匹配的路由和不支持的请求方法使用统一的 JSON 错误格式。
		_, pattern := mux.Handler(r)
		if pattern == "" {
			status := 404
			message := "接口不存在"
			for _, method := range []string{"GET", "POST", "PUT", "DELETE"} {
				clone := r.Clone(ctx)
				clone.Method = method
				if _, p := mux.Handler(clone); p != "" {
					status = 405
					message = "请求方法不支持"
					break
				}
			}
			fail(w, status, message)
			return
		}
		mux.ServeHTTP(w, r)
	})
}
