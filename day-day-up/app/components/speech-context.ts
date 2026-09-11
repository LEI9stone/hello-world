import { createContext, useContext } from 'react';

import type { ChapterData, SpeechRate } from './types';
/** idle=未朗读；playing=朗读中；paused=已暂停（可继续） */
export type SpeechStatus = 'idle' | 'playing' | 'paused';

/** 朗读失败信息 */
export interface SpeechError {
  /** 出错时所属章节 id，便于只在对应章节提示 */
  chapterId: string;
  message: string;
}

export interface SpeechContextValue {
  /**
   * 浏览器是否支持系统语音。
   * null = 尚未探测（SSR 首帧），此期间控制条按「不可用」样式渲染但不出提示。
   */
  supported: boolean | null;
  status: SpeechStatus;
  /** 当前正在朗读/暂停的章节 id，其它章节据此保持静默 */
  chapterId: string | null;
  /** 当前章节内展平后的句子下标（chapterId 为 null 时无意义） */
  sentenceIndex: number | null;
  /** 当前朗读到的词下标，-1 表示整句兜底（无对应词） */
  wordIndex: number | null;
  /** 全局语速档位 */
  rate: SpeechRate;
  /** 最近一次朗读失败的信息（含所属章节），成功后自动清除 */
  error: SpeechError | null;
  /** 切换语速；若正在朗读则以新语速从当前词继续 */
  setRate: (rate: SpeechRate) => void;
  /** 朗读全文：按章节、自然段和句子顺序连续朗读整篇文章 */
  playArticle: (article: readonly ChapterData[]) => void;
  /**
   * 只朗读某个词或章节标题。
   * 章节标题用 HEADING_POSITION 作为 sentenceIndex / wordIndex。
   */
  speakWord: (
    chapterId: string,
    sentenceIndex: number,
    wordIndex: number,
    text: string,
  ) => void;
  /** 暂停：取消当前 utterance，位置停在当前句 */
  pause: () => void;
  /** 继续：从当前句开头接着读 */
  resume: () => void;
  /** 停止并清空状态 */
  stop: () => void;
}

/**
 * 朗读上下文与读取钩子单独成文件：
 * SpeechProvider.tsx 只导出组件，文件改动才能走 React Fast Refresh，
 * 否则 Vite 会报 "Could not Fast Refresh (consistent-components-exports)"。
 */
export const SpeechContext = createContext<SpeechContextValue | null>(null);

/** 读取文章级朗读上下文；必须在 <SpeechProvider> 内使用 */
export function useSpeech(): SpeechContextValue {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error('useSpeech 必须在 <SpeechProvider> 内使用');
  }
  return context;
}
