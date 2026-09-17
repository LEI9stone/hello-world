import Chapter from '~/components/Chapter';
import type { Route } from './+types/home';
import styles from './home.module.scss';
import Controls from '~/components/Controls';
import MockArticle from '~/data/go-language';
import { highlightArticle } from '~/server/highlight.server';
import { useLoaderData } from 'react-router';
import { useState } from 'react';
import { SpeechProvider } from '~/context/SpeechProvider';
import WordDetailBar from '~/components/WordDetailBar';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '日拱一卒' },
    { name: 'description', content: '好好学习，日拱一卒。生命不息，学习不止' },
  ];
}
export async function loader() {
  return { codeHtml: await highlightArticle(MockArticle) };
}

export default function Home() {
  const { codeHtml } = useLoaderData<typeof loader>();
  const [selection, setSelection] = useState<Chapter.WordSelection | null>(
    () => {
      const first = MockArticle[0];
      const word = first?.paragraphs[0]?.sentences[0]?.words[0];
      return first && word
        ? {
            chapterId: first.id,
            sentenceIndex: 0,
            wordIndex: 0,
            word,
          }
        : null;
    },
  );

  return (
    <SpeechProvider>
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.reader}>
            <Controls article={MockArticle} className={styles.controls} />
            <div className={styles.chapters}>
              {MockArticle.map((chapter) => (
                <Chapter
                  codeHtml={codeHtml}
                  key={chapter.id}
                  chapter={chapter}
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
            <WordDetailBar selection={selection} />
          </section>
        </main>
      </div>
    </SpeechProvider>
  );
}
