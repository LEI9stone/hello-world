import { useCallback, useState } from 'react';

import { useSpeech } from './speech-context';
import { cleanWord, isSpeakable, wordAriaLabel } from './speech-utils';
import { HEADING_POSITION } from './types';
import type { ChapterData, WordEntry } from './types';

export interface ChapterProps {
  /** 段落数据（段内可含多句） */
  chapter: ChapterData;
  /** 段序（从 1 开始），用于生成 aria-label，可选 */
  index?: number;
  /** 是否显示各句的中文翻译，默认 true */
  showTranslation?: boolean;
  /** 点击单词/段标题时回调，用于驱动文章级词详情栏 */
  onWordSelect?: (
    word: WordEntry,
    wordIndex: number,
    sentenceIndex: number,
  ) => void;
  /** 外层 className 扩展 */
  className?: string;
}

const WORD_FONT = "Georgia, 'Times New Roman', serif";
const PHONETIC_FONT = "'Arial Unicode MS', Arial, sans-serif";

const tokenBase = [
  'grid grid-rows-[16px_26px] place-items-center rounded-[5px]',
  'border-0 bg-transparent px-1 py-0.5 transition',
].join(' ');
const tokenClass = `${tokenBase} cursor-pointer`;

const activeClass =
  'bg-[#fff4dc] text-[#79520c] shadow-[inset_0_-2px_0_#d59625]';
const idleClass =
  'hover:-translate-y-px hover:bg-[#e8f3ed] hover:text-[#0f5036]';

/** 段标题在 (sentenceIndex, wordIndex) 上的定位键 */
const HEADING_KEY = `${HEADING_POSITION}-${HEADING_POSITION}`;

/**
 * 段落组件：段标题（可点读）+ 段内逐句的「词流 + 中文翻译」。
 *
 * 朗读控制（朗读全文 / 暂停 / 语速）在文章级 <ArticleControls /> 上，
 * 朗读状态由 <SpeechProvider> 统一持有，这里只负责展示与点读。
 */
export function Chapter({
  chapter,
  index,
  showTranslation = true,
  onWordSelect,
  className,
}: ChapterProps) {
  const speech = useSpeech();
  // null = 尚未交互，初始不高亮任何词（与 index.html 行为一致）
  const [selected, setSelected] = useState<{
    sentenceIndex: number;
    wordIndex: number;
  } | null>(null);

  const isOwner = speech.chapterId === chapter.id;
  const speakingKey =
    isOwner && speech.sentenceIndex !== null && speech.wordIndex !== null
      ? `${speech.sentenceIndex}-${speech.wordIndex}`
      : null;
  const selectedKey = selected
    ? `${selected.sentenceIndex}-${selected.wordIndex}`
    : null;
  // 全文朗读期间只显示跟读高亮，避免之前点选的词在别处一直亮着造成两个高亮
  const highlightedKey =
    speakingKey ?? (speech.status === 'idle' ? selectedKey : null);

  const handleTokenClick = useCallback(
    (word: WordEntry, wordIndex: number, sentenceIndex: number) => {
      setSelected({ sentenceIndex, wordIndex });
      onWordSelect?.(word, wordIndex, sentenceIndex);
      speech.speakWord(chapter.id, sentenceIndex, wordIndex, word.word);
    },
    [chapter.id, onWordSelect, speech],
  );

  const heading = chapter.heading;

  return (
    <section
      className={className}
      data-chapter-id={chapter.id}
      aria-label={index ? `第 ${index} 段` : undefined}
    >
      {heading && (
        <header className="mb-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <button
              type="button"
              title={`播放 ${heading.word.word}`}
              aria-label={wordAriaLabel(heading.word)}
              aria-current={highlightedKey === HEADING_KEY ? 'true' : undefined}
              onClick={() =>
                handleTokenClick(
                  heading.word,
                  HEADING_POSITION,
                  HEADING_POSITION,
                )
              }
              className={[
                '-mx-1 cursor-pointer rounded-[5px] border-0 bg-transparent px-1 py-0.5 transition',
                highlightedKey === HEADING_KEY ? activeClass : idleClass,
              ].join(' ')}
            >
              <span
                className="text-[20px] font-bold"
                style={{ fontFamily: WORD_FONT }}
              >
                {heading.word.word}
              </span>
            </button>
            <span
              className="text-[11px] text-[#7b8580]"
              style={{ fontFamily: PHONETIC_FONT }}
            >
              {heading.word.phonetic}
            </span>
            <span className="text-[12px] text-[#69736d]">
              {heading.word.meaning}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-[1.7] text-[#26342d]">
            {heading.translation}
          </p>
        </header>
      )}

      <div className="space-y-4">
        {chapter.sentences.map((sentence, sentenceIndex) => (
          <div key={sentence.id}>
            <div className="flex flex-wrap items-end gap-x-1 gap-y-2.5">
              {sentence.words.map((word, wordIndex) => {
                const active =
                  highlightedKey === `${sentenceIndex}-${wordIndex}`;

                if (word.kind === 'link') {
                  return (
                    <a
                      key={`${sentence.id}-${wordIndex}-${word.word}`}
                      href={word.word}
                      target="_blank"
                      rel="noreferrer"
                      title={`打开 ${word.word}`}
                      aria-label={wordAriaLabel(word)}
                      className={`${tokenClass} hover:bg-[#e8f3ed]`}
                    >
                      <span aria-hidden="true" />
                      <span
                        className="text-[15px] leading-none text-[#176b48] underline decoration-dotted underline-offset-[5px]"
                        style={{ fontFamily: PHONETIC_FONT }}
                      >
                        {word.word}
                      </span>
                    </a>
                  );
                }

                // 标点/代码类符号：与词同样式但不拦截点击，保持句子阅读连贯
                if (!isSpeakable(word)) {
                  return (
                    <span
                      key={`${sentence.id}-${wordIndex}-${word.word}`}
                      className={tokenBase}
                    >
                      <span aria-hidden="true" />
                      <span
                        className="text-[19px] leading-none whitespace-nowrap sm:text-[20px]"
                        style={{ fontFamily: WORD_FONT }}
                      >
                        {word.word}
                      </span>
                    </span>
                  );
                }

                return (
                  <button
                    key={`${sentence.id}-${wordIndex}-${word.word}`}
                    type="button"
                    title={`播放 ${cleanWord(word.word)}`}
                    aria-label={wordAriaLabel(word)}
                    aria-current={active ? 'true' : undefined}
                    onClick={() =>
                      handleTokenClick(word, wordIndex, sentenceIndex)
                    }
                    className={[
                      tokenClass,
                      active ? activeClass : idleClass,
                    ].join(' ')}
                  >
                    <span
                      className="text-[10px] leading-none whitespace-nowrap text-[#7b8580]"
                      style={{ fontFamily: PHONETIC_FONT }}
                    >
                      {word.phonetic}
                    </span>
                    <span
                      className="text-[19px] leading-none whitespace-nowrap sm:text-[20px]"
                      style={{ fontFamily: WORD_FONT }}
                    >
                      {word.word}
                    </span>
                  </button>
                );
              })}
            </div>

            {showTranslation && sentence.translation && (
              <p className="m-0 text-[15px] leading-[1.75] text-[#26342d] sm:text-[16px]">
                {sentence.translation}
              </p>
            )}

            {sentence.code && (
              <pre className="mt-3 overflow-x-auto rounded-md border border-[#dfe4e1] bg-[#f7faf8] px-3.5 py-3 font-mono text-[13px] leading-[1.7] text-[#26342d]">
                {sentence.code}
              </pre>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
