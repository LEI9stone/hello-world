package main

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

type ParseIssue struct {
	Line   int    `json:"line"`
	Text   string `json:"text"`
	Reason string `json:"reason"`
}
type ParsedSegment struct {
	En       string `json:"en"`
	Zh       string `json:"zh"`
	Kind     string `json:"kind"`
	Position int    `json:"position"`
}
type ParseResult struct {
	Title    Title           `json:"title"`
	Segments []ParsedSegment `json:"segments"`
	Issues   []ParseIssue    `json:"issues"`
}
type sourceLine struct {
	number int
	raw    string // 原始行，代码段靠它保留缩进
	text   string // TrimSpace 后的内容
}
type sourceBlock struct {
	lines  []sourceLine
	fenced bool // 来自 ``` 围栏的块，整块按代码处理
}

func hasHan(s string) bool {
	return strings.ContainsFunc(s, func(r rune) bool { return unicode.Is(unicode.Han, r) })
}
func hasLatin(s string) bool {
	return strings.ContainsFunc(s, func(r rune) bool { return unicode.Is(unicode.Latin, r) })
}

// 代码行只认明确的特征：关键字开头、函数/方法签名、纯符号行。
var (
	codeKeyword  = regexp.MustCompile(`^(func|package|import|type|var|const|return|defer|go|if|for|switch|case|default|else|struct|interface|map|chan|range)\b`)
	codeCallLike = regexp.MustCompile(`^\w+\s*\([^)]*\)\s*\{?$`)
)

// codeSymbols 覆盖 `}`, `})`, `...`, `// ...` 这类只有标点的行。
const codeSymbols = "{}()[];,.=:*&|<>/\"'`~!+%-_"

// 术语行：整行是不翻译的代码名词、变量、类型片段。
var (
	// 片元：字母或下划线开头，允许字母、数字、. - _ /
	termToken = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_.\-/]*$`)
	// 带点的限定名，每段至少 2 个字符，避免把 e.g. / i.e. 当成术语
	termQualified = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]{1,}(?:\.[A-Za-z_][A-Za-z0-9_]{1,})+$`)
)

// 多片元行（参数片段）里出现这些英文虚词就说明是普通句子，不是术语。
var termStopWords = map[string]bool{
	"a": true, "an": true, "the": true, "and": true, "or": true, "of": true,
	"to": true, "in": true, "on": true, "for": true, "with": true, "is": true,
	"are": true, "be": true, "this": true, "that": true, "it": true, "as": true, "by": true,
}

func onlySymbols(s string) bool {
	if utf8.RuneCountInString(s) < 2 {
		return false
	}
	return !strings.ContainsFunc(s, func(r rune) bool { return !strings.ContainsRune(codeSymbols, r) })
}

// looksLikeTerm 判断整行是否只是代码术语（http.ResponseWriter、*http.Request、w http.ResponseWriter、gorilla/mux）。
// 规则保守：片元不超过 2 个、不含虚词，且必须带 . / _ 或 * & [] 之类的代码信号，避免把普通英文句判成代码。
func looksLikeTerm(text string) bool {
	if hasHan(text) {
		return false
	}
	fields := strings.Fields(text)
	if len(fields) == 0 || len(fields) > 2 {
		return false
	}
	signal := false
	for _, f := range fields {
		base := strings.TrimLeft(f, "*&")
		base = strings.TrimPrefix(base, "[]")
		// 行内代码写法 `http.ResponseWriter` 也按术语处理。
		base = strings.Trim(base, "`")
		if base != f {
			signal = true
		}
		if !termToken.MatchString(base) || termStopWords[strings.ToLower(base)] {
			return false
		}
		if termQualified.MatchString(base) || strings.ContainsAny(base, "/_") {
			signal = true
		}
	}
	return signal
}

