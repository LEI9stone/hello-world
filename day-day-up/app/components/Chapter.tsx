import { Fragment, useCallback, useState } from 'react';

import { useSpeech } from './speech-context';
import { cleanWord, isSpeakable, wordAriaLabel } from './speech-utils';
import { HEADING_POSITION } from './types';
import type { ChapterData, WordEntry } from './types';

import './Chapter.css';

export interface ChapterProps {
  /** 章节数据（章节内可含多个自然段） */
  chapter: ChapterData;
  /** 章节序号（从 1 开始），用于生成 aria-label，可选 */
  index?: number;
  /** 是否显示各句的中文翻译，默认 true */
  showTranslation?: boolean;
  /** 点击单词/章节标题时回调，用于驱动文章级词详情栏 */
  onWordSelect?: (
    word: WordEntry,
    wordIndex: number,
    sentenceIndex: number,
  ) => void;
  /**
   * 服务端高亮好的代码块 HTML，key 为 sentence.id（由 loader 生成）。
   * 缺省时该句的代码块按纯文本渲染。
   */
  codeHtml?: Record<string, string>;
  /** 外层 className 扩展 */
  className?: string;
}

const WORD_FONT = "Georgia, 'Times New Roman', serif";
const PHONETIC_FONT = "'Arial Unicode MS', Arial, sans-serif";

const tokenBase = 'chapter-token';
const tokenClass = `${tokenBase} chapter-token--interactive`;

const activeClass = 'chapter-token--active';
const idleClass = 'chapter-token--idle';

/** 章节标题在 (sentenceIndex, wordIndex) 上的定位键 */
const HEADING_KEY = `${HEADING_POSITION}-${HEADING_POSITION}`;

/**
 * 章节组件：章节标题（可点读）+ 自然段内逐句的「词流 + 中文翻译」。
 *
 * 朗读控制（朗读全文 / 暂停 / 语速）在文章级 <ArticleControls /> 上，
 * 朗读状态由 <SpeechProvider> 统一持有，这里只负责展示与点读。
 */
export function Chapter({
  chapter,
  index,
  showTranslation = true,
  onWordSelect,
  codeHtml,
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

  let sentenceOffset = 0;
  const paragraphsWithOffsets = chapter.paragraphs.map((paragraph) => {
    const entry = { paragraph, sentenceOffset };
    sentenceOffset += paragraph.sentences.length;
    return entry;
  });

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
      className={['chapter', className].filter(Boolean).join(' ')}
      data-chapter-id={chapter.id}
      aria-label={index ? `第 ${index} 章` : undefined}
    >
      {heading && (
        <header className="chapter__header">
          <div className="chapter__heading-row">
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
                'chapter__heading-button',
                highlightedKey === HEADING_KEY ? activeClass : idleClass,
              ].join(' ')}
            >
              <span
                className="chapter__heading-word"
                style={{ fontFamily: WORD_FONT }}
              >
                {heading.word.word}
              </span>
            </button>
            <span
              className="chapter__heading-phonetic"
              style={{ fontFamily: PHONETIC_FONT }}
            >
              {heading.word.phonetic}
            </span>
            <span className="chapter__heading-meaning">
              {heading.word.meaning}
            </span>
          </div>
          <p className="chapter__heading-translation">{heading.translation}</p>
        </header>
      )}

      <div className="chapter__paragraphs">
        {paragraphsWithOffsets.map(({ paragraph, sentenceOffset }) => (
          <div key={paragraph.id} className="chapter__paragraph">
            <div className="chapter__sentence-flow">
              {paragraph.sentences.map((sentence, localSentenceIndex) => {
                const sentenceIndex = sentenceOffset + localSentenceIndex;
                return (
                  <span key={sentence.id}>
                    <span>
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
                              className={`${tokenClass} chapter-token--link`}
                            >
                              <span aria-hidden="true" />
                              <span
                                className="chapter-token__link-text"
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
                                className="chapter-token__word"
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
                              className="chapter-token__phonetic"
                              style={{ fontFamily: PHONETIC_FONT }}
                            >
                              {word.phonetic}
                            </span>
                            <span
                              className="chapter-token__word"
                              style={{ fontFamily: WORD_FONT }}
                            >
                              {word.word}
                            </span>
                          </button>
                        );
                      })}
                    </span>
                    {localSentenceIndex < paragraph.sentences.length - 1 && (
                      <span aria-hidden="true"> </span>
                    )}
                  </span>
                );
              })}
            </div>
            {(showTranslation ||
              paragraph.sentences.some((sentence) => sentence.code)) && (
              <div className="chapter__details">
                {paragraph.sentences.map((sentence) => (
                  <Fragment key={`${sentence.id}-details`}>
                    {showTranslation && sentence.translation && (
                      <span>{sentence.translation}</span>
                    )}

                    {sentence.code && (
                      <div className="chapter__code-block">
                        {codeHtml?.[sentence.id] ? (
                          // eslint-disable-next-line react/no-danger -- 内容来自服务端 Shiki，代码在渲染前已转义
                          <div
                            dangerouslySetInnerHTML={{
                              __html: codeHtml[sentence.id],
                            }}
                          />
                        ) : (
                          <pre className="chapter__code-pre">
                            {sentence.code}
                          </pre>
                        )}
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
