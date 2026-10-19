package main

import (
	"context"
	"database/sql"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-sql-driver/mysql"
)

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func main() {
	cfg, err := mysql.ParseDSN(env("MYSQL_DSN", "shadow:shadow_dev@tcp(127.0.0.1:3307)/shadow_reading?charset=utf8mb4&parseTime=true"))
	if err != nil {
		log.Fatal("MYSQL_DSN配置无效")
	}
	cfg.Timeout = 5 * time.Second
	cfg.ReadTimeout = 10 * time.Second
	cfg.WriteTimeout = 10 * time.Second
	db, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		log.Fatal("无法初始化数据库连接")
	}
	defer db.Close()
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(3 * time.Minute)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	s := &store{db}
	synth := newTTS(env("AUDIO_DIR", "./storage/audio"))
	if synth.bin == "" {
		log.Print("警告：未找到 edge-tts 可执行文件，朗读音频接口将返回503，书籍与阅读功能不受影响；可通过 EDGE_TTS_BIN 指定路径")
	} else {
		log.Printf("朗读音频由 edge-tts 生成：%s", synth.bin)
	}
	// 启动时重试且不暴露凭据，长时间无法连接时由 Docker 重启。
	ready := false
	for attempt := 0; attempt < 30; attempt++ {
		initCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		err = s.init(initCtx)
		cancel()
		if err == nil {
			ready = true
			break
		}
		log.Print("等待数据库就绪")
		select {
		case <-ctx.Done():
			return
		case <-time.After(2 * time.Second):
		}
	}
	if !ready {
		log.Fatal("数据库初始化失败，请检查配置和数据库状态")
	}
	// WriteTimeout 需覆盖首次生成音频的最长耗时（CLI 单次超时60秒），否则长响应会被截断。
	server := &http.Server{Addr: net.JoinHostPort("", env("PORT", "8081")), Handler: handler(s, synth), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 90 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 1 << 20}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()
	log.Printf("后端监听%s", server.Addr)
	if err = server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal("HTTP服务启动失败")
	}
}
