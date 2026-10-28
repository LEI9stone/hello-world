// 新格式示例：第一条为标题，其余为正文；en 用 Markdown，代码段的 zh 可以留空。
export const sample = JSON.stringify(
  [
    { en: "# About the Go programming language", zh: "关于 Go 编程语言" },
    {
      en: "Go is an open source programming language designed for building simple, fast, and reliable software.",
      zh: "Go 是一门开源编程语言，旨在构建简洁、高效且可靠的软件。",
    },
    {
      en: "Take a look at the [Go Web Examples](https://gowebexamples.com), which shows how great companies use Go.",
      zh: "看看 [Go Web Examples](https://gowebexamples.com)，其中展示了大型企业如何使用 Go。",
    },
    {
      en: "A classic entry point looks like this:",
      zh: "经典的入口代码如下：",
    },
    {
      en: "```go\nfunc main() {\n\tfmt.Println(\"Hello World\")\n}\n```",
      zh: "",
    },
  ],
  null,
  2,
);
