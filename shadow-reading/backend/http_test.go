package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestInvalidRequests(t *testing.T) {
	h := handler(&store{}, newTestTTS(t, t.TempDir()))
	cases := []struct {
		method, path, body string
		status             int
	}{
		{"POST", "/api/parse", `{"text":" "}`, 400},
		{"POST", "/api/parse", `{"text":12}`, 400},
		{"POST", "/api/parse", `{"text":"Hello\n你好","extra":1}`, 400},
		{"POST", "/api/parse", `{"text":"Hello\n你好"} {}`, 400},
		{"POST", "/api/parse", `{`, 400},
		{"POST", "/api/parse", `null`, 400},
		{"POST", "/api/parse", `{"text":"` + strings.Repeat("x", maxBody) + `"}`, 413},
		{"GET", "/api/books/not-a-number", "", 400},
		{"GET", "/api/articles/0", "", 400},
		{"GET", "/api/articles/9223372036854775808", "", 400},
		{"GET", "/api/articles/1/audio/x", "", 400},
		{"GET", "/api/articles/1/audio/-1", "", 400},
		{"GET", "/api/articles/1/audio/0?voice=evil", "", 400},
		{"GET", "/api/articles/-1/audio/0", "", 400},
		{"POST", "/api/books", `{"name":" "}`, 400},
		{"POST", "/api/books/1/articles", `{"unitName":"Unit 1","title":{"en":"Title","zh":"标题"},"segments":[]}`, 400},
		{"PUT", "/api/books/1/order", `{"articleIds":null}`, 400},
		{"PUT", "/api/books/1/order", `{"articleIds":[1.5]}`, 400},
		{"GET", "/api/missing", "", 404},
		{"PATCH", "/api/books/1", "", 405},
		{"GET", "/api/parse", "", 405},
	}
	for _, c := range cases {
		t.Run(c.method+c.path+c.body[:min(len(c.body), 20)], func(t *testing.T) {
			r := httptest.NewRequest(c.method, c.path, strings.NewReader(c.body))
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != c.status {
				t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
			}
			var response map[string]string
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil || response["error"] == "" {
				t.Fatalf("错误契约: %s", w.Body.String())
			}
		})
	}
}
func TestParseHTTP(t *testing.T) {
	payload, _ := json.Marshal(map[string]string{"text": planningSample})
	w := httptest.NewRecorder()
	handler(&store{}, newTestTTS(t, t.TempDir())).ServeHTTP(w, httptest.NewRequest("POST", "/api/parse", strings.NewReader(string(payload))))
	var r ParseResult
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &r) != nil || len(r.Segments) != 10 {
		t.Fatalf("解析契约: %d %s", w.Code, w.Body.String())
	}
}
func TestUnavailableDatabase(t *testing.T) {
	db, err := sql.Open("mysql", "shadow:shadow_dev@tcp(127.0.0.1:3307)/shadow_reading")
	if err != nil {
		t.Fatal(err)
	}
	_ = db.Close()
	h := handler(&store{db: db}, newTestTTS(t, t.TempDir()))
	for _, path := range []string{"/api/health", "/api/books", "/api/books/1", "/api/articles/1", "/api/articles/1/audio/0?voice=en-US-AriaNeural"} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 503 {
			t.Fatalf("%s: %d %s", path, w.Code, w.Body.String())
		}
	}
}

func TestDatabaseErrors(t *testing.T) {
	for _, c := range []struct {
		err    error
		status int
	}{{errNotFound, 404}, {validationError{"排序错误"}, 400}, {errors.New("连接断开"), 503}, {sql.ErrNoRows, 503}} {
		w := httptest.NewRecorder()
		dbError(w, c.err)
		if w.Code != c.status {
			t.Fatalf("%v: %d", c.err, w.Code)
		}
	}
}
