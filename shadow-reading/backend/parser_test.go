package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestParseJSON(t *testing.T) {
	items := []struct {
		En string `json:"en"`
		Zh string `json:"zh"`
	}{
		{"# Installing Rust", "安装 Rust"},
		{"Run `rustup` to install, see [the guide](https://rust-lang.org).", "运行 `rustup` 安装，参见[指南](https://rust-lang.org)。"},
		{"```\nfn main() {}\n```", ""},
		{"| a | b |\n|---|---|\n| 1 | 2 |", ""},
	}
	payload, err := json.Marshal(items)
	if err != nil {
		t.Fatal(err)
	}
	r, err := parseJSON(string(payload))
	if err != nil {
		t.Fatal(err)
	}
	if r.Title.En != "Installing Rust" || r.Title.Zh != "安装 Rust" {
		t.Fatalf("标题错误: %+v", r.Title)
	}
	if len(r.Segments) != 3 {
		t.Fatalf("正文段数错误: %d %+v", len(r.Segments), r.Segments)
	}
	first := r.Segments[0]
	if first.Kind != kindText || first.Position != 1 ||
		!strings.Contains(first.En, "[the guide](https://rust-lang.org)") ||
		first.Zh != "运行 `rustup` 安装，参见[指南](https://rust-lang.org)。" {
		t.Fatalf("文本段错误: %+v", first)
	}
	code := r.Segments[1]
	if code.Kind != kindCode || code.En != "fn main() {}" || code.Zh != "" || code.Position != 2 {
		t.Fatalf("代码段错误: %+v", code)
	}
	table := r.Segments[2]
	if table.Kind != kindTable || table.En != "| a | b |\n|---|---|\n| 1 | 2 |" || table.Position != 3 {
		t.Fatalf("表格段错误: %+v", table)
	}
}

func TestParseJSONErrors(t *testing.T) {
	overflow := []string{`{"en":"# Title","zh":"标题"}`}
	for i := 0; i < 501; i++ {
		overflow = append(overflow, `{"en":"Body","zh":""}`)
	}
	cases := []struct{ name, text string }{
		{"非法 JSON", "Hello\n你好"},
		{"对象不是数组", `{"en":"# T","zh":"标题"}`},
		{"空数组", `[]`},
		{"只有标题", `[{"en":"# Title","zh":"标题"}]`},
		{"空 en", `[{"en":"# T","zh":""},{"en":"  ","zh":""}]`},
		{"超过上限", "[" + strings.Join(overflow, ",") + "]"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if _, err := parseJSON(c.text); err == nil {
				t.Fatal("异常输入被接受")
			}
		})
	}
}

func TestArticleValidation(t *testing.T) {
	valid := func() ArticleInput {
		return ArticleInput{UnitName: "Unit 1", Title: Title{"Title", "标题"}, Segments: []SegmentInput{{En: "Body", Zh: "正文"}}}
	}
	tests := []struct {
		name   string
		mutate func(*ArticleInput)
	}{{"空单元", func(a *ArticleInput) { a.UnitName = " " }}, {"缺失标题", func(a *ArticleInput) { a.Title.En = "" }}, {"无正文", func(a *ArticleInput) { a.Segments = nil }}, {"超长", func(a *ArticleInput) { a.Title.En = strings.Repeat("a", 501) }}, {"负标识", func(a *ArticleInput) { id := int64(-1); a.Segments[0].ID = &id }}, {"类型无效", func(a *ArticleInput) { a.Segments[0].Kind = "codeblock" }}, {"重复标识", func(a *ArticleInput) {
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
	// 中文译文允许为空，代码段、表格段与无需翻译的术语都能保存。
	empty := valid()
	empty.Segments[0].Zh = " "
	if err := empty.validate(); err != nil || empty.Segments[0].Zh != "" {
		t.Fatalf("空译文输入: %v %+v", err, empty.Segments[0])
	}
	code := valid()
	code.Segments[0] = SegmentInput{Kind: "code", En: "func main() {}"}
	if err := code.validate(); err != nil || code.Segments[0].Kind != "code" || code.Segments[0].Zh != "" {
		t.Fatalf("代码段输入: %v %+v", err, code.Segments[0])
	}
	plain := valid()
	if err := plain.validate(); err != nil || plain.Segments[0].Kind != "text" {
		t.Fatalf("缺省类型: %v %+v", err, plain.Segments[0])
	}
	// 表格段与代码段一样，允许没有中文译文。
	table := valid()
	table.Segments[0] = SegmentInput{Kind: "table", En: "| a | b |\n|---|---|"}
	if err := table.validate(); err != nil || table.Segments[0].Kind != "table" || table.Segments[0].Zh != "" {
		t.Fatalf("表格段输入: %v %+v", err, table.Segments[0])
	}
	// 标题可能是无需翻译的专业术语，中文标题允许留空。
	term := valid()
	term.Title = Title{"Websockets", ""}
	if err := term.validate(); err != nil || term.Title.Zh != "" {
		t.Fatalf("无中文标题: %v %+v", err, term.Title)
	}
}
