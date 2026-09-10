import type { ChapterData } from "../components/types";

/**
 * 示例文章：Go 语言参考手册前言部分，共 3 段 / 6 句。
 * 每个段落一个 <Chapter />，段内按句展示「词流 + 中文翻译」。
 */
export const sampleArticle: ChapterData[] = [
  {
    id: "p1",
    heading: {
      word: {
        word: "Introduction",
        phonetic: "/ˌɪntrəˈdʌʃn/",
        meaning: "n. 引言；简介",
      },
      translation: "简介",
    },
    sentences: [
      {
        id: "p1-s1",
        text: "This is the reference manual for the Go programming language.",
        translation: "这是Go编程语言的参考手册。",
        words: [
          { word: "This", phonetic: "/ðɪs/", meaning: "pron. 这" },
          { word: "is", phonetic: "/ɪz/", meaning: "v. 是" },
          { word: "the", phonetic: "/ðə/", meaning: "art. 这；该" },
          { word: "reference", phonetic: "/ˈrefrəns/", meaning: "n. 参考" },
          { word: "manual", phonetic: "/ˈmænjuəl/", meaning: "n. 手册" },
          { word: "for", phonetic: "/fɔːr/", meaning: "prep. 用于；关于" },
          { word: "the", phonetic: "/ðə/", meaning: "art. 这；该" },
          { word: "Go", phonetic: "/ɡoʊ/", meaning: "n. Go（语言名）" },
          {
            word: "programming",
            phonetic: "/ˈproʊɡræmɪŋ/",
            meaning: "n. 编程",
          },
          { word: "language", phonetic: "/ˈlæŋɡwɪdʒ/", meaning: "n. 语言" },
        ],
      },
      {
        id: "p1-s2",
        text: "For more information and other documents, see https://go.dev/.",
        translation: "如需更多信息以及其他文档，请访问 https://go.dev/。",
        words: [
          { word: "For", phonetic: "/fɔːr/", meaning: "prep. 为了；有关" },
          { word: "more", phonetic: "/mɔːr/", meaning: "adj. 更多的" },
          {
            word: "information",
            phonetic: "/ˌɪnfərˈmeɪʃn/",
            meaning: "n. 信息",
          },
          { word: "and", phonetic: "/ænd/", meaning: "conj. 和" },
          { word: "other", phonetic: "/ˈʌðər/", meaning: "adj. 其他的" },
          {
            word: "documents",
            phonetic: "/ˈdɑːkjəmənts/",
            meaning: "n. 文档（复数）",
          },
          { word: "see", phonetic: "/siː/", meaning: "v. 查阅；参见" },
          {
            word: "https://go.dev/",
            phonetic: "",
            meaning: "",
            kind: "link",
          },
        ],
      },
    ],
  },
  {
    id: "p2",
    sentences: [
      {
        id: "p2-s1",
        text: "Go is a general-purpose language designed with systems programming in mind.",
        translation: "Go是一门面向系统编程设计的通用语言。",
        words: [
          { word: "Go", phonetic: "/ɡoʊ/", meaning: "n. Go语言" },
          { word: "is", phonetic: "/ɪz/", meaning: "v. 是" },
          { word: "a", phonetic: "/ə/", meaning: "art. 一种" },
          {
            word: "general-purpose",
            phonetic: "/ˈdʒenrəl ˈpɜːrpəs/",
            meaning: "adj. 通用的",
          },
          { word: "language", phonetic: "/ˈlæŋɡwɪdʒ/", meaning: "n. 语言" },
          {
            word: "designed",
            phonetic: "/dɪˈzaɪnd/",
            meaning: "v. 设计（过去分词）",
          },
          { word: "with", phonetic: "/wɪð/", meaning: "prep. 考虑；带有" },
          { word: "systems", phonetic: "/ˈsɪstəmz/", meaning: "n. 系统（复数）" },
          {
            word: "programming",
            phonetic: "/ˈproʊɡræmɪŋ/",
            meaning: "n. 编程",
          },
          { word: "in", phonetic: "/ɪn/", meaning: "prep. 在…之中" },
          { word: "mind", phonetic: "/maɪnd/", meaning: "n. 想法；头脑" },
        ],
      },
      {
        id: "p2-s2",
        text: "It is strongly typed and garbage-collected and has explicit support for concurrent programming.",
        translation:
          "它是强类型语言，具备垃圾回收机制，并对并发编程提供原生明确支持。",
        words: [
          { word: "It", phonetic: "/ɪt/", meaning: "pron. 它" },
          { word: "is", phonetic: "/ɪz/", meaning: "v. 是" },
          { word: "strongly", phonetic: "/ˈstrɔːŋli/", meaning: "adv. 强烈地" },
          { word: "typed", phonetic: "/taɪpt/", meaning: "adj. 类型化的" },
          { word: "and", phonetic: "/ænd/", meaning: "conj. 并且" },
          {
            word: "garbage-collected",
            phonetic: "/ˈɡɑːrbɪdʒ kəˈlektɪd/",
            meaning: "adj. 带垃圾回收机制的",
          },
          { word: "and", phonetic: "/ænd/", meaning: "conj. 并且" },
          { word: "has", phonetic: "/hæz/", meaning: "v. 拥有" },
          {
            word: "explicit",
            phonetic: "/ɪkˈsplɪsɪt/",
            meaning: "adj. 明确的",
          },
          { word: "support", phonetic: "/səˈpɔːrt/", meaning: "n. 支持" },
          { word: "for", phonetic: "/fɔːr/", meaning: "prep. 对于" },
          {
            word: "concurrent",
            phonetic: "/kənˈkɜːrənt/",
            meaning: "adj. 并发的",
          },
          {
            word: "programming",
            phonetic: "/ˈproʊɡræmɪŋ/",
            meaning: "n. 编程",
          },
        ],
      },
      {
        id: "p2-s3",
        text: "Programs are constructed from packages, whose properties allow efficient management of dependencies.",
        translation:
          "程序由包构建而成，包的特性可以实现对依赖项的高效管理。",
        words: [
          {
            word: "Programs",
            phonetic: "/ˈproʊɡræmz/",
            meaning: "n. 程序（复数）",
          },
          { word: "are", phonetic: "/ɑːr/", meaning: "v. 是" },
          {
            word: "constructed",
            phonetic: "/kənˈstrʌktɪd/",
            meaning: "v. 构建（过去分词）",
          },
          { word: "from", phonetic: "/frʌm/", meaning: "prep. 从…而来" },
          {
            word: "packages",
            phonetic: "/ˈpækɪdʒɪz/",
            meaning: "n. 包（复数）",
          },
          { word: "whose", phonetic: "/huːz/", meaning: "pron. 它们的" },
          {
            word: "properties",
            phonetic: "/ˈprɑːpərtiz/",
            meaning: "n. 特性（复数）",
          },
          { word: "allow", phonetic: "/əˈlaʊ/", meaning: "v. 允许；使得" },
          { word: "efficient", phonetic: "/ɪˈfɪʃnt/", meaning: "adj. 高效的" },
          {
            word: "management",
            phonetic: "/ˈmænɪdʒmənt/",
            meaning: "n. 管理",
          },
          { word: "of", phonetic: "/əv/", meaning: "prep. …的" },
          {
            word: "dependencies",
            phonetic: "/dɪˈpendənsiz/",
            meaning: "n. 依赖项（复数）",
          },
        ],
      },
    ],
  },
  {
    id: "p3",
    sentences: [
      {
        id: "p3-s1",
        text: "The syntax is compact and simple to parse, allowing for easy analysis by automatic tools such as integrated development environments.",
        translation:
          "它的语法简洁，易于解析，方便集成开发环境这类自动化工具进行代码分析。",
        words: [
          { word: "The", phonetic: "/ðə/", meaning: "art. 该" },
          { word: "syntax", phonetic: "/ˈsɪntæks/", meaning: "n. 语法" },
          { word: "is", phonetic: "/ɪz/", meaning: "v. 是" },
          { word: "compact", phonetic: "/kəmˈpækt/", meaning: "adj. 简洁的" },
          { word: "and", phonetic: "/ænd/", meaning: "conj. 并且" },
          { word: "simple", phonetic: "/ˈsɪmpl/", meaning: "adj. 简单的" },
          { word: "to", phonetic: "/tuː/", meaning: "prep. 去；用于" },
          { word: "parse", phonetic: "/pɑːrz/", meaning: "v. 解析" },
          {
            word: "allowing",
            phonetic: "/əˈlaʊɪŋ/",
            meaning: "v. 使得（现在分词）",
          },
          { word: "for", phonetic: "/fɔːr/", meaning: "prep. 带来" },
          { word: "easy", phonetic: "/ˈiːzi/", meaning: "adj. 容易的" },
          { word: "analysis", phonetic: "/əˈnæləsɪs/", meaning: "n. 分析" },
          { word: "by", phonetic: "/baɪ/", meaning: "prep. 由；借助" },
          {
            word: "automatic",
            phonetic: "/ˌɔːtəˈmætɪk/",
            meaning: "adj. 自动的",
          },
          { word: "tools", phonetic: "/tuːlz/", meaning: "n. 工具（复数）" },
          { word: "such", phonetic: "/sʌtʃ/", meaning: "adj. 这样的" },
          { word: "as", phonetic: "/æz/", meaning: "prep. 例如" },
          {
            word: "integrated",
            phonetic: "/ˈɪntɪɡreɪtɪd/",
            meaning: "adj. 集成的",
          },
          {
            word: "development",
            phonetic: "/dɪˈveləpmənt/",
            meaning: "n. 开发",
          },
          {
            word: "environments",
            phonetic: "/ɪnˈvaɪrənmənts/",
            meaning: "n. 环境（复数）",
          },
        ],
      },
    ],
  },
];
