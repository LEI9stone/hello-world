import PlayIcon from '~/components/Icons/Play';
import PauseIcon from '~/components/Icons/Pause';
import styles from './index.module.scss';
import clsx from 'clsx';

/** 朗读语速档位 */
export type SpeechRate = 0.6 | 0.7 | 0.8 | 1 | 1.2;
/** 语速档位选项（控制条按此顺序渲染） */
export const SPEECH_RATES: readonly SpeechRate[] = [0.6, 0.7, 0.8, 1, 1.2];
interface PropsType {
  className?: string;
}
export default function Controls({ className }: PropsType) {
  return (
    <div className={clsx(styles.controls, className)}>
      <div className={styles.row}>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            title="从头连续朗读全篇"
          >
            <PlayIcon className={styles.icon} />
            <span>朗读全文</span>
          </button>
          <button type="button" className={styles.button} title="暂停/继续朗读">
            <PauseIcon className={styles.icon} />
            <span>暂停</span>
          </button>
        </div>
        <div className={styles.rate}>
          <span className={styles.label}>语速</span>
          <div className={styles.options}>
            {SPEECH_RATES.map((rate) => (
              <button key={rate} type="button" className={styles.option}>
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