// looksLikeCode 只认明确的代码特征：宁可判成待处理，也不把普通正文误判成代码。
// 已知取舍：紧跟中文译文的英语代码行会按「中英配对」判成文本段，需要强制保留请用 ``` 围栏。
func looksLikeCode(line sourceLine) bool {
	if strings.HasPrefix(line.raw, "\t") || strings.HasPrefix(line.raw, "  ") {
		return true
	}
	if codeKeyword.MatchString(line.text) || strings.Contains(line.text, ":=") {
		return true
	}
	if onlySymbols(line.text) || codeCallLike.MatchString(line.text) {
		return true
	}
	if strings.HasSuffix(line.text, "{") || strings.HasSuffix(line.text, "}") {
		return true
	}
	// 整行只是不会翻译的代码名词、变量或类型片段。
	return looksLikeTerm(line.text)
}

// 正文里的 Markdown 标记只做去噪，不参与代码判断：
// 行首标题井号、列表序号、行内反引号、[文字](链接) 写法。
var (
	mdHeading = regexp.MustCompile(`^#{1,6}[ \t]+`)
	mdList    = regexp.MustCompile(`^(?:\d+[.)]|[-*+])[ \t]+`)
	mdLink    = regexp.MustCompile(`\[([^\]]*)\]\([^)]*\)`)
)

func cleanMarkdown(s string) string {
	s = mdHeading.ReplaceAllString(s, "")
	s = mdList.ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, "`", "")
	return mdLink.ReplaceAllString(s, "$1")
}

func looksLikeCodeBlock(lines []sourceLine) bool {
	for _, line := range lines {
		if !looksLikeCode(line) {
			return false
		}
	}
	return true
}

// isHeadingLine 判断是否 Markdown 标题行（# 到 ###### 加空格）。
func isHeadingLine(text string) bool { return mdHeading.MatchString(text) }

// looksLikeHeadingTitle 判断整块是否由 Markdown 标题行组成、且首行是英文。
// 用来识别「# Websockets / # WebSocket」这类没有汉字译文的纯英文标题块。
func looksLikeHeadingTitle(lines []sourceLine) bool {
	if len(lines) == 0 || !hasLatin(lines[0].text) || hasHan(lines[0].text) {
		return false
	}
	for _, line := range lines {
		if !isHeadingLine(line.text) {
			return false
		}
	}
	return true
}

// 表格分隔行：--- / :--- / ---: / :---:，每个单元都必须符合。
var tableSeparator = regexp.MustCompile(`^:?-+:?$`)

// tableCells 按 | 切分一行表格，去掉首尾竖线产生的空单元。
func tableCells(text string) ([]string, bool) {
	text = strings.TrimSpace(text)
	if !strings.Contains(text, "|") {
		return nil, false
	}
	cells := strings.Split(text, "|")
	// 首尾竖线会切出空单元，去掉它们；中间的空单元保留给渲染端。
	if len(cells) > 0 && strings.TrimSpace(cells[0]) == "" {
		cells = cells[1:]
	}
	if len(cells) > 0 && strings.TrimSpace(cells[len(cells)-1]) == "" {
		cells = cells[:len(cells)-1]
	}
	if len(cells) < 2 {
		return nil, false
	}
	return cells, true
}

// isTableSeparator 判断整行是否由 --- 之类的对齐分隔单元组成。
func isTableSeparator(text string) bool {
	cells, ok := tableCells(text)
	if !ok {
		return false
	}
	for _, cell := range cells {
		if !tableSeparator.MatchString(strings.TrimSpace(cell)) {
			return false
		}
	}
	return true
}

// looksLikeTable 只认整块都是 Markdown 表格行、且第二行为分隔行的块，
// 避免把正文里偶尔出现竖线的句子误判成表格。
func looksLikeTable(lines []sourceLine) bool {
	if len(lines) < 2 {
		return false
	}
	if _, ok := tableCells(lines[0].text); !ok {
		return false
	}
	if !isTableSeparator(lines[1].text) {
		return false
	}
	for _, line := range lines[2:] {
		if _, ok := tableCells(line.text); !ok {
			return false
		}
	}
	return true
}

// rawText 用未去掉缩进的原始行拼接代码段内容。
func rawText(lines []sourceLine) string {
	parts := make([]string, len(lines))
	for i, line := range lines {
		parts[i] = line.raw
	}
	return strings.Join(parts, "\n")
}

