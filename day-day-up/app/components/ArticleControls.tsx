import { useMemo } from 'react';

import { useSpeech } from './speech-context';
import { HEADING_POSITION, SPEECH_RATES } from './types';
import type { ChapterData, SpeechRate } from './types';

import './ArticleControls.css';

export interface ArticleControlsProps {
  /** 全文数据：点「朗读全文」时按章节、自然段和句子连续朗读 */
  article: readonly ChapterData[];
  /** 外层 className 扩展 */
  className?: string;
}

const toolButtonClass = 'article-controls__tool-button';

function segmentClass(active: boolean): string {
  return [
    'article-controls__rate-option',
    active ? 'article-controls__rate-option--active' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * 文章级朗读工具栏：朗读全文 / 暂停·继续 / 语速 + 当前朗读进度。
 *
 * 固定在阅读面板顶部，长文朗读时可以随时暂停，不用滚回页面开头。
 */
export function ArticleControls({ article, className }: ArticleControlsProps) {
  const speech = useSpeech();
  const isPlaying = speech.status === 'playing';
  const isPaused = speech.status === 'paused';

  return (
    <div className={['article-controls', className].filter(Boolean).join(' ')}>
      <div className="article-controls__row">
        <div className="article-controls__actions">
          <button
            type="button"
            className={toolButtonClass}
            title="从头连续朗读全篇"
            disabled={speech.supported !== true}
            onClick={() => speech.playArticle(article)}
          >
            <PlayIcon />
            <span>朗读全文</span>
          </button>
          <button
            type="button"
            className={toolButtonClass}
            title={isPaused ? '从暂停处继续' : '暂停朗读'}
            disabled={speech.supported !== true || (!isPlaying && !isPaused)}
            onClick={() => (isPaused ? speech.resume() : speech.pause())}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
            <span>{isPaused ? '继续' : '暂停'}</span>
          </button>
        </div>

        <div className="article-controls__rate">
          <span className="article-controls__rate-label">语速</span>
          <div className="article-controls__rate-options">
            {SPEECH_RATES.map((value: SpeechRate) => (
              <button
                key={value}
                type="button"
                className={segmentClass(speech.rate === value)}
                aria-pressed={speech.rate === value}
                onClick={() => speech.setRate(value)}
              >
                {value}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {speech.supported === false && (
        <p className="article-controls__message" role="status">
          当前浏览器不支持系统语音，朗读功能不可用
        </p>
      )}

      {speech.error && (
        <p className="article-controls__message" role="status">
          {speech.error.message}
        </p>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="article-controls__icon"
    >
      <path d="M8 5.6v12.8c0 .8.9 1.3 1.6.8l9.2-6.4a1 1 0 0 0 0-1.6L9.6 4.8A1 1 0 0 0 8 5.6Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="article-controls__icon"
    >
      <path d="M7 5.5h3.4v13H7zM13.6 5.5H17v13h-3.4z" />
    </svg>
  );
}
