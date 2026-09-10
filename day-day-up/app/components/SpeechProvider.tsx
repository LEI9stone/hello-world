import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { SpeechContext } from './speech-context';
import type {
  SpeechContextValue,
  SpeechError,
  SpeechStatus,
} from './speech-context';
import {
  buildArticleQueue,
  cleanWord,
  pickEnglishVoice,
  VOICE_LANG,
  wordIndexAt,
} from './speech-utils';
import type { SpeechStep } from './speech-utils';
import { SPEECH_RATES } from './types';
import type { ChapterData, SpeechRate } from './types';

interface SpeechProviderProps {
  children: ReactNode;
  /** 初始语速，默认 1 */
  initialRate?: SpeechRate;
}

/**
 * 文章级朗读上下文。
 *
 * 整个页面只保留一个朗读实例：点 B 段朗读会自动取消 A 段，
 * 各段落的 Chapter 通过比较 chapterId 判断按钮状态，无需互相通信。
 */
export function SpeechProvider({
  children,
  initialRate = 1,
}: SpeechProviderProps) {
  // SSR 与客户端首帧都渲染 false，避免 hydration 不一致；探测放到 effect 里。
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [sentenceIndex, setSentenceIndex] = useState<number | null>(null);
  const [wordIndex, setWordIndex] = useState<number | null>(null);
  const [rate, setRateState] = useState<SpeechRate>(initialRate);
  const [error, setError] = useState<SpeechError | null>(null);

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const rateRef = useRef<SpeechRate>(initialRate);
  const queueRef = useRef<SpeechStep[]>([]);
  /** 当前正在朗读的步骤下标，暂停后从这里继续 */
  const cursorRef = useRef(0);
  const chapterIdRef = useRef<string | null>(null);
  const statusRef = useRef<SpeechStatus>('idle');
  /** 每次打断 +1，旧的 utterance 回调据此失效 */
  const tokenRef = useRef(0);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  /** 回到 idle 并清空播放上下文 */
  const resetState = useCallback(() => {
    queueRef.current = [];
    cursorRef.current = 0;
    chapterIdRef.current = null;
    statusRef.current = 'idle';
    setChapterId(null);
    setSentenceIndex(null);
    setWordIndex(null);
    setStatus('idle');
  }, []);

  /** 探测支持情况 + 固定 Samantha · en-US 音色 */
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const synth = window.speechSynthesis;
    const loadVoice = () => {
      voiceRef.current = pickEnglishVoice(synth.getVoices());
    };
    loadVoice();
    synth.addEventListener('voiceschanged', loadVoice);
    return () => {
      synth.removeEventListener('voiceschanged', loadVoice);
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    const handleUnload = () => cancelSpeech();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [cancelSpeech]);

  /** 播放队列第 cursor 步；到末尾自动收尾 */
  const runQueue = useCallback(
    (cursor: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      const queue = queueRef.current;
      if (cursor >= queue.length) {
        resetState();
        return;
      }

      const step = queue[cursor];
      const token = tokenRef.current;
      const utterance = new SpeechSynthesisUtterance(step.text);
      utterance.lang = voiceRef.current?.lang || VOICE_LANG;
      utterance.rate = rateRef.current;
      if (voiceRef.current) utterance.voice = voiceRef.current;

      utterance.onstart = () => {
        if (token !== tokenRef.current) return;
        cursorRef.current = cursor;
        chapterIdRef.current = step.chapterId;
        statusRef.current = 'playing';
        setChapterId(step.chapterId);
        setSentenceIndex(step.sentenceIndex);
        setWordIndex(step.wordIndex);
        setStatus('playing');
      };
      utterance.onend = () => {
        if (token !== tokenRef.current) return;
        runQueue(cursor + 1);
      };
      // 整句朗读时跟随 TTS 的 boundary 事件高亮当前词
      utterance.onboundary = (event) => {
        if (token !== tokenRef.current) return;
        const current = wordIndexAt(step, event.charIndex);
        if (current !== null) setWordIndex(current);
      };
      utterance.onerror = (event) => {
        if (token !== tokenRef.current) return;
        const error = event.error;
        if (error === 'canceled' || error === 'interrupted') return;
        setError({
          chapterId: step.chapterId,
          message: '系统语音播放失败，请重试',
        });
        resetState();
      };

      window.speechSynthesis.speak(utterance);
    },
    [resetState],
  );

  const playArticle = useCallback(
    (article: readonly ChapterData[]) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      const queue = buildArticleQueue(article);
      if (queue.length === 0) return;

      tokenRef.current += 1;
      window.speechSynthesis.cancel();
      setError(null);
      queueRef.current = queue;
      cursorRef.current = 0;
      chapterIdRef.current = queue[0].chapterId;
      statusRef.current = 'playing';
      setChapterId(queue[0].chapterId);
      setSentenceIndex(queue[0].sentenceIndex);
      setWordIndex(queue[0].wordIndex);
      setStatus('playing');
      runQueue(0);
    },
    [runQueue],
  );

  const speakWord = useCallback(
    (
      ownerId: string,
      ownerSentence: number,
      ownerWord: number,
      text: string,
    ) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      const cleaned = cleanWord(text) || text.trim();
      if (!cleaned) return;

      tokenRef.current += 1;
      window.speechSynthesis.cancel();
      setError(null);
      queueRef.current = [
        {
          chapterId: ownerId,
          sentenceIndex: ownerSentence,
          wordIndex: ownerWord,
          text: cleaned,
          wordOffsets: [],
        },
      ];
      cursorRef.current = 0;
      chapterIdRef.current = ownerId;
      statusRef.current = 'playing';
      setChapterId(ownerId);
      setSentenceIndex(ownerSentence);
      setWordIndex(ownerWord);
      setStatus('playing');
      runQueue(0);
    },
    [runQueue],
  );

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    tokenRef.current += 1;
    cancelSpeech();
    statusRef.current = 'paused';
    setStatus('paused');
  }, [cancelSpeech]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    if (!chapterIdRef.current) return;
    tokenRef.current += 1;
    cancelSpeech();
    statusRef.current = 'playing';
    setStatus('playing');
    runQueue(cursorRef.current);
  }, [cancelSpeech, runQueue]);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    cancelSpeech();
    setError(null);
    resetState();
  }, [cancelSpeech, resetState]);

  const setRate = useCallback(
    (next: SpeechRate) => {
      if (!SPEECH_RATES.includes(next)) return;
      const unchanged = rateRef.current === next;
      rateRef.current = next;
      setRateState(next);
      if (unchanged) return; // 语速没变就不打断当前朗读
      // 朗读中以新语速从当前词继续
      if (statusRef.current === 'playing' && chapterIdRef.current) {
        tokenRef.current += 1;
        cancelSpeech();
        runQueue(cursorRef.current);
      }
    },
    [cancelSpeech, runQueue],
  );

  const value = useMemo<SpeechContextValue>(
    () => ({
      supported,
      status,
      chapterId,
      sentenceIndex,
      wordIndex,
      rate,
      error,
      setRate,
      playArticle,
      speakWord,
      pause,
      resume,
      stop,
    }),
    [
      supported,
      status,
      chapterId,
      sentenceIndex,
      wordIndex,
      rate,
      error,
      setRate,
      playArticle,
      speakWord,
      pause,
      resume,
      stop,
    ],
  );

  return (
    <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
  );
}
