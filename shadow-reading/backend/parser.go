package main

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

type ParsedSegment struct {
	En       string `json:"en"`
	Zh       string `json:"zh"`
	Kind     string `json:"kind"`
	Position int    `json:"position"`
}
type ParseResult struct {
	Title    Title           `json:"title"`
	Segments []ParsedSegment `json:"segments"`
}

// 标题行首的 Markdown 井号；标题本身由页面渲染成 H1，存储时去掉。
var mdHeading = regexp.MustCompile(`^\s*#{1,6}[ \t]+`)

func stripHeading(s string) string {
	return strings.TrimSpace(mdHeading.ReplaceAllString(s, ""))
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

// classifyBlock 把整段内容归为代码围栏、Markdown 表格或普通文本。
// 代码围栏去掉首尾围栏行（语言标签一并丢弃），表格与文本保留 Markdown 源码。
func classifyBlock(en string) (string, string) {
	trimmed := strings.TrimSpace(en)
	lines := strings.Split(trimmed, "\n")
	if len(lines) >= 2 &&
		strings.HasPrefix(strings.TrimSpace(lines[0]), "```") &&
		strings.HasPrefix(strings.TrimSpace(lines[len(lines)-1]), "```") {
		return kindCode, strings.Join(lines[1:len(lines)-1], "\n")
	}
	if len(lines) >= 2 {
		if _, ok := tableCells(lines[0]); ok && isTableSeparator(lines[1]) {
			table := true
			for _, line := range lines[2:] {
				if _, cellOK := tableCells(line); !cellOK {
					table = false
					break
				}
			}
			if table {
				return kindTable, trimmed
			}
		}
	}
	return kindText, trimmed
}

// parseJSON 解析 [{en, zh}] 数组：第一条为标题，其余每条为一个正文段。
// en 是 Markdown 原文，zh 是中文翻译，允许为空。
func parseJSON(text string) (ParseResult, error) {
	result := ParseResult{Segments: []ParsedSegment{}}
	var items []struct {
		En string `json:"en"`
		Zh string `json:"zh"`
	}
	if err := json.Unmarshal([]byte(text), &items); err != nil {
		return result, fmt.Errorf("请粘贴合法 JSON 数组，例如 [{\"en\":\"...\",\"zh\":\"...\"}]")
	}
	if len(items) == 0 {
		return result, fmt.Errorf("JSON 数组不能为空")
	}
	if len(items) > 501 {
		return result, fmt.Errorf("正文最多 500 组")
	}
	for i := range items {
		items[i].En = strings.TrimSpace(items[i].En)
		items[i].Zh = strings.TrimSpace(items[i].Zh)
		if items[i].En == "" {
			return result, fmt.Errorf("第%d条的 en 不能为空", i+1)
		}
	}
	result.Title = Title{stripHeading(items[0].En), stripHeading(items[0].Zh)}
	for i, item := range items[1:] {
		kind, content := classifyBlock(item.En)
		result.Segments = append(result.Segments, ParsedSegment{
			En:       content,
			Zh:       item.Zh,
			Kind:     kind,
			Position: i + 1,
		})
	}
	if len(result.Segments) == 0 {
		return result, fmt.Errorf("除标题外至少需要一条正文")
	}
	return result, nil
}
