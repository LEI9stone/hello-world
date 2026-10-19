import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import type { Article } from "./api";
import { LoadState, useResource } from "./shared";
import { usePlayer } from "./player";
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
  const player = usePlayer({
    articleId: article.id,
    count: 1 + article.segments.length,
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
  const labels = {
    idle: "待播放",
    playing: "播放中",
    paused: "已暂停",
    ended: "已结束",
    error: "播放失败",
  };
  const unavailable = !player.voices.length;
  return (
    <div className="reading-layout">
      <div className="reading" ref={reading}>
        <div className="reading-nav">
          <Link to={`/books/${article.bookId}`}>返回书籍 /</Link>
          <Link
            to={`/articles/${article.id}/edit`}
            onClick={() => player.stop()}
          >
            编辑文章
          </Link>
        </div>
        <p className="eyebrow">{article.unitName}</p>
        <header
          className={`reading-block ${player.current === 0 ? "active" : ""}`}
        >
          <span className="play-marker">
            {player.current === 0 ? "当前朗读 · 标题" : "文章标题"}
          </span>
          <h1 className="serif" lang="en">
            {article.title.en}
          </h1>
          {chinese && (
            <p className="translation title-translation">{article.title.zh}</p>
          )}
        </header>
        {article.segments.map((s, i) => (
          <section
            key={s.id ?? i}
            className={`reading-block ${player.current === i + 1 ? "active" : ""}`}
          >
            <span className="play-marker">
              {player.current === i + 1 ? "当前朗读 · " : ""}
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="english" lang="en">
              {s.en}
            </p>
            {chinese && <p className="translation">{s.zh}</p>}
          </section>
        ))}
        <p className="reading-end">本篇完 · 让理解先于速度</p>
      </div>
      <aside className="player" aria-label="全文朗读控制">
        <p className="eyebrow">LISTEN & FOLLOW</p>
        <h2>聆听与跟读</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={chinese}
            onChange={(e) => setChinese(e.target.checked)}
          />
          显示全部中文
        </label>
        <hr />
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
        {player.voicesError ? (
          <p className="notice" role="alert">
            {player.voicesError}
          </p>
        ) : player.voicesLoading ? (
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
        <label>
          播放方式
          <select
            value={player.loop ? "loop" : "once"}
            onChange={(e) => player.setLoop(e.target.value === "loop")}
          >
            <option value="once">单次全文</option>
            <option value="loop">循环全文</option>
          </select>
        </label>
        <div className="play-status" role="status">
          <strong>{labels[player.status]}</strong>
          <p>
            {player.current < 0
              ? "英语标题 → 全部英语正文"
              : player.current === 0
                ? "标题"
                : `正文第 ${player.current} / ${article.segments.length} 段`}
          </p>
        </div>
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
        <p className="player-hint">
          保存文章时已用默认音色预生成整篇；切换到其他音色后按需即时生成。
        </p>
        <p className="player-hint">
          语速即时生效。可切到后台或息屏继续播放，锁屏与通知栏会显示媒体控制条。
        </p>
      </aside>
    </div>
  );
}
