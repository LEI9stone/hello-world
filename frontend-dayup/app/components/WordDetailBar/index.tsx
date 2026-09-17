import clsx from 'clsx';
import { useSpeech } from '~/context/speech-context';
import styles from './index.module.scss';

export interface WordDetailBarProps {
  /** 当前选中的词；null 时展示空态。 */
  selection: Chapter.WordSelection | null;
  className?: string;
}

/** 整篇文章共用的词详情栏，固定在视口底部。 */
export default function WordDetailBar({
  selection,
  className,
}: WordDetailBarProps) {
  const speech = useSpeech();
  const isSpeaking =
    selection !== null &&
    speech.chapterId === selection.chapterId &&
    speech.sentenceIndex === selection.sentenceIndex &&
    speech.wordIndex === selection.wordIndex &&
    speech.status === 'playing';

  return (
    <aside className={clsx(styles.bar, className)} aria-label="单词详情">
      {selection ? (
        <div className={styles.selection}>
          <button
            type="button"
            title="播放当前单词"
            aria-label={`播放 ${selection.word.word}`}
            className={styles['play-button']}
            disabled={speech.supported !== true}
            onClick={() =>
              speech.speakWord(
                selection.chapterId,
                selection.sentenceIndex,
                selection.wordIndex,
                selection.word.word,
              )
            }
          >
            <SpeakerIcon />
          </button>
          <div className={styles.content}>
            <div className={styles['word-line']}>
              <span className={styles.word}>{selection.word.word}</span>
              {selection.word.phonetic && (
                <span className={styles.phonetic}>
                  {selection.word.phonetic}
                </span>
              )}
            </div>
            {selection.word.meaning && (
              <div className={styles.meaning}>{selection.word.meaning}</div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.empty}>点击上方单词查看释义</div>
      )}

      <div
        className={clsx(
          styles.status,
          isSpeaking && styles['status--speaking'],
        )}
        role="status"
      >
        {isSpeaking ? '正在播放' : '点击单词发音'}
      </div>
    </aside>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M4 9v6h4l5 4V5L8 9H4Zm12.4-.9a1 1 0 0 0-1.4 1.4 3.5 3.5 0 0 1 0 5 1 1 0 0 0 1.4 1.4 5.5 5.5 0 0 0 0-7.8Zm2.8-2.8a1 1 0 1 0-1.4 1.4 7.5 7.5 0 0 1 0 10.6 1 1 0 1 0 1.4 1.4 9.5 9.5 0 0 0 0-13.4Z" />
    </svg>
  );
}
