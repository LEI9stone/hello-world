import Chapter from '~/components/Chapter';
import type { Route } from './+types/home';
import styles from './home.module.scss';
import Controls from '~/components/Controls';
import MockArticle from '~/data/go-language';
import { highlightArticle } from '~/server/highlight.server';
import { useLoaderData } from 'react-router';

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
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.reader}>
          <Controls className={styles.controls} />
          <div className={styles.chapters}>
            {MockArticle.map((chapter) => (
              <Chapter codeHtml={codeHtml} key={chapter.id} chapter={chapter} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
