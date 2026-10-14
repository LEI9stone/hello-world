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
func TestArticleValidation(t *testing.T) {
	valid := func() ArticleInput {
		return ArticleInput{UnitName: "Unit 1", Title: Title{"Title", "标题"}, Segments: []SegmentInput{{En: "Body", Zh: "正文"}}}
	}
	tests := []struct {
		name   string
		mutate func(*ArticleInput)
	}{{"空单元", func(a *ArticleInput) { a.UnitName = " " }}, {"缺失标题", func(a *ArticleInput) { a.Title.Zh = "" }}, {"无正文", func(a *ArticleInput) { a.Segments = nil }}, {"空译文", func(a *ArticleInput) { a.Segments[0].Zh = "\t" }}, {"超长", func(a *ArticleInput) { a.Title.En = strings.Repeat("a", 501) }}, {"负标识", func(a *ArticleInput) { id := int64(-1); a.Segments[0].ID = &id }}, {"重复标识", func(a *ArticleInput) {
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
}
