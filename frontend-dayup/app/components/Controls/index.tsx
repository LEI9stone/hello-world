import PlayIcon from '~/components/Icons/Play';
import PauseIcon from '~/components/Icons/Pause';
import styles from './index.module.scss';
import clsx from 'clsx';
import { useSpeech } from '~/context/speech-context';
import { SPEECH_RATES } from '~/context/speech-types';

interface PropsType {
  /** 点击“朗读全文”时从头播放的文章。 */
  article: readonly Chapter.Data[];
  className?: string;
}
export default function Controls({ article, className }: PropsType) {
  const speech = useSpeech();
  const isPlaying = speech.status === 'playing';
  const isPaused = speech.status === 'paused';

  return (
    <div className={clsx(styles.controls, className)}>
      <div className={styles.row}>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            title="从头连续朗读全篇"
            disabled={speech.supported !== true}
            onClick={() => speech.playArticle(article)}
          >
            <PlayIcon className={styles.icon} />
            <span>朗读全文</span>
          </button>
          <button
            type="button"
            className={styles.button}
            title={isPaused ? '从暂停处继续' : '暂停朗读'}
            disabled={speech.supported !== true || (!isPlaying && !isPaused)}
            onClick={() => (isPaused ? speech.resume() : speech.pause())}
          >
            {isPaused ? (
              <PlayIcon className={styles.icon} />
            ) : (
              <PauseIcon className={styles.icon} />
            )}
            <span>{isPaused ? '继续' : '暂停'}</span>
          </button>
        </div>
        <div className={styles.rate}>
          <span className={styles.label}>语速</span>
          <div className={styles.options}>
            {SPEECH_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                className={clsx(
                  styles.option,
                  speech.rate === rate && styles['option--active'],
                )}
                aria-pressed={speech.rate === rate}
                onClick={() => speech.setRate(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
      {speech.supported === false && (
        <p className={styles.message} role="status">
          当前浏览器不支持系统语音，朗读功能不可用
        </p>
      )}
      {speech.error && (
        <p className={styles.message} role="status">
          {speech.error.message}
        </p>
      )}
    </div>
  );
}
