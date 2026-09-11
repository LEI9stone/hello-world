import { useMemo } from 'react';

import { useSpeech } from './speech-context';
import { HEADING_POSITION, SPEECH_RATES } from './types';
import type { ChapterData, SpeechRate } from './types';

export interface ArticleControlsProps {
  /** 全文数据：点「朗读全文」时按章节、自然段和句子连续朗读 */
  article: readonly ChapterData[];
  /** 外层 className 扩展 */
  className?: string;
}

const toolButtonClass = [
  'inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md',
  'border border-[#dfe4e1] bg-white px-2.5 text-[12px] font-semibold text-[#314139]',
  'transition hover:border-[#a8c5b5] hover:text-[#176b48]',
  'disabled:cursor-not-allowed disabled:opacity-45',
  'disabled:hover:border-[#dfe4e1] disabled:hover:text-[#314139]',
].join(' ');

function segmentClass(active: boolean): string {
  return [
    'h-[22px] w-[38px] cursor-pointer rounded-[4px] border-0 text-[11px] font-bold transition',
    active
      ? 'bg-white text-[#0f5036] shadow-[0_1px_4px_rgba(24,42,32,0.12)]'
      : 'bg-transparent text-[#69736d] hover:text-[#0f5036]',
  ].join(' ');
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

  const progress = useMemo(
    () => describeProgress(article, speech.chapterId, speech.sentenceIndex),
    [article, speech.chapterId, speech.sentenceIndex],
  );

  return (
    <div
      className={[
        'border-b border-[#ecefed] bg-[#fafbfa] px-4 py-2 sm:px-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
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

          {/* {progress && (
            <span
              className={[
                "text-[11px]",
                isPlaying ? "text-[#176b48]" : "text-[#69736d]",
              ].join(" ")}
              role="status"
            >
              {isPaused ? "已暂停" : "正在朗读"} · {progress}
            </span>
          )} */}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#69736d]">语速</span>
          <div className="flex rounded-md bg-[#edf0ee] p-[3px]">
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
        <p className="mt-1 text-[11px] text-[#a15c07]" role="status">
          当前浏览器不支持系统语音，朗读功能不可用
        </p>
      )}

      {speech.error && (
        <p className="mt-1 text-[11px] text-[#a15c07]" role="status">
          {speech.error.message}
        </p>
      )}
    </div>
  );
}

/** 把「当前朗读到哪个段/哪一句」转成可读文案 */
function describeProgress(
  article: readonly ChapterData[],
  chapterId: string | null,
  sentenceIndex: number | null,
): string | null {
  if (!chapterId) return null;
  const index = article.findIndex((chapter) => chapter.id === chapterId);
  if (index < 0) return null;

  const parts = [`第 ${index + 1} 章`];
  if (sentenceIndex === HEADING_POSITION) parts.push('标题');
  else if (sentenceIndex !== null && sentenceIndex >= 0) {
    parts.push(`第 ${sentenceIndex + 1} 句`);
  }
  return parts.join(' · ');
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[15px] w-[15px] fill-current"
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
      className="h-[15px] w-[15px] fill-current"
    >
      <path d="M7 5.5h3.4v13H7zM13.6 5.5H17v13h-3.4z" />
    </svg>
  );
}
