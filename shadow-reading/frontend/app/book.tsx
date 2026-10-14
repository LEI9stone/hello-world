import { useState } from "react";
import { Link, useParams } from "react-router";
import { api, type Article, type Book } from "./api";
import { ErrorNote, LoadState, message, useResource } from "./shared";
export default function BookPage() {
  const { bookId } = useParams();
  const { data, setData, error, reload } = useResource<{
    book: Book;
    articles: Article[];
  }>(`/books/${bookId}`);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  async function move(index: number, delta: number) {
    if (!data) return;
    const articles = [...data.articles];
    [articles[index], articles[index + delta]] = [
      articles[index + delta],
      articles[index],
    ];
    setBusy(true);
    setFailure("");
    try {
      await api(`/books/${bookId}/order`, "PUT", {
        articleIds: articles.map((a) => a.id),
      });
      setData({ ...data, articles });
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(article: Article) {
    if (!data || !window.confirm(`永久删除文章“${article.title.zh}”？`)) return;
    setBusy(true);
    setFailure("");
    try {
      await api(`/articles/${article.id}`, "DELETE");
      setData({
        ...data,
        articles: data.articles.filter((a) => a.id !== article.id),
      });
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <>
        <Link to="/">返回书籍列表</Link>
        <LoadState error={error} retry={reload} />
      </>
    );
  return (
    <>
      <Link className="back" to="/">
        书籍列表 /
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">BOOK COLLECTION</p>
          <h1>{data.book.name}</h1>
          <p className="muted">
            {data.articles.length} 篇文章 · 按你的节奏阅读
          </p>
        </div>
        <Link className="button primary" to={`/books/${bookId}/new`}>
          新增文章
        </Link>
      </header>
      <ErrorNote error={failure} />
      {data.articles.length === 0 ? (
        <div className="empty">
          <h2>从第一篇文章开始</h2>
          <p>粘贴中英双语原文，核对配对后保存。</p>
          <Link className="button" to={`/books/${bookId}/new`}>
            添加第一篇单元文章
          </Link>
        </div>
      ) : (
        data.articles.map((a, i) => (
          <section className="article-row" key={a.id}>
            <span className="number">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="eyebrow">{a.unitName}</p>
              <h2 className="serif">
                <Link to={`/articles/${a.id}`}>{a.title.en}</Link>
              </h2>
              <p>{a.title.zh}</p>
            </div>
            <div className="actions">
              <button
                disabled={busy || i === 0}
                aria-label={`上移 ${a.unitName}`}
                onClick={() => move(i, -1)}
              >
                上移
              </button>
              <button
                disabled={busy || i === data.articles.length - 1}
                aria-label={`下移 ${a.unitName}`}
                onClick={() => move(i, 1)}
              >
                下移
              </button>
              <Link to={`/articles/${a.id}/edit`}>编辑</Link>
              <button
                className="danger"
                disabled={busy}
                onClick={() => remove(a)}
              >
                删除
              </button>
            </div>
          </section>
        ))
      )}
    </>
  );
}
