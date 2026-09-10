import { useState } from 'react';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/home';
import {
  ArticleControls,
  Chapter,
  SpeechProvider,
  WordDetailBar,
} from '../components';
import type { WordSelection } from '../components';
import { sampleArticle } from '../data/sample-article';
import { highlightArticle } from '../lib/highlight.server';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'WordFlow · 英文精读翻译' },
    { name: 'description', content: '逐词音标 + 中文翻译的英文精读阅读器' },
  ];
}

/**
 * 代码高亮放在服务端做：Shiki 只在 loader 里运行，
 * 客户端拿到的是高亮好的 HTML，且不会把任何语法包打进客户端 bundle。
 */
export async function loader() {
  return { codeHtml: await highlightArticle(sampleArticle) };
}

export default function Home() {
  const { codeHtml } = useLoaderData<typeof loader>();

  return (
    <SpeechProvider>
      <ArticleView codeHtml={codeHtml} />
    </SpeechProvider>
  );
}

/** 文章页：每个段落复用 <Chapter />，共用一条底部词详情栏 */
function ArticleView({ codeHtml }: { codeHtml: Record<string, string> }) {
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
                codeHtml={codeHtml}
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
