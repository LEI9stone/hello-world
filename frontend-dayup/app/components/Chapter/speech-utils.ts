/** 是否为可朗读的词（链接、符号等特殊 token 不朗读） */
export function isSpeakable(word: Chapter.WordEntry): boolean {
  return (word.kind ?? 'word') === 'word';
}
