import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, type Article, type Book } from "./api";
import { ErrorNote, LoadState, message, useResource } from "./shared";
import { usePlayer } from "./player";

type IconName =
  | "play"
  | "repeat"
  | "eye"
  | "eye-off"
  | "pause"
  | "stop"
  | "retry"
  | "chevron"
  | "sliders"
  | "more"
  | "file-plus"
  | "pencil"
  | "trash";

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "play" && <path d="M6 3l14 9-14 9V3z" />}
      {name === "repeat" && (
        <>
          <path d="m17 2 4 4-4 4" />
          <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
          <path d="m7 22-4-4 4-4" />
          <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </>
      )}
      {name === "eye" && (
        <>
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
      {name === "eye-off" && (
        <>
          <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
          <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
          <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
          <path d="m2 2 20 20" />
        </>
      )}
      {name === "pause" && (
        <>
          <rect x="14" y="4" width="4" height="16" rx="1" />
          <rect x="6" y="4" width="4" height="16" rx="1" />
        </>
      )}
      {name === "stop" && <rect x="5" y="5" width="14" height="14" rx="1.5" />}
      {name === "retry" && (
        <>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </>
      )}
      {name === "chevron" && <path d="m6 9 6 6 6-6" />}
      {name === "sliders" && (
        <>
          <line x1="21" x2="14" y1="4" y2="4" />
          <line x1="10" x2="3" y1="4" y2="4" />
          <line x1="21" x2="12" y1="12" y2="12" />
          <line x1="8" x2="3" y1="12" y2="12" />
          <line x1="21" x2="16" y1="20" y2="20" />
          <line x1="12" x2="3" y1="20" y2="20" />
          <line x1="14" x2="14" y1="2" y2="6" />
          <line x1="8" x2="8" y1="10" y2="14" />
          <line x1="16" x2="16" y1="18" y2="22" />
        </>
      )}
      {name === "more" && (
        <>
          <circle cx="6" cy="12" r="1.4" fill="currentColor" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
          <circle cx="18" cy="12" r="1.4" fill="currentColor" />
        </>
      )}
      {name === "file-plus" && (
        <>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M9 15h6" />
          <path d="M12 18v-6" />
        </>
      )}
      {name === "pencil" && (
        <>
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
          <path d="m15 5 4 4" />
        </>
      )}
      {name === "trash" && (
        <>
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </>
      )}
    </svg>
  );
}

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
// 只有支持悬停的设备让鼠标移入展开音频设置；触屏改用点击切换。
const hoverable = () => window.matchMedia("(hover: hover)").matches;

function Reading({ article }: { article: Article }) {
  const navigate = useNavigate();
  const [chinese, setChinese] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
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
  async function removeArticle() {
    const label = article.title.zh || article.title.en;
    if (!window.confirm(`永久删除文章“${label}”？`)) return;
    player.stop();
    setBusy(true);
    setActionError("");
    try {
      await api(`/articles/${article.id}`, "DELETE");
      navigate("/");
    } catch (e) {
      setActionError(message(e));
      setBusy(false);
    }
  }
  const unavailable = !player.voices.length;
  return (
    <div className="reader-page">
      <BookContents article={article} stop={player.stop} />
      <div className="reading-layout">
      <div className="reading" ref={reading}>
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
      <aside className="player" aria-label="朗读与文章操作">
        <div
          className="audio-control"
          onMouseEnter={() => {
            if (hoverable()) setSettingsOpen(true);
          }}
          onMouseLeave={(e) => {
            if (!hoverable()) return;
            if (!e.currentTarget.contains(document.activeElement))
              setSettingsOpen(false);
          }}
          onFocus={() => {
            if (hoverable()) setSettingsOpen(true);
          }}
          onBlur={(e) => {
            if (!hoverable()) return;
            if (!e.currentTarget.contains(e.relatedTarget)) setSettingsOpen(false);
          }}
        >
          <button
            type="button"
            className="icon-button"
            aria-label="音频设置"
            title="音频设置"
            aria-expanded={settingsOpen}
            aria-controls="audio-settings"
            onClick={() => {
              if (!hoverable()) setSettingsOpen(!settingsOpen);
            }}
          >
            <Icon name="sliders" />
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
                {!player.voices.length && (
                  <option value="">暂无可用音色</option>
                )}
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
        </div>
        {(player.voicesError || player.error) && (
          <div className="player-notices">
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
          </div>
        )}
        <div className="play-buttons">
          <button
            className={`icon-button${!player.loop ? " primary" : ""}`}
            disabled={unavailable}
            aria-label="单次播放"
            title="单次播放"
            aria-pressed={!player.loop}
            onClick={player.playOnce}
          >
            <Icon name="play" />
          </button>
          <button
            className={`icon-button${player.loop ? " primary" : ""}`}
            disabled={unavailable}
            aria-label="循环播放"
            title="循环播放"
            aria-pressed={player.loop}
            onClick={player.playLoop}
          >
            <Icon name="repeat" />
          </button>
          <button
            className="icon-button"
            aria-label={chinese ? "隐藏译文" : "显示译文"}
            title={chinese ? "隐藏译文" : "显示译文"}
            aria-pressed={chinese}
            onClick={() => setChinese(!chinese)}
          >
            <Icon name={chinese ? "eye" : "eye-off"} />
          </button>
          {player.status === "playing" ? (
            <button
              className="icon-button primary"
              aria-label="暂停"
              title="暂停"
              onClick={player.pause}
            >
              <Icon name="pause" />
            </button>
          ) : player.status === "paused" ? (
            <button
              className="icon-button primary"
              disabled={unavailable}
              aria-label="继续"
              title="继续"
              onClick={player.resume}
            >
              <Icon name="play" />
            </button>
          ) : player.status === "error" ? (
            <button
              className="icon-button"
              disabled={unavailable}
              aria-label="从当前段重试"
              title="从当前段重试"
              onClick={player.retry}
            >
              <Icon name="retry" />
            </button>
          ) : null}
          <button
            className="icon-button"
            disabled={player.status === "idle"}
            aria-label="停止"
            title="停止"
            onClick={player.stop}
          >
            <Icon name="stop" />
          </button>
        </div>
        <div className="article-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="文章操作"
            title="文章操作"
            aria-expanded={actionsOpen}
            aria-controls="article-actions"
            onClick={() => setActionsOpen(!actionsOpen)}
          >
            <Icon name="more" />
          </button>
          <div
            id="article-actions"
            className="article-actions-panel"
            hidden={!actionsOpen}
          >
            <div className="actions">
              <Link
                className="button icon-button"
                to={`/books/${article.bookId}/new`}
                aria-label="新增文章"
                title="新增文章"
                onClick={() => player.stop()}
              >
                <Icon name="file-plus" />
              </Link>
              <Link
                className="button icon-button"
                to={`/articles/${article.id}/edit`}
                aria-label="编辑文章"
                title="编辑文章"
                onClick={() => player.stop()}
              >
                <Icon name="pencil" />
              </Link>
              <button
                className="icon-button danger"
                disabled={busy}
                aria-label="删除文章"
                title="删除文章"
                onClick={removeArticle}
              >
                <Icon name="trash" />
              </button>
            </div>
            <ErrorNote error={actionError} />
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}
