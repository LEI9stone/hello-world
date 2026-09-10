import { useSpeech } from "./speech-context";
import type { WordSelection } from "./types";

export interface WordDetailBarProps {
  /** 当前选中的词；null 时展示空态 */
  selection: WordSelection | null;
  /** 外层 className 扩展 */
  className?: string;
}

/**
 * 文章级词详情栏：整篇文章共用一个，固定在阅读面板底部。
 * 点击喇叭用 Samantha · en-US 重播当前词，并让对应 Chapter 的该词保持高亮。
 */
export function WordDetailBar({ selection, className }: WordDetailBarProps) {
  const speech = useSpeech();
  const word = selection?.word ?? null;
  const isSpeaking =
    selection !== null &&
    speech.chapterId === selection.chapterId &&
    speech.sentenceIndex === selection.sentenceIndex &&
    speech.wordIndex === selection.wordIndex &&
    speech.status === "playing";

  return (
    <div
      aria-live="polite"
      className={[
        "flex min-h-[78px] items-center justify-between gap-4",
        "border-t border-[#dfe4e1] bg-[#f7faf8] px-5 py-3.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {word && selection ? (
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            type="button"
            title="播放当前单词"
            className={[
              "grid h-9 w-9 flex-none cursor-pointer place-items-center rounded-full",
              "border-0 bg-[#e8f3ed] text-[#0f5036] transition",
              "hover:bg-[#d7e9df] disabled:cursor-not-allowed disabled:opacity-45",
            ].join(" ")}
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
            <span className="sr-only">播放 {word.word}</span>
          </button>
          <div className="min-w-0">
            <div className="truncate">
              <span
                className="mr-2 text-[18px] font-bold"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {word.word}
              </span>
              <span className="text-[12px] text-[#176b48]">
                {word.phonetic}
              </span>
            </div>
            <div className="mt-1 truncate text-[12px] text-[#69736d]">
              {word.meaning}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[12px] text-[#69736d]">点击上方单词查看释义</div>
      )}

      <div
        className={[
          "min-w-[76px] text-right text-[11px]",
          isSpeaking ? "font-bold text-[#176b48]" : "text-[#69736d]",
        ].join(" ")}
      >
        {isSpeaking ? "正在播放" : "点击单词发音"}
      </div>
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[17px] w-[17px] fill-current"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4Zm12.4-.9a1 1 0 0 0-1.4 1.4 3.5 3.5 0 0 1 0 5 1 1 0 0 0 1.4 1.4 5.5 5.5 0 0 0 0-7.8Zm2.8-2.8a1 1 0 1 0-1.4 1.4 7.5 7.5 0 0 1 0 10.6 1 1 0 1 0 1.4 1.4 9.5 9.5 0 0 0 0-13.4Z" />
    </svg>
  );
}
