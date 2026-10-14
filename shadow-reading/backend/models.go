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
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	ArticleCount int    `json:"articleCount"`
}
type Segment struct {
	ID       int64  `json:"id"`
	Position int    `json:"position"`
	En       string `json:"en"`
	Zh       string `json:"zh"`
}
type Article struct {
	ID       int64     `json:"id"`
	BookID   int64     `json:"bookId"`
	UnitName string    `json:"unitName"`
	Position int       `json:"position"`
	Title    Title     `json:"title"`
	Segments []Segment `json:"segments"`
}
type SegmentInput struct {
	ID *int64 `json:"id,omitempty"`
	En string `json:"en"`
	Zh string `json:"zh"`
}
type ArticleInput struct {
	UnitName string         `json:"unitName"`
	Title    Title          `json:"title"`
	Segments []SegmentInput `json:"segments"`
}

func field(value *string, name string, max int) error {
	*value = strings.TrimSpace(*value)
	if *value == "" {
		return fmt.Errorf("%s不能为空", name)
	}
	if !utf8.ValidString(*value) || utf8.RuneCountInString(*value) > max {
		return fmt.Errorf("%s超过长度限制（%d字符）或编码无效", name, max)
	}
	return nil
}
func (a *ArticleInput) validate() error {
	for _, f := range []struct {
		value *string
		name  string
		max   int
	}{{&a.UnitName, "单元名称", 200}, {&a.Title.En, "英语标题", 500}, {&a.Title.Zh, "中文标题", 500}} {
		if err := field(f.value, f.name, f.max); err != nil {
			return err
		}
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
		if err := field(&s.En, fmt.Sprintf("第%d组英语正文", i+1), 20000); err != nil {
			return err
		}
		if err := field(&s.Zh, fmt.Sprintf("第%d组中文正文", i+1), 20000); err != nil {
			return err
		}
	}
	return nil
}
