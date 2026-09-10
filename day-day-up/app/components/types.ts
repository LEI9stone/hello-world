/**
 * Chapter 组件族共用的数据模型。
 */

/** 朗读语速档位 */
export type SpeechRate = 0.8 | 1 | 1.2;

/** 语速档位选项（控制条按此顺序渲染） */
export const SPEECH_RATES: readonly SpeechRate[] = [0.8, 1, 1.2];

/**
 * (sentenceIndex, wordIndex) 中的哨兵值：表示"段标题"这个位置，
 * 而不是正文里的第几句/第几个词。点击标题发音、全文朗读的第 0 步都用它定位。
 */
export const HEADING_POSITION = -1;

/**
 * token 类型：
 * - word：可点读的词
 * - link：链接，渲染成可跳转链接
 * - symbol：标点/代码类符号（如 ","、"a ... b"、"``."），只展示，不可点读
 * link 与 symbol 都不参与朗读与跟读高亮。
 */
export type WordKind = "word" | "link" | "symbol";

/** 词流里的一个 token（普通单词，或链接等特殊 token） */
export interface WordEntry {
  /** 展示用原文，保留标点，如 "discovery."；link 时为完整 URL */
  word: string;
  /** 音标，如 "/dɪˈskʌvəri/"；link 时为空 */
  phonetic: string;
  /** 中文释义，如 "n. 发现；探索成果"；link 时为空 */
  meaning: string;
  /** 默认 "word" */
  kind?: WordKind;
}

/** 一个句子：英文原句 + 中文翻译 + 逐词信息 */
export interface Sentence {
  /** 句子唯一 id，如 "p1-s1" */
  id: string;
  /** 英文原句；代码块词表这类没有句子的单元留空字符串 */
  text: string;
  /** 该句的中文翻译；留空则不渲染翻译段落 */
  translation: string;
  /** 逐词 token，数组顺序即朗读顺序 */
  words: WordEntry[];
  /**
   * 可选的代码块原文（多行，保留空格与换行），
   * 渲染在该句的中文翻译之后。代码块只做展示，不参与朗读。
   */
  code?: string;
  /**
   * 代码块语言，如 "go" / "python" / "bash"。
   * 服务端用 Shiki 高亮；不认识的语言（如 EBNF）按纯文本渲染。
   */
  codeLang?: string;
}

/** 段标题，如 Introduction / ˌɪntrəˈdʌʃn / n. 引言；简介 + 中文「简介」 */
export interface ChapterHeading {
  word: WordEntry;
  /** 标题的中文翻译 */
  translation: string;
}

/**
 * 文章中的一个段落。
 * 文章页把每个段落映射成一个 <Chapter />；段内可含 1~N 个句子。
 */
export interface ChapterData {
  /** 段落唯一 id：React key、锚点、朗读定位都用它 */
  id: string;
  /** 段标题（可选） */
  heading?: ChapterHeading;
  /** 段内句子，数组顺序即朗读顺序 */
  sentences: Sentence[];
}

/** 文章级词详情栏当前展示的选中词 */
export interface WordSelection {
  /** 所属段落 id，用于让对应 Chapter 高亮 */
  chapterId: string;
  /** 所属句子在段落 sentences 中的下标 */
  sentenceIndex: number;
  /** 该 token 在句子 words 中的下标 */
  wordIndex: number;
  word: WordEntry;
}
