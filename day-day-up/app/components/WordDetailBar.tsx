import { Notification } from './Notification/Notification';
import { useSpeech } from './speech-context';
import type { WordSelection } from './types';

import './WordDetailBar.css';

export interface WordDetailBarProps {
  /** 当前选中的词；null 时展示空态 */
  selection: WordSelection | null;
  /** 外层 className 扩展 */
  className?: string;
}

/**
 * 文章级词详情栏：整篇文章共用一个，固定在阅读面板底部。
 * 点击喇叭用 Samantha · en-US 重播当前词，并让对应章节的该词保持高亮。
 */
export function WordDetailBar({ selection, className }: WordDetailBarProps) {
  const speech = useSpeech();
  const word = selection?.word ?? null;
  const isSpeaking =
    selection !== null &&
    speech.chapterId === selection.chapterId &&
    speech.sentenceIndex === selection.sentenceIndex &&
    speech.wordIndex === selection.wordIndex &&
    speech.status === 'playing';

  return (
    <Notification
      open
      placement="bottom"
      duration={false}
      closable={false}
      className="word-detail-bar-notification"
    >
      <div className={['word-detail-bar', className].filter(Boolean).join(' ')}>
        {word && selection ? (
          <div className="word-detail-bar__selection">
            <button
              type="button"
              title="播放当前单词"
              className="word-detail-bar__play-button"
              disabled={speech.supported !== true}
              onClick={() =>
                speech.speakWord(
                  selection.chapterId,
                  selection.sentenceIndex,
                  selection.wordIndex,
                  word.word,
                )
              }
            >
              <SpeakerIcon />
              <span className="word-detail-bar__sr-only">播放 {word.word}</span>
            </button>
            <div className="word-detail-bar__content">
              <div className="word-detail-bar__word-line">
                <span
                  className="word-detail-bar__word"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {word.word}
                </span>
                <span className="word-detail-bar__phonetic">
                  {word.phonetic}
                </span>
              </div>
              <div className="word-detail-bar__meaning">{word.meaning}</div>
            </div>
          </div>
        ) : (
          <div className="word-detail-bar__empty">点击上方单词查看释义</div>
        )}

        <div
          className={[
            'word-detail-bar__status',
            isSpeaking ? 'word-detail-bar__status--speaking' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isSpeaking ? '正在播放' : '点击单词发音'}
        </div>
      </div>
    </Notification>
  );
}

function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="word-detail-bar__speaker-icon"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4Zm12.4-.9a1 1 0 0 0-1.4 1.4 3.5 3.5 0 0 1 0 5 1 1 0 0 0 1.4 1.4 5.5 5.5 0 0 0 0-7.8Zm2.8-2.8a1 1 0 1 0-1.4 1.4 7.5 7.5 0 0 1 0 10.6 1 1 0 1 0 1.4 1.4 9.5 9.5 0 0 0 0-13.4Z" />
    </svg>
  );
}
