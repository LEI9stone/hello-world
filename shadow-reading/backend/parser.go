package main

import (
	"strings"
	"unicode"
)

type ParseIssue struct {
	Line   int    `json:"line"`
	Text   string `json:"text"`
	Reason string `json:"reason"`
}
type ParsedSegment struct {
	En       string `json:"en"`
	Zh       string `json:"zh"`
	Position int    `json:"position"`
}
type ParseResult struct {
	Title    Title           `json:"title"`
	Segments []ParsedSegment `json:"segments"`
	Issues   []ParseIssue    `json:"issues"`
}
type sourceLine struct {
	number int
	text   string
}

func hasHan(s string) bool {
	return strings.ContainsFunc(s, func(r rune) bool { return unicode.Is(unicode.Han, r) })
}
func hasLatin(s string) bool {
	return strings.ContainsFunc(s, func(r rune) bool { return unicode.Is(unicode.Latin, r) })
}
func parseText(text string) ParseResult {
	result := ParseResult{Segments: []ParsedSegment{}, Issues: []ParseIssue{}}
	text = strings.ReplaceAll(strings.ReplaceAll(text, "\r\n", "\n"), "\r", "\n")
	blocks := [][]sourceLine{}
	block := []sourceLine{}
	for i, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			if len(block) > 0 {
				blocks = append(blocks, block)
				block = nil
			}
			continue
		}
		block = append(block, sourceLine{i + 1, line})
	}
	if len(block) > 0 {
		blocks = append(blocks, block)
	}
	if len(blocks) == 0 {
		result.Issues = append(result.Issues, ParseIssue{1, "", "原文不能为空"})
		return result
	}
	for i, lines := range blocks {
		reason := ""
		if len(lines) != 2 {
			reason = "每组应为两条非空行，请检查缺失译文或折行，并使用空行分组"
		} else if hasHan(lines[0].text) {
			reason = "疑似中英文顺序颠倒或英语行含中文，请人工核对"
		} else if !hasLatin(lines[0].text) || !hasHan(lines[1].text) {
			reason = "无法确认英语在前、中文在后的配对，请人工核对"
		}
		if reason != "" {
			for _, line := range lines {
				result.Issues = append(result.Issues, ParseIssue{line.number, line.text, reason})
			}
			continue
		}
		if i == 0 {
			result.Title = Title{lines[0].text, lines[1].text}
		} else {
			result.Segments = append(result.Segments, ParsedSegment{lines[0].text, lines[1].text, len(result.Segments) + 1})
		}
	}
	return result
}
