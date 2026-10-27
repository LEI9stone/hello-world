import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { Link, useParams } from "react-router";
import type { Article, Book } from "./api";
import { LoadState, useResource } from "./shared";
import { usePlayer } from "./player";

// 句中出现的代码术语渲染成行内等宽：只认带点限定名、含 / 的路径、含下划线的标识符。
const TERM =
  /(^|[^A-Za-z0-9_])((?:[A-Za-z_][A-Za-z0-9_]{1,}(?:\.[A-Za-z_][A-Za-z0-9_]{1,})+)|(?:[A-Za-z_][A-Za-z0-9_]*(?:\/[A-Za-z0-9_.\-]+)+)|(?:[A-Za-z_][A-Za-z0-9_]*_[A-Za-z0-9_]+))/g;

function Inline({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TERM)) {
    const at = (match.index ?? 0) + match[1].length;
    if (at > last) nodes.push(text.slice(last, at));
    nodes.push(
      <code key={at} className="inline-code">
        {match[2]}
      </code>,
    );
    last = at + match[2].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

// 目录里显示的文章标题：优先英文，其次中文。
function articleTitle(article: Article): string {
  return article.title.en || article.title.zh || "未命名文章";
}

// 表格段保存的是 Markdown 源码：按行切单元，首行作表头，分隔行跳过，其余作数据行。
function tableRows(source: string): string[][] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split("|");
      if (cells.length && cells[0].trim() === "") cells.shift();
      if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
      return cells.map((cell) => cell.trim());
    });
}

