import clsx from 'clsx';
import styles from './index.module.scss';
import { Fragment } from 'react/jsx-runtime';
import { isSpeakable } from './speech-utils';
interface ChapterProps {
  /** 是否显示各句子的中文翻译，默认true */
  showTranslation?: boolean;
  /** 点击单个单词时发音回调 */
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
}: ChapterProps) {
  const heading = chapter?.heading;
  let sentenceOffset = 0;
  const paragraphsWithOffsets = chapter?.paragraphs?.map((paragraph) => {
    const entry = { paragraph, sentenceOffset };
    sentenceOffset += paragraph.sentences.length;
    return entry;
  });
  return (
    <section className={className}>
      {heading && (
        <header className={styles.header}>
          <div className={styles['header-row']}>
            <button type="button" className={styles['header-button']}>
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
                  return (
                    <div key={sentence.id} className={styles.sentence}>
                      <div>
                        {sentence.words.map((word, wordIndex) => {
                          if (word.kind === 'link') {
                            return (
                              <a
                                href={word.word}
                                key={`${word.word}-${wordIndex}`}
                                target="_blank"
                                rel="noreferrer"
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
                                className={clsx(
                                  styles.token,
                                  styles['token--interactive'],
                                )}
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
                              className={clsx(
                                styles.token,
                                styles['token--interactive'],
                                styles['token--idle'],
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
