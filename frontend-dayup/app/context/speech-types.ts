/** 朗读语速档位，默认 1x。 */
export type SpeechRate = 0.6 | 0.7 | 0.8 | 1 | 1.2;

/** 控制条与 Provider 共用的语速选项。 */
export const SPEECH_RATES: readonly SpeechRate[] = [0.6, 0.7, 0.8, 1, 1.2];

/** 标题使用同一个哨兵值作为句子下标与词下标。 */
export const HEADING_POSITION = -1;