function Table({ source }: { source: string }) {
  const rows = tableRows(source);
  if (!rows.length) return null;
  const [head, , ...body] = rows;
  return (
    <div className="table-scroll">
      <table className="md-table">
        <thead>
          <tr>
            {head.map((cell, i) => (
              <th key={i}>
                <Inline text={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>
                  <Inline text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookContents({
  article,
  stop,
}: {
  article: Article;
  stop: () => void;
}) {
  const { data, error, reload } = useResource<{
    book: Book;
    articles: Article[];
  }>(`/books/${article.bookId}`);
  const [open, setOpen] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 801px)");
    const sync = () => setOpen(wide.matches);
    sync();
    wide.addEventListener("change", sync);
    return () => wide.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!open) return;
    const container = scroll.current;
    const current = container?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (!container || !current) return;
    const bounds = container.getBoundingClientRect();
    const item = current.getBoundingClientRect();
    if (item.top < bounds.top || item.bottom > bounds.bottom) {
      container.scrollTop += item.top - bounds.top - bounds.height / 2 + item.height / 2;
    }
  }, [data, article.id, open]);
  const groups: { name: string; articles: Article[] }[] = [];
  data?.articles.forEach((entry) => {
    let group = groups[groups.length - 1];
    if (!group || group.name !== entry.unitName) {
      group = { name: entry.unitName, articles: [] };
      groups.push(group);
    }
    group.articles.push(entry);
  });
  // 单元标题与文章标题同名时只显示一次：有其它条目就隐去重复条目，
  // 全是同名条目时隐去单元标题，保留可点击的文章行。
  const rendered = groups.map((group) => {
    const name = group.name.trim();
    const distinct = name
      ? group.articles.filter((entry) => articleTitle(entry).trim() !== name)
      : group.articles;
    return {
      group,
      showUnit: Boolean(name) && distinct.length > 0,
      items: distinct.length ? distinct : group.articles,
    };
  });
  function toggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const expanded = window.matchMedia("(min-width: 801px)").matches || event.currentTarget.open;
    event.currentTarget.open = expanded;
    setOpen(expanded);
  }
  return (
    <aside className="book-contents" aria-label="书籍目录">
      <div className="contents-heading">
        <Link className="contents-home" to="/" onClick={stop}>
          <span aria-hidden="true">←</span> 返回首页
        </Link>
        {data && <p className="contents-book-name">{data.book.name}</p>}
      </div>
      <details className="contents-details" open={open} onToggle={toggle}>
        <summary>
          本书目录
          <span>{article.title.en || article.title.zh || "未命名文章"}</span>
        </summary>
        <div className="contents-scroll" ref={scroll}>
          <nav aria-label="本书目录">
            <p className="contents-label">本书目录</p>
            {!data ? (
              <LoadState error={error} retry={reload} />
            ) : !data.articles.length ? (
              <p className="muted">本书暂无文章</p>
            ) : (
              <ul className="contents-groups">
                {rendered.map(({ group, showUnit, items }, index) => (
                  <li key={index}>
                    {showUnit && <p className="contents-unit">{group.name}</p>}
                    <ol
                      className={
                        showUnit
                          ? "contents-articles grouped"
                          : "contents-articles"
                      }
                    >
                      {items.map((entry) => (
                        <li key={entry.id}>
                          <Link
                            to={`/articles/${entry.id}`}
                            aria-current={entry.id === article.id ? "page" : undefined}
                            onClick={(event) => {
                              if (entry.id === article.id) event.preventDefault();
                              else stop();
                            }}
                          >
                            <span>{articleTitle(entry)}</span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </div>
      </details>
    </aside>
  );
}

export default function Reader() {
  const { articleId } = useParams();
  const { data, error, reload } = useResource<Article>(
    `/articles/${articleId}`,
  );
  if (!data)
    return (
      <>
        <Link to="/">返回书籍列表</Link>
        <LoadState error={error} retry={reload} />
      </>
    );
  return <Reading key={data.id} article={data} />;
}
function Reading({ article }: { article: Article }) {
  const [chinese, setChinese] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const player = usePlayer({
    articleId: article.id,
    count: 1 + article.segments.length,
    readable: [
      true,
      ...article.segments.map((s) => s.kind !== "code" && s.kind !== "table"),
    ],
    title: article.title.en,
    subtitle: article.title.zh,
    album: article.unitName,
  });
  const reading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (player.status !== "playing" || player.current < 0) return;
    reading.current?.querySelector(".reading-block.active")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [player.current, player.status, chinese]);
  const unavailable = !player.voices.length;
  return (
    <div className="reader-page">
      <BookContents article={article} stop={player.stop} />
      <div className="reading-layout">
      <div className="reading" ref={reading}>
        <div className="reading-nav">
          <Link
            to={`/articles/${article.id}/edit`}
            onClick={() => player.stop()}
          >
            编辑文章
          </Link>
        </div>
        <header
          className={`reading-block ${player.current === 0 ? "active" : ""}`}
          aria-current={player.current === 0 ? "true" : undefined}
        >
          <h1 className="serif" lang="en">
            <Inline text={article.title.en} />
          </h1>
          {chinese && article.title.zh && (
            <p className="translation title-translation">
              <Inline text={article.title.zh} />
            </p>
          )}
        </header>
        {article.segments.map((s, i) => (
          <section
            key={s.id ?? i}
            className={`reading-block ${player.current === i + 1 ? "active" : ""}`}
            aria-current={player.current === i + 1 ? "true" : undefined}
          >
            {s.kind === "code" ? (
              // 代码段始终显示，不受「隐藏译文」影响。
              <pre className="code" lang="en">{s.en}</pre>
            ) : s.kind === "table" ? (
              // 表格段始终显示，渲染成真正的表格。
              <Table source={s.en} />
            ) : (
              <>
                <p className="english" lang="en">
                  <Inline text={s.en} />
                </p>
                {chinese && (
                  <p className="translation">
                    <Inline text={s.zh} />
                  </p>
                )}
              </>
            )}
          </section>
        ))}
        <p className="reading-end">本篇完 · 让理解先于速度</p>
      </div>
      <aside className="player" aria-label="全文朗读控制">
        <button
          type="button"
          className="settings-toggle"
          aria-expanded={settingsOpen}
          aria-controls="audio-settings"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <span>音频设置</span>
          <span aria-hidden="true">{settingsOpen ? "收起" : "展开"}</span>
        </button>
        <div
          id="audio-settings"
          className="audio-settings"
          hidden={!settingsOpen}
        >
          <label>
            英语音色
            <select
              disabled={unavailable}
              value={player.voice}
              onChange={(e) => player.configure(e.target.value, player.rate)}
            >
              {!player.voices.length && <option value="">暂无可用音色</option>}
              {player.voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                  {player.total > 0 &&
                    (v.ready >= player.total
                      ? "（已生成）"
                      : `（${v.ready}/${player.total}）`)}
                </option>
              ))}
            </select>
          </label>
          {player.voicesLoading ? (
            <p role="status">正在加载音色…</p>
          ) : player.total > 0 ? (
            <p className="player-hint" role="status">
              {player.readySegments >= player.total
                ? `该音色已生成全部 ${player.total} 段，可直接播放。`
                : `该音色已生成 ${player.readySegments} / ${player.total} 段，未生成的段落播放时自动补齐。`}
            </p>
          ) : null}
          <label>
            语速 · {player.rate.toFixed(2)} 倍
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={player.rate}
              onChange={(e) =>
                player.configure(player.voice, Number(e.target.value))
              }
            />
          </label>
        </div>
        {player.voicesError && (
          <p className="notice" role="alert">
            {player.voicesError}
          </p>
        )}
        {player.error && (
          <p className="notice" role="alert">
            {player.error}
          </p>
        )}
        <div className="play-buttons">
          <button
            className={!player.loop ? "primary" : ""}
            disabled={unavailable}
            aria-pressed={!player.loop}
            onClick={player.playOnce}
          >
            单次播放
          </button>
          <button
            className={player.loop ? "primary" : ""}
            disabled={unavailable}
            aria-pressed={player.loop}
            onClick={player.playLoop}
          >
            循环播放
          </button>
          <button aria-pressed={!chinese} onClick={() => setChinese(!chinese)}>
            {chinese ? "隐藏译文" : "显示译文"}
          </button>
          {player.status === "playing" ? (
            <button className="primary" onClick={player.pause}>
              暂停
            </button>
          ) : player.status === "paused" ? (
            <button
              className="primary"
              disabled={unavailable}
              onClick={player.resume}
            >
              继续
            </button>
          ) : player.status === "error" ? (
            <button disabled={unavailable} onClick={player.retry}>
              从当前段重试
            </button>
          ) : null}
          <button disabled={player.status === "idle"} onClick={player.stop}>
            停止
          </button>
        </div>
      </aside>
      </div>
    </div>
  );
}