// issueReason 沿用原有的诊断用词，方便按提示修正原文。
func issueReason(lines []sourceLine) string {
	if len(lines) != 2 {
		return "每组应为两条非空行，请检查缺失译文或折行，并使用空行分组"
	}
	if hasHan(lines[0].text) {
		return "疑似中英文顺序颠倒或英语行含中文，请人工核对"
	}
	return "无法确认英语在前、中文在后的配对，请人工核对"
}

func parseText(text string) ParseResult {
	result := ParseResult{Segments: []ParsedSegment{}, Issues: []ParseIssue{}}
	text = strings.ReplaceAll(strings.ReplaceAll(text, "\r\n", "\n"), "\r", "\n")
	blocks := []sourceBlock{}
	block := []sourceLine{}
	fenced := false
	inFence := false
	flush := func() {
		if len(block) > 0 {
			blocks = append(blocks, sourceBlock{block, fenced})
			block = nil
		}
		fenced = false
	}
	for i, line := range strings.Split(text, "\n") {
		trimmed := strings.TrimSpace(line)
		// ``` 围栏行只用于切换状态，自身（含语言标签）不进正文。
		if strings.HasPrefix(trimmed, "```") {
			flush()
			inFence = !inFence
			continue
		}
		if inFence {
			// 围栏内不按空行分组，缩进与空行原样保留。
			fenced = true
			block = append(block, sourceLine{i + 1, line, trimmed})
			continue
		}
		if trimmed == "" {
			flush()
			continue
		}
		block = append(block, sourceLine{i + 1, line, trimmed})
	}
	// 围栏没有闭合时，已累积的内容仍按代码段保留，不报错。
	flush()
	if len(blocks) == 0 {
		result.Issues = append(result.Issues, ParseIssue{1, "", "原文不能为空"})
		return result
	}
	titled := false
	// 出现无法识别的内容后，不再把后续配对提升为标题，避免正文首段被误当作标题。
	blocked := false
	for _, b := range blocks {
		lines := b.lines
		// 优先级零：整块 Markdown 表格，保留源码供阅读页渲染。
		// 围栏内的表格仍按围栏代码处理。
		if !b.fenced && looksLikeTable(lines) {
			result.Segments = append(result.Segments, ParsedSegment{
				En:       rawText(lines),
				Kind:     kindTable,
				Position: len(result.Segments) + 1,
			})
			continue
		}
		// 优先级零：整块都是 Markdown 标题行，第二行没有汉字时也要能当标题。
		// 3 行以上的标题块不在此列，避免静默丢弃多余标题。
		if !b.fenced && !titled && !blocked && len(lines) <= 2 && looksLikeHeadingTitle(lines) {
			if len(lines) == 1 {
				// 只有英文标题、没有译文：中文标题留空。
				result.Title = Title{cleanMarkdown(lines[0].text), ""}
			} else {
				// 两行都是标题：第二行写入中文标题槽位，术语无需翻译。
				result.Title = Title{cleanMarkdown(lines[0].text), cleanMarkdown(lines[1].text)}
			}
			titled = true
			continue
		}
		// 优先级一：英语在前、中文在后的配对（与原有规则一致）。
		if !b.fenced && len(lines) == 2 && !hasHan(lines[0].text) && hasLatin(lines[0].text) && hasHan(lines[1].text) {
			if !titled && !blocked {
				result.Title = Title{cleanMarkdown(lines[0].text), cleanMarkdown(lines[1].text)}
				titled = true
				continue
			}
			result.Segments = append(result.Segments, ParsedSegment{
				En:       cleanMarkdown(lines[0].text),
				Zh:       cleanMarkdown(lines[1].text),
				Kind:     kindText,
				Position: len(result.Segments) + 1,
			})
			continue
		}
		// 优先级二：整块都是代码行；围栏内的内容一律算代码，不做中英配对。
		if b.fenced || looksLikeCodeBlock(lines) {
			result.Segments = append(result.Segments, ParsedSegment{
				En:       rawText(lines),
				Kind:     kindCode,
				Position: len(result.Segments) + 1,
			})
			continue
		}
		// 优先级三：无法确认的块仍保留在 issues 里，供人工核对。
		blocked = true
		reason := issueReason(lines)
		for _, line := range lines {
			result.Issues = append(result.Issues, ParseIssue{line.number, line.text, reason})
		}
	}
	return result
}
