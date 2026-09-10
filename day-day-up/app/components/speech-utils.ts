import type { ChapterData, Sentence, WordEntry } from "./types";
import { HEADING_POSITION } from "./types";

/** 固定音色：Samantha · en-US（不提供选择器） */
export const VOICE_NAME = "Samantha";
export const VOICE_LANG = "en-US";

/** 是否为可朗读的词（链接等特殊 token 不朗读） */
export function isSpeakable(word: WordEntry): boolean {
  return (word.kind ?? "word") === "word";
}

/** 去掉标点，只保留能朗读的字符（字母、连字符、撇号） */
export function cleanWord(word: string): string {
  return word.replace(/[^a-zA-Z'-]/g, "");
}

/** 整段原文：由各句 text 拼接 */
export function chapterText(chapter: ChapterData): string {
  return chapter.sentences
    .map((sentence) => sentence.text.trim())
    .filter(Boolean)
    .join(" ");
}

/** 朗读队列中的一步（一步 = 一个段标题，或一个整句） */
export interface SpeechStep {
  /** 所属段落 id：全文朗读时队列会跨段，每步自带归属 */
  chapterId: string;
  /** 所属句子下标；HEADING_POSITION 表示这是段标题 */
  sentenceIndex: number;
  /** 该句第一个可读词的下标；HEADING_POSITION 表示标题；-1 表示整句兜底 */
  wordIndex: number;
  /** 朗读文本（整句/标题） */
  text: string;
  /** 每个可读词在 text 中的起始偏移，用于 onboundary 定位当前词 */
  wordOffsets: readonly { wordIndex: number; start: number }[];
}

/**
 * 构建一个段落的朗读队列：段标题（若有）+ 逐句。
 * **一句一条 utterance**，由 TTS 按整句朗读，语调、连读、停顿都是正常念文章的听感
 * （逐词念会变成一个个单词往外蹦）。
 *
 * 句子之间用队列串起来，因此「暂停/继续」落在句边界上；
 * 句内当前读到哪个词由 onboundary 事件（见 wordIndexAt）跟随。
 */
export function buildChapterQueue(chapter: ChapterData): SpeechStep[] {
  const steps: SpeechStep[] = [];

  const heading = chapter.heading?.word.word.trim();
  if (heading) {
    steps.push({
      chapterId: chapter.id,
      sentenceIndex: HEADING_POSITION,
      wordIndex: HEADING_POSITION,
      text: heading,
      wordOffsets: [],
    });
  }

  chapter.sentences.forEach((sentence, sentenceIndex) => {
    const speakable = sentence.words
      .map((word, wordIndex) => ({ word, wordIndex }))
      .filter(({ word }) => isSpeakable(word) && cleanWord(word.word).length > 0);

    // 优先念原句：保留逗号、句号等标点，TTS 的停顿与语调才自然
    const text = spokenText(sentence);

    if (speakable.length === 0) {
      if (text) {
        steps.push({
          chapterId: chapter.id,
          sentenceIndex,
          wordIndex: -1,
          text,
          wordOffsets: [],
        });
      }
      return;
    }

    const aligned = text ? alignWords(text, speakable) : null;
    if (aligned) {
      steps.push({
        chapterId: chapter.id,
        sentenceIndex,
        wordIndex: speakable[0].wordIndex,
        text,
        wordOffsets: aligned,
      });
      return;
    }

    // 兜底：原句与词表对不齐时，退回按 token 拼接
    let joined = "";
    const wordOffsets: { wordIndex: number; start: number }[] = [];
    speakable.forEach(({ word, wordIndex }, position) => {
      if (position > 0) joined += " ";
      wordOffsets.push({ wordIndex, start: joined.length });
      joined += word.word;
    });
    steps.push({
      chapterId: chapter.id,
      sentenceIndex,
      wordIndex: speakable[0].wordIndex,
      text: joined,
      wordOffsets,
    });
  });

  return steps;
}

/** 构建全文朗读队列：按文章顺序把各段的标题与句子串成一条队列 */
export function buildArticleQueue(
  article: readonly ChapterData[],
): SpeechStep[] {
  return article.flatMap((chapter) => buildChapterQueue(chapter));
}

/** 朗读文本：原句去掉链接等不可朗读 token，并收拾多余空格 */
function spokenText(sentence: Sentence): string {
  let text = sentence.text;
  for (const word of sentence.words) {
    if (isSpeakable(word)) continue;
    text = text.split(word.word).join(" ");
  }
  return text
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** 把可朗读 token 按顺序对齐到朗读文本中的位置；对不齐返回 null */
function alignWords(
  text: string,
  tokens: readonly { word: WordEntry; wordIndex: number }[],
): { wordIndex: number; start: number }[] | null {
  const offsets: { wordIndex: number; start: number }[] = [];
  let cursor = 0;

  for (const { word, wordIndex } of tokens) {
    const target = cleanWord(word.word);
    if (!target) return null;
    const match = new RegExp(`\\b${escapeRegExp(target)}\\b`, "i").exec(
      text.slice(cursor),
    );
    if (!match) return null;
    offsets.push({ wordIndex, start: cursor + match.index });
    cursor += match.index + match[0].length;
  }

  return offsets;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 根据 onboundary 的 charIndex 定位当前朗读到哪个词。
 * 浏览器不派发 boundary 事件时返回 null，此时保留句首词高亮。
 */
export function wordIndexAt(step: SpeechStep, charIndex: number): number | null {
  let found: number | null = null;
  for (const item of step.wordOffsets) {
    if (item.start <= charIndex) found = item.wordIndex;
    else break;
  }
  return found;
}

/**
 * 挑选英文音色：Samantha · en-US 优先，逐级降级，找不到返回 null
 * （此时由 utterance.lang = "en-US" 交给浏览器默认音色）。
 */
export function pickEnglishVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const english = voices.filter((voice) =>
    voice.lang?.toLowerCase().startsWith("en"),
  );
  const pool = english.length > 0 ? english : voices;

  return (
    pool.find(
      (voice) => voice.name === VOICE_NAME && voice.lang === VOICE_LANG,
    ) ??
    pool.find((voice) =>
      voice.name.toLowerCase().startsWith(VOICE_NAME.toLowerCase()),
    ) ??
    pool.find((voice) => voice.default && isEnUs(voice)) ??
    pool.find(isEnUs) ??
    pool.find((voice) => voice.default) ??
    pool[0] ??
    null
  );
}

function isEnUs(voice: SpeechSynthesisVoice): boolean {
  return voice.lang?.toLowerCase().startsWith("en-us") ?? false;
}

/** 词按钮的无障碍标签 */
export function wordAriaLabel(word: WordEntry): string {
  if (!isSpeakable(word)) return `链接 ${word.word}`;
  return `${word.word}，音标 ${word.phonetic}，点击发音`;
}
