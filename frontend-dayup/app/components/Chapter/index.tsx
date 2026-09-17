import clsx from 'clsx';
import styles from './index.module.scss';
import { Fragment, useCallback, useState } from 'react';
import { useSpeech } from '~/context/speech-context';
import { HEADING_POSITION } from '~/context/speech-types';
import { cleanWord, isSpeakable, wordAriaLabel } from '~/context/speech-utils';

const HEADING_KEY = `${HEADING_POSITION}-${HEADING_POSITION}`;

interface ChapterProps {
  /** 是否显示各句子的中文翻译，默认true */
  showTranslation?: boolean;
  /** 点击单词或标题时回调，用于更新词详情栏。 */
  onWordSelect?: (
    word: Chapter.WordEntry,
    wordIndex: number,
    sentenceIndex: number,
  ) => void;
  className?: string;
  /**
   * 服务端高亮好的代码块 HTML，key 为 sentence.id（由 loader 生成）。
   * 缺省时该句的代码块按纯文本渲染。
   */
  codeHtml?: Record<string, string>;
  /** 文章数据 */
  chapter?: Chapter.Data;
}
export default function Chapter({
  chapter,
  showTranslation = true,
  className,
  codeHtml,
  onWordSelect,
}: ChapterProps) {
  const speech = useSpeech();
  const [selected, setSelected] = useState<{
    sentenceIndex: number;
    wordIndex: number;
  } | null>(null);
  const isOwner = speech.chapterId === chapter?.id;
  const speakingKey =
    isOwner && speech.sentenceIndex !== null && speech.wordIndex !== null
      ? `${speech.sentenceIndex}-${speech.wordIndex}`
      : null;
  const selectedKey = selected
    ? `${selected.sentenceIndex}-${selected.wordIndex}`
    : null;
  // 播放或暂停时只显示当前朗读位置，空闲时恢复点选高亮。
  const highlightedKey =
    speakingKey ?? (speech.status === 'idle' ? selectedKey : null);

  const handleTokenClick = useCallback(
    (word: Chapter.WordEntry, wordIndex: number, sentenceIndex: number) => {
      if (!chapter) return;
      setSelected({ sentenceIndex, wordIndex });
      onWordSelect?.(word, wordIndex, sentenceIndex);
      speech.speakWord(chapter.id, sentenceIndex, wordIndex, word.word);
    },
    [chapter, onWordSelect, speech],
  );

  const heading = chapter?.heading;
  let sentenceOffset = 0;
  const paragraphsWithOffsets = chapter?.paragraphs?.map((paragraph) => {
    const entry = { paragraph, sentenceOffset };
    sentenceOffset += paragraph.sentences.length;
    return entry;
  });
  return (
    <section className={className} data-chapter-id={chapter?.id}>
      {heading && (
        <header className={styles.header}>
          <div className={styles['header-row']}>
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
              className={clsx(
                styles['header-button'],
                styles[
                  highlightedKey === HEADING_KEY
                    ? 'token--active'
                    : 'token--idle'
                ],
              )}
            >
              <span className={styles['heading-word']}>
                {heading.word.word}
              </span>
            </button>
            <span className={styles['phonetic']}>{heading.word.phonetic}</span>
            <span className={styles['heading-meaning']}>
              {heading.word.meaning}
            </span>
          </div>
          <p className={styles['heading-translation']}>{heading.translation}</p>
        </header>
      )}
      <div className={styles.paragraphs}>
        {paragraphsWithOffsets?.map(({ paragraph, sentenceOffset }) => {
          return (
            <div key={paragraph.id} className={styles.paragraph}>
              <div className={styles.flow}>
                {paragraph.sentences.map((sentence, localSentenceIndex) => {
                  const sentenceIndex = sentenceOffset + localSentenceIndex;
                  return (
                    <div key={sentence.id} className={styles.sentence}>
                      <div>
                        {sentence.words.map((word, wordIndex) => {
                          const active =
                            highlightedKey === `${sentenceIndex}-${wordIndex}`;
                          if (word.kind === 'link') {
                            return (
                              <a
                                href={word.word}
                                key={`${word.word}-${wordIndex}`}
                                target="_blank"
                                rel="noreferrer"
                                title={`打开 ${word.word}`}
                                aria-label={wordAriaLabel(word)}
                                className={clsx(
                                  styles.token,
                                  styles['token--interactive'],
                                  styles['token--link'],
                                )}
                              >
                                <span className={styles['link-text']}>
                                  {word.word}
                                </span>
                              </a>
                            );
                          }
                          // 标点/代码类符号：与词同样式但不拦截点击，保持句子阅读连贯
                          if (!isSpeakable(word)) {
                            return (
                              <span
                                key={`${word.word}-${wordIndex}`}
                                className={styles.token}
                              >
                                {/* 占位使用 */}
                                <span className={styles.phonetic} />
                                <span className={styles.word}>{word.word}</span>
                              </span>
                            );
                          }
                          return (
                            <button
                              key={`${word.word}-${wordIndex}`}
                              type="button"
                              title={`播放 ${cleanWord(word.word)}`}
                              aria-label={wordAriaLabel(word)}
                              aria-current={active ? 'true' : undefined}
                              onClick={() =>
                                handleTokenClick(word, wordIndex, sentenceIndex)
                              }
                              className={clsx(
                                styles.token,
                                styles['token--interactive'],
                                styles[
                                  active ? 'token--active' : 'token--idle'
                                ],
                              )}
                            >
                              <span className={styles.phonetic}>
                                {word.phonetic}
                              </span>
                              <span className={styles.word}>{word.word}</span>
                            </button>
                          );
                        })}
                      </div>
                      {(showTranslation || sentence.code) && (
                        <Fragment>
                          {showTranslation && sentence.translation && (
                            <span className={styles.details}>
                              {sentence.translation}
                            </span>
                          )}
                          {sentence.code && (
                            <div className={styles['code-block']}>
                              {codeHtml?.[sentence.id] ? (
                                // eslint-disable-next-line react/no-danger -- 内容来自服务端 Shiki，代码在渲染前已转义
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: codeHtml[sentence.id],
                                  }}
                                />
                              ) : (
                                <pre className={styles['code-pre']}>
                                  {sentence.code}
                                </pre>
                              )}
                            </div>
                          )}
                        </Fragment>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
