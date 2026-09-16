import clsx from 'clsx';
import styles from './index.module.scss';
import { Fragment } from 'react/jsx-runtime';
interface ChapterProps {
  /** 是否显示各句子的中文翻译，默认true */
  showTranslation?: boolean;
  /** 点击单个单词时发音回调 */
  onWordSelect?: () => void;
  className?: string;
  /**
   * 服务端高亮好的代码块 HTML，key 为 sentence.id（由 loader 生成）。
   * 缺省时该句的代码块按纯文本渲染。
   */
  codeHtml?: Record<string, string>;
  /** 文章数据 */
  chapter?: any;
}
export default function Chapter({ className }: ChapterProps) {
  return (
    <section className={className}>
      <header className={styles.header}>
        <div className={styles['header-row']}>
          <button type="button" className={styles['header-button']}>
            <span className={styles['heading-word']}>Introduction</span>
          </button>
          <span className={styles['phonetic']}>/ˌɪntrəˈdʌʃn/</span>
          <span className={styles['heading-meaning']}>n. 引言；简介</span>
        </div>
        <p className={styles['heading-translation']}>简介</p>
      </header>
      <div className={styles.paragraphs}>
        <div className={styles.paragraph}>
          <div className={styles.flow}>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/ðɪs/</span>
              <span className={styles.word}>This</span>
            </button>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/ɪz/</span>
              <span className={styles.word}>is</span>
            </button>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/ðə/</span>
              <span className={styles.word}>the</span>
            </button>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/ˈrefrəns/</span>
              <span className={styles.word}>reference</span>
            </button>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/ˈmænjuəl/</span>
              <span className={styles.word}>manual</span>
            </button>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/fɔːr/</span>
              <span className={styles.word}>for</span>
            </button>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/ðə/</span>
              <span className={styles.word}>the</span>
            </button>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/ɡoʊ/</span>
              <span className={styles.word}>Go</span>
            </button>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/ˈproʊɡræmɪŋ/</span>
              <span className={styles.word}>programming</span>
            </button>
            <button
              className={clsx(
                styles.token,
                styles['token--interactive'],
                styles['token--idle'],
              )}
            >
              <span className={styles.phonetic}>/ˈlæŋɡwɪdʒ/</span>
              <span className={styles.word}>language.</span>
            </button>
          </div>
          <div className={styles.details}>
            <Fragment>
              <span>这是Go编程语言的参考手册。</span>
            </Fragment>
          </div>
        </div>
      </div>
    </section>
  );
}
