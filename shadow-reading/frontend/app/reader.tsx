import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import type { Article } from "./api";
import { LoadState, useResource } from "./shared";
import { useSpeech } from "./speech";
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
  const speech = useSpeech([
    article.title.en,
    ...article.segments.map((s) => s.en),
  ]);
  const reading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (speech.status !== "playing" || speech.current < 0) return;
    reading.current?.querySelector(".reading-block.active")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [speech.current, speech.status, chinese]);
  const labels = {
    idle: "待播放",
    playing: "播放中",
    paused: "已暂停",
    ended: "已结束",
    error: "朗读失败",
  };
  const unavailable = speech.supported !== true || !speech.voices.length;
  return (
    <div className="reading-layout">
      <div className="reading" ref={reading}>
        <div className="reading-nav">
          <Link to={`/books/${article.bookId}`}>返回书籍 /</Link>
          <Link
            to={`/articles/${article.id}/edit`}
            onClick={() => speech.stop()}
          >
            编辑文章
          </Link>
        </div>
        <p className="eyebrow">{article.unitName}</p>
        <header
          className={`reading-block ${speech.current === 0 ? "active" : ""}`}
        >
          <span className="play-marker">
            {speech.current === 0 ? "当前朗读 · 标题" : "文章标题"}
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
            className={`reading-block ${speech.current === i + 1 ? "active" : ""}`}
          >
            <span className="play-marker">
              {speech.current === i + 1 ? "当前朗读 · " : ""}
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
            value={speech.voice}
            onChange={(e) => speech.configure(e.target.value, speech.rate)}
          >
            <option value="" disabled>
              请选择英语音色
            </option>
            {speech.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} · {v.lang}
              </option>
            ))}
          </select>
        </label>
        {speech.supported === false ? (
          <p className="notice">
            浏览器不支持语音合成，可继续阅读。请使用支持 speechSynthesis
            的浏览器。
          </p>
        ) : !speech.voices.length ? (
          <p role="status">
            {speech.loaded
              ? "没有可用英语音色，请检查浏览器或系统语音设置。"
              : "正在等待浏览器加载英语音色…"}
          </p>
        ) : null}
        <label>
          语速 · {speech.rate.toFixed(2)} 倍
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={speech.rate}
            onChange={(e) =>
              speech.configure(speech.voice, Number(e.target.value))
            }
          />
        </label>
        <label>
          播放方式
          <select
            value={speech.loop ? "loop" : "once"}
            onChange={(e) => speech.setLoop(e.target.value === "loop")}
          >
            <option value="once">单次全文</option>
            <option value="loop">循环全文</option>
          </select>
        </label>
        <div className="play-status" role="status">
          <strong>{labels[speech.status]}</strong>
          <p>
            {speech.current < 0
              ? "英语标题 → 全部英语正文"
              : speech.current === 0
                ? "标题"
                : `正文第 ${speech.current} / ${article.segments.length} 段`}
          </p>
        </div>
        {speech.error && (
          <p className="notice" role="alert">
            {speech.error}
          </p>
        )}
        <div className="play-buttons">
          <button
            className={!speech.loop ? "primary" : ""}
            disabled={unavailable}
            aria-pressed={!speech.loop}
            onClick={speech.playOnce}
          >
            单次播放
          </button>
          <button
            className={speech.loop ? "primary" : ""}
            disabled={unavailable}
            aria-pressed={speech.loop}
            onClick={speech.playLoop}
          >
            循环播放
          </button>
          <button aria-pressed={!chinese} onClick={() => setChinese(!chinese)}>
            {chinese ? "隐藏译文" : "显示译文"}
          </button>
          {speech.status === "playing" ? (
            <button className="primary" onClick={speech.pause}>
              暂停
            </button>
          ) : speech.status === "paused" ? (
            <button
              className="primary"
              disabled={unavailable}
              onClick={speech.resume}
            >
              继续
            </button>
          ) : speech.status === "error" ? (
            <button
              disabled={unavailable}
              onClick={speech.play}
            >
              从当前段重试
            </button>
          ) : null}
          <button disabled={speech.status === "idle"} onClick={speech.stop}>
            停止
          </button>
        </div>
        <p className="player-hint">
          更换音色或语速会从当前段开头重播。暂停时修改设置，继续后应用。
        </p>
        <p className="player-hint">
          切换到后台或息屏时，页面不会主动暂停。手机系统可能中断浏览器朗读，
          返回页面后会尝试恢复；当前音色模式无法保证持续息屏播放。
        </p>
      </aside>
    </div>
  );
}
