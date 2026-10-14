import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, type Book } from "./api";
import { ErrorNote, LoadState, message, useResource } from "./shared";
export default function Books() {
  const { data, setData, error, reload } = useResource<Book[]>("/books");
  const [name, setName] = useState("");
  const [edit, setEdit] = useState<number>();
  const [rename, setRename] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setFailure("");
    try {
      const book = await api<Book>("/books", "POST", { name: name.trim() });
      navigate(`/books/${book.id}`);
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function update(book: Book) {
    if (!rename.trim()) return;
    setBusy(true);
    setFailure("");
    try {
      const next = await api<Book>(`/books/${book.id}`, "PUT", {
        name: rename.trim(),
      });
      setData(data?.map((b) => (b.id === next.id ? next : b)));
      setEdit(undefined);
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(book: Book) {
    if (
      !window.confirm(
        `删除“${book.name}”？将一并永久删除 ${book.articleCount} 篇文章。`,
      )
    )
      return;
    setBusy(true);
    setFailure("");
    try {
      await api(`/books/${book.id}`, "DELETE");
      setData(data?.filter((b) => b.id !== book.id));
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <p className="eyebrow">YOUR READING SHELF</p>
        <h1>我的书籍</h1>
        <p className="muted">把想读的文字留在这里，慢慢理解，轻声跟读。</p>
      </header>
      <form className="inline-form" onSubmit={create}>
        <label>
          书籍名称
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：Go Web 入门"
          />
        </label>
        <button className="primary" disabled={busy || !name.trim()}>
          新建书籍
        </button>
      </form>
      <ErrorNote error={failure} />
      {!data ? (
        <LoadState error={error} retry={reload} />
      ) : data.length === 0 ? (
        <div className="empty">
          <h2>书架还是空的</h2>
          <p>填写书名，创建你的第一本学习材料。</p>
        </div>
      ) : (
        <div className="book-list">
          {data.map((book, i) => (
            <section className="book-row" key={book.id}>
              <span className="number">{String(i + 1).padStart(2, "0")}</span>
              <div>
                {edit === book.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void update(book);
                    }}
                  >
                    <label>
                      新的书籍名称
                      <input
                        autoFocus
                        required
                        value={rename}
                        onChange={(e) => setRename(e.target.value)}
                      />
                    </label>
                    <div className="actions">
                      <button disabled={busy || !rename.trim()}>
                        保存名称
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEdit(undefined)}
                      >
                        取消
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2>
                      <Link to={`/books/${book.id}`}>{book.name}</Link>
                    </h2>
                    <p className="muted">{book.articleCount} 篇单元文章</p>
                  </>
                )}
              </div>
              <div className="actions">
                <button
                  disabled={busy}
                  onClick={() => {
                    setEdit(book.id);
                    setRename(book.name);
                  }}
                >
                  重命名
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => remove(book)}
                >
                  删除
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
