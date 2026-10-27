package main

import (
	"strings"
	"testing"
)

const planningSample = `About the Go programming language
关于 Go 编程语言

Go is an open source programming language designed for building simple, fast, and reliable software.
Go 是一门开源编程语言，旨在构建简洁、高效且可靠的软件。

Take a look here which great companies use Go to power their services.
点击此处查看有哪些大型企业使用 Go 来支撑自身业务服务。

Go Web Examples provides easy to understand code snippets on how to do web development in the Go programming language.
Go Web Examples 提供通俗易懂的代码片段，演示如何使用 Go 语言进行 Web 开发。

It is inspired by Go By Example, which has a great introduction into the fundamentals of this language.
该项目灵感来源于 Go By Example，后者对这门语言的基础知识做了非常棒的入门讲解。

If you are learning web programming in Go or just starting out you can find some good examples and tutorials here.
如果你正在学习 Go Web 编程，或是刚刚入门，你可以在这里找到优质示例与教程。

Our goal is it to provide clean examples with great detail, so you can become the next Go web developer!
我们的目标是提供简洁且细节丰富的示例，助你成为一名 Go Web 开发者！

Go Web Examples covers the basics of web programming.
Go Web Examples 涵盖 Web 编程的基础知识。

From routers and templates to middleware and websockets.
内容涵盖路由、模板、中间件以及 WebSocket。

Here you can find clean code snippets up to detailed tutorials.
在这里，你既能找到简洁的代码片段，也能阅读详尽的教程。

To get things started, check out the first example on how to create a classical "Hello World" web application or go straight to Routing (using the gorilla/mux router).
开始学习前，可以先看第一个示例：如何搭建经典的“Hello World”Web 应用，也可以直接学习路由部分（使用 gorilla/mux 路由库）。`

