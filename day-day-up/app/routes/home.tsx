import { useState } from 'react';

import type { Route } from './+types/home';
import {
  ArticleControls,
  Chapter,
  SpeechProvider,
  WordDetailBar,
} from '../components';
import type { WordSelection } from '../components';
import { sampleArticle } from '../data/sample-article';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'WordFlow · 英文精读翻译' },
    { name: 'description', content: '逐词音标 + 中文翻译的英文精读阅读器' },
  ];
}

export default function Home() {
  return (
    <SpeechProvider>
      <ArticleView />
    </SpeechProvider>
  );
}

/** 文章页：每个段落复用 <Chapter />，共用一条底部词详情栏 */
function ArticleView() {
  const [selection, setSelection] = useState<WordSelection | null>(() => {
    const first = sampleArticle[0];
    const word = first?.sentences[0]?.words[0];
    return first && word
      ? {
          chapterId: first.id,
          sentenceIndex: 0,
          wordIndex: 0,
          word,
        }
      : null;
  });

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto w-full max-w-[1440px]">
        <section
          aria-label="逐词精读"
          className="flex min-h-[calc(100vh-120px)] flex-col"
        >
          <ArticleControls
            article={sampleArticle}
            className="sticky top-0 z-20"
          />
          <div className="flex-1 space-y-10 px-5 py-5 sm:px-8">
            {sampleArticle.map((chapter, i) => (
              <Chapter
                key={chapter.id}
                chapter={chapter}
                index={i + 1}
                onWordSelect={(word, wordIndex, sentenceIndex) =>
                  setSelection({
                    chapterId: chapter.id,
                    sentenceIndex,
                    wordIndex,
                    word,
                  })
                }
              />
            ))}
          </div>
          <WordDetailBar
            selection={selection}
            className="sticky bottom-0 z-20"
          />
        </section>
      </main>
    </div>
  );
}
