package main

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

type Title struct {
	En string `json:"en"`
	Zh string `json:"zh"`
}
type Book struct {
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	ArticleCount   int    `json:"articleCount"`
	FirstArticleID *int64 `json:"firstArticleId"`
}
type Segment struct {
	ID       int64  `json:"id"`
	Position int    `json:"position"`
	Kind     string `json:"kind"`
	En       string `json:"en"`
	Zh       string `json:"zh"`
}
type Article struct {
	ID         int64     `json:"id"`
	BookID     int64     `json:"bookId"`
	ParentID   *int64    `json:"parentId"`
	UnitName   string    `json:"unitName"`
	Position   int       `json:"position"`
	ChildCount int       `json:"childCount"`
	Title      Title     `json:"title"`
	Segments   []Segment `json:"segments"`
}
type SegmentInput struct {
	ID   *int64 `json:"id,omitempty"`
	Kind string `json:"kind"`
	En   string `json:"en"`
	Zh   string `json:"zh"`
}
type ArticleInput struct {
	UnitName string         `json:"unitName"`
	Title    Title          `json:"title"`
	Segments []SegmentInput `json:"segments"`
}

// 正文段落类型：文本段需要双语配对，代码段与表格段只保留原样内容。
const (
	kindText  = "text"
	kindCode  = "code"
	kindTable = "table"
)

// normalizeKind 把缺省的段落类型归一到 text，未知取值直接拒绝。
func normalizeKind(kind string) (string, bool) {
	switch strings.TrimSpace(kind) {
	case "", kindText:
		return kindText, true
	case kindCode:
		return kindCode, true
	case kindTable:
		return kindTable, true
	}
	return "", false
}

func optionalField(value *string, name string, max int) error {
	*value = strings.TrimSpace(*value)
	if *value == "" {
		return nil
	}
	if !utf8.ValidString(*value) || utf8.RuneCountInString(*value) > max {
		return fmt.Errorf("%s超过长度限制（%d字符）或编码无效", name, max)
	}
	return nil
}
func field(value *string, name string, max int) error {
	if err := optionalField(value, name, max); err != nil {
		return err
	}
	if *value == "" {
		return fmt.Errorf("%s不能为空", name)
	}
	return nil
}
func (a *ArticleInput) validate() error {
	for _, f := range []struct {
		value *string
		name  string
		max   int
	}{{&a.UnitName, "单元名称", 200}, {&a.Title.En, "英语标题", 500}} {
		if err := field(f.value, f.name, f.max); err != nil {
			return err
		}
	}
	// 标题可能是无需翻译的专业术语，中文标题允许留空。
	if err := optionalField(&a.Title.Zh, "中文标题", 500); err != nil {
		return err
	}
	if len(a.Segments) < 1 || len(a.Segments) > 500 {
		return fmt.Errorf("正文必须包含1至500组")
	}
	seen := map[int64]bool{}
	for i := range a.Segments {
		s := &a.Segments[i]
		if s.ID != nil {
			if *s.ID <= 0 || seen[*s.ID] {
				return fmt.Errorf("第%d组正文标识无效或重复", i+1)
			}
			seen[*s.ID] = true
		}
		kind, ok := normalizeKind(s.Kind)
		if !ok {
			return fmt.Errorf("第%d组正文类型无效", i+1)
		}
		s.Kind = kind
		if err := field(&s.En, fmt.Sprintf("第%d组英语正文", i+1), 20000); err != nil {
			return err
		}
		// 中文译文允许为空：代码段、无需翻译的标题与术语都不强制翻译。
		if err := optionalField(&s.Zh, fmt.Sprintf("第%d组中文正文", i+1), 20000); err != nil {
			return err
		}
	}
	return nil
}