func TestPlanningSample(t *testing.T) {
	for _, newline := range []string{"\n", "\r\n", "\r"} {
		t.Run(strings.ReplaceAll(newline, "\r", "CR"), func(t *testing.T) {
			r := parseText("\n\n" + strings.ReplaceAll(planningSample, "\n", newline) + "\n\n")
			if r.Title.En != "About the Go programming language" || r.Title.Zh != "关于 Go 编程语言" || len(r.Segments) != 10 || len(r.Issues) != 0 {
				t.Fatalf("样本解析错误: %+v", r)
			}
			blocks := strings.Split(planningSample, "\n\n")
			for i, s := range r.Segments {
				pair := strings.Split(blocks[i+1], "\n")
				if s.En != pair[0] || s.Zh != pair[1] || s.Position != i+1 {
					t.Fatalf("第%d组未完整保留: %+v", i+1, s)
				}
			}
		})
	}
}
func TestParserIssuesPreserveContent(t *testing.T) {
	cases := []struct {
		name, text       string
		segments, issues int
		title            bool
	}{
		{"反序首块", "中文标题\nEnglish title\n\nBody\n中文正文", 1, 2, false},
		{"缺失标题译文", "Title\n\nBody\n中文正文", 1, 1, false},
		{"未用空行分组", "Title\n中文标题\nBody\n中文正文", 0, 4, false},
		{"多行英语", "Title\n中文标题\n\nFirst line\nSecond line\n中文正文", 0, 3, true},
		{"无中文译文", "Title\n中文标题\n\nBody\nTranslation", 0, 2, true},
		{"英语行混中文", "Title\n中文标题\n\n英语 English\n中文正文", 0, 2, true},
		{"多余空行", "Title\n中文标题\n\n \n\nBody\n包含 Go 和 WebSocket 的中文", 1, 0, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := parseText(c.text)
			if len(r.Segments) != c.segments || len(r.Issues) != c.issues || (r.Title.En != "") != c.title {
				t.Fatalf("结果错误: %+v", r)
			}
			for _, issue := range r.Issues {
				lines := strings.Split(c.text, "\n")
				if issue.Line < 1 || issue.Line > len(lines) || issue.Text != strings.TrimSpace(lines[issue.Line-1]) || issue.Reason == "" {
					t.Fatalf("未保留原文和行号: %+v", issue)
				}
			}
		})
	}
	if r := parseText(" \n\t"); len(r.Issues) != 1 || r.Title.En != "" {
		t.Fatalf("空输入: %+v", r)
	}
}
func TestParserCodeSegments(t *testing.T) {
	fenced := "Title\n标题\n\n```go\nfunc main() {\n\tx := 1\n\n\tprintln(x)\n}\n```\n\nAfter the snippet\n代码之后"
	cases := []struct {
		name     string
		text     string
		kind     string // 期望的第一个正文段类型
		body     string // 期望的第一个正文段内容
		segments int
		titleEn  string
	}{
		{name: "围栏保留缩进与空行", text: fenced, kind: "code", body: "func main() {\n\tx := 1\n\n\tprintln(x)\n}", segments: 2, titleEn: "Title"},
		{name: "裸函数签名", text: "Title\n标题\n\nfunc (w http.ResponseWriter, r *http.Request)", kind: "code", body: "func (w http.ResponseWriter, r *http.Request)", segments: 1, titleEn: "Title"},
		{name: "裸大括号代码块", text: "Title\n标题\n\nfunc main() {\n\tx := 1\n}", kind: "code", body: "func main() {\n\tx := 1\n}", segments: 1, titleEn: "Title"},
		{name: "纯符号行", text: "Title\n标题\n\n...", kind: "code", body: "...", segments: 1, titleEn: "Title"},
		{name: "普通英文含括号仍是文本", text: "Title\n标题\n\nHandlers are registered (usually in main).\n处理函数通常注册在 main 函数中。", kind: "text", body: "Handlers are registered (usually in main).", segments: 1, titleEn: "Title"},
		{name: "文档以代码开头", text: "```\nfunc main() {}\n```\n\nTitle\n标题", kind: "code", body: "func main() {}", segments: 1, titleEn: "Title"},
		{name: "围栏内中文不配对", text: "Title\n标题\n\n```\n// 说明\nfunc main() {}\n```", kind: "code", body: "// 说明\nfunc main() {}", segments: 1, titleEn: "Title"},
		{name: "单独术语行", text: "Title\n标题\n\nhttp.ResponseWriter", kind: "code", body: "http.ResponseWriter", segments: 1, titleEn: "Title"},
		{name: "指针类型行", text: "Title\n标题\n\n*http.Request", kind: "code", body: "*http.Request", segments: 1, titleEn: "Title"},
		{name: "参数片段行", text: "Title\n标题\n\nw http.ResponseWriter", kind: "code", body: "w http.ResponseWriter", segments: 1, titleEn: "Title"},
		{name: "包路径行", text: "Title\n标题\n\ngorilla/mux", kind: "code", body: "gorilla/mux", segments: 1, titleEn: "Title"},
		{name: "术语加译文仍是文本", text: "Title\n标题\n\nhttp.ResponseWriter\n响应写入器", kind: "text", body: "http.ResponseWriter", segments: 1, titleEn: "Title"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := parseText(c.text)
			if len(r.Issues) != 0 {
				t.Fatalf("不应产生待处理内容: %+v", r.Issues)
			}
			if r.Title.En != c.titleEn {
				t.Fatalf("标题错误: %+v", r.Title)
			}
			if len(r.Segments) != c.segments {
				t.Fatalf("正文段数错误: %d %+v", len(r.Segments), r.Segments)
			}
			first := r.Segments[0]
			if first.Kind != c.kind || first.En != c.body || first.Position != 1 {
				t.Fatalf("首个正文段错误: %+v", first)
			}
		})
	}
	// 未闭合的围栏仍把已累积内容保留成代码段。
	if r := parseText("Title\n标题\n\n```\nfunc main() {}"); len(r.Segments) != 1 || r.Segments[0].Kind != "code" {
		t.Fatalf("未闭合围栏未保留: %+v", r)
	}
	// 单标识符与普通英文句不应被当成代码。
	for _, text := range []string{"Title\n标题\n\nResponseWriter", "Title\n标题\n\nHello world with the handler"} {
		r := parseText(text)
		if len(r.Segments) != 0 || len(r.Issues) != 1 {
			t.Fatalf("不应判为代码: %+v", r)
		}
	}
}
func TestParserMarkdownSample(t *testing.T) {
	sample := `## Introduction
## 简介

Go is a battery included programming language and has a webserver already built in.
Go 是一门开箱即用的编程语言，内置了 Web 服务器。

The ` + "`net/http`" + ` package from the standard library contains all functionalities about the HTTP protocol.
标准库中的 ` + "`net/http`" + ` 包包含 HTTP 协议相关的全部功能。

A handler in Go is a function with this signature:
在 Go 中，处理函数就是具备如下签名的函数：

` + "```" + `
func (w http.ResponseWriter, r *http.Request)
` + "```" + `

The function receives two parameters:
该函数接收两个参数：

1. An ` + "`http.ResponseWriter`" + ` which is where you write your text/html response to.
1. ` + "`http.ResponseWriter`" + `：你向其中写入文本或 HTML 响应内容。

2. An ` + "`http.Request`" + ` which contains all information about this HTTP request including things like the URL or header fields.
2. ` + "`http.Request`" + `：包含本次 HTTP 请求的全部信息，例如 URL、请求头字段等。

You can navigate your browser to ` + "`[http://localhost/](http://localhost/)`" + ` and see your server handing your request.
你可以在浏览器访问 ` + "`[http://localhost/](http://localhost/)`" + `，就能看到服务器处理你的请求。

` + "```" + `
http.ListenAndServe(":80", nil)
` + "```"
	r := parseText(sample)
	if r.Title.En != "Introduction" || r.Title.Zh != "简介" {
		t.Fatalf("标题未去掉 Markdown 标记: %+v", r.Title)
	}
	if len(r.Issues) != 0 {
		t.Fatalf("不应产生待处理内容: %+v", r.Issues)
	}
	codes := 0
	for _, s := range r.Segments {
		if s.Kind == kindCode {
			codes++
			continue
		}
		if strings.ContainsAny(s.En+s.Zh, "`#") || strings.HasPrefix(s.En, "1. ") {
			t.Fatalf("文本段仍含 Markdown 标记: %+v", s)
		}
	}
	if codes != 2 || len(r.Segments) != 9 {
		t.Fatalf("段数错误: code=%d total=%d %+v", codes, len(r.Segments), r.Segments)
	}
	if got := r.Segments[1].En; got != "The net/http package from the standard library contains all functionalities about the HTTP protocol." {
		t.Fatalf("行内代码反引号未剥离: %q", got)
	}
	if got := r.Segments[5].Zh; got != "http.ResponseWriter：你向其中写入文本或 HTML 响应内容。" {
		t.Fatalf("列表序号未剥离: %q", got)
	}
	if got := r.Segments[7].Zh; got != "你可以在浏览器访问 http://localhost/，就能看到服务器处理你的请求。" {
		t.Fatalf("链接语法未收敛为文字: %q", got)
	}
}
func TestArticleValidation(t *testing.T) {
	valid := func() ArticleInput {
		return ArticleInput{UnitName: "Unit 1", Title: Title{"Title", "标题"}, Segments: []SegmentInput{{En: "Body", Zh: "正文"}}}
	}
	tests := []struct {
		name   string
		mutate func(*ArticleInput)
	}{{"空单元", func(a *ArticleInput) { a.UnitName = " " }}, {"缺失标题", func(a *ArticleInput) { a.Title.Zh = "" }}, {"无正文", func(a *ArticleInput) { a.Segments = nil }}, {"空译文", func(a *ArticleInput) { a.Segments[0].Zh = "\t" }}, {"超长", func(a *ArticleInput) { a.Title.En = strings.Repeat("a", 501) }}, {"负标识", func(a *ArticleInput) { id := int64(-1); a.Segments[0].ID = &id }}, {"类型无效", func(a *ArticleInput) { a.Segments[0].Kind = "codeblock" }}, {"重复标识", func(a *ArticleInput) {
		id := int64(1)
		a.Segments[0].ID = &id
		a.Segments = append(a.Segments, a.Segments[0])
	}}}
	for _, c := range tests {
		t.Run(c.name, func(t *testing.T) {
			a := valid()
			c.mutate(&a)
			if a.validate() == nil {
				t.Fatal("异常输入被接受")
			}
		})
	}
	a := valid()
	a.UnitName = " Unit 1 "
	if err := a.validate(); err != nil || a.UnitName != "Unit 1" {
		t.Fatalf("有效输入: %v", err)
	}
	// 代码段允许没有中文译文，缺省类型归一到文本段。
	code := valid()
	code.Segments[0] = SegmentInput{Kind: "code", En: "func main() {}"}
	if err := code.validate(); err != nil || code.Segments[0].Kind != "code" || code.Segments[0].Zh != "" {
		t.Fatalf("代码段输入: %v %+v", err, code.Segments[0])
	}
	plain := valid()
	if err := plain.validate(); err != nil || plain.Segments[0].Kind != "text" {
		t.Fatalf("缺省类型: %v %+v", err, plain.Segments[0])
	}
}
