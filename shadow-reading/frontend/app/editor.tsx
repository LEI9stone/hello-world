import { useEffect, useRef, useState } from "react";
import {
  Link,
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useParams,
} from "react-router";
import {
  api,
  type Article,
  type ArticleInput,
  type ParseResult,
  type Segment,
} from "./api";
import { ErrorNote, message } from "./shared";
import { sample } from "./sample";
const blank = (): ArticleInput => ({
  unitName: "",
  title: { en: "", zh: "" },
  segments: [],
});
function LeavePrompt({
  busy,
  stay,
  leave,
}: {
  busy: boolean;
  stay: () => void;
  leave: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-title"
      onCancel={(e) => {
        e.preventDefault();
        stay();
      }}
    >
      <h2 id="leave-title">有尚未保存的内容</h2>
      <p>
        {busy
          ? "请求正在处理中，请等待完成。"
          : "离开将丢失本次编辑，确认离开吗？"}
      </p>
      <button autoFocus onClick={stay}>
        继续编辑
      </button>
      <button disabled={busy} className="danger" onClick={leave}>
        放弃并离开
      </button>
    </dialog>
  );
}
export default function Editor() {
  const { bookId, articleId } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ArticleInput>(blank);
  const [original, setOriginal] = useState("");
  const [source, setSourceValue] = useState("");
  const [sourceTouched, setSourceTouched] = useState(false);
  function setSource(value: string) {
    setSourceTouched(true);
    setSourceValue(value);
  }
  const [parsedSource, setParsedSource] = useState<string | null>(null);
  const [ready, setReady] = useState(!articleId);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [parent, setParent] = useState(bookId);
  const saved = useRef(false);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  useEffect(() => {
    if (!articleId) {
      setOriginal(JSON.stringify(blank()));
      return;
    }
    const controller = new AbortController();
    setReady(false);
    setLoadError("");
    api<Article>(`/articles/${articleId}`, "GET", undefined, controller.signal)
      .then((a) => {
        const value = {
          unitName: a.unitName,
          title: a.title,
          segments: a.segments,
        };
        setDraft(value);
        setOriginal(JSON.stringify(value));
        setParent(String(a.bookId));
        setPreview(true);
        setReady(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setLoadError(message(e));
      });
    return () => controller.abort();
  }, [articleId, retry]);
  const dirty =
    ready &&
    !saved.current &&
    (JSON.stringify(draft) !== original || source !== "");
  const blocker = useBlocker(() => !saved.current && (dirty || busy));
  useBeforeUnload((e) => {
    if (dirty || busy) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  function change(next: ArticleInput) {
    saved.current = false;
    setDraft(next);
  }
  function segment(index: number, patch: Partial<Segment>) {
    change({
      ...draft,
      segments: draft.segments.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      ),
    });
  }
  async function parse() {
    if (!source.trim()) return;
    if (
      preview &&
      !window.confirm(
        "重新解析将覆盖当前标题、正文和待处理内容，包括人工校正。继续吗？",
      )
    )
      return;
    const text = source;
    setBusy(true);
    setFailure("");
    try {
      const result = await api<ParseResult>("/parse", "POST", { text });
      if (sourceRef.current !== text) {
        setFailure("解析期间原文已改变，请重新解析。");
        return;
      }
      change({
        ...draft,
        title: result.title,
        segments: result.segments.map((s) => ({
          en: s.en,
          zh: s.zh,
          kind: s.kind,
        })),
      });
      setParsedSource(text);
      setPreview(true);
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (
      !preview ||
      (parsedSource !== null && source !== parsedSource) ||
      (sourceTouched && parsedSource === null)
    ) {
      setFailure("请重新解析原文后再保存。");
      return;
    }
    if (
      !draft.unitName.trim() ||
      !draft.title.en.trim() ||
      !draft.title.zh.trim() ||
      !draft.segments.length ||
      draft.segments.some(
        (s) => !s.en.trim() || (s.kind !== "code" && !s.zh.trim()),
      )
    ) {
      setFailure("请填写单元名称、双语标题及每段双语正文，正文至少一段。");
      return;
    }
    setBusy(true);
    setFailure("");
    try {
      const body = {
        unitName: draft.unitName.trim(),
        title: { en: draft.title.en.trim(), zh: draft.title.zh.trim() },
        segments: draft.segments.map((s) => ({
          id: s.id,
          kind: s.kind ?? "text",
          en: s.en.trim(),
          zh: s.zh.trim(),
        })),
      };
      const a = await api<Article>(
        articleId ? `/articles/${articleId}` : `/books/${parent}/articles`,
        articleId ? "PUT" : "POST",
        body,
      );
      saved.current = true;
      setBusy(false);
      setOriginal(JSON.stringify(draft));
      setSource("");
      navigate(`/articles/${a.id}`);
    } catch (e) {
      setFailure(message(e));
      setBusy(false);
    }
  }
  function move(i: number, d: number) {
    const segments = [...draft.segments];
    [segments[i], segments[i + d]] = [segments[i + d], segments[i]];
    change({ ...draft, segments });
  }
  function merge(i: number) {
    const segments = [...draft.segments];
    segments.splice(i, 2, {
      ...segments[i],
      en: segments[i].en + "\n" + segments[i + 1].en,
      zh: segments[i].zh + "\n" + segments[i + 1].zh,
    });
    change({ ...draft, segments });
  }
  function split(i: number) {
    const s = draft.segments[i];
    const code = s.kind === "code";
    const en = window.prompt(
      "请输入英语拆分位置（字符数，拆分点之前为第一段）",
      String(Math.floor(s.en.length / 2)),
    );
    if (en === null) return;
    let zh = "0";
    if (!code) {
      const value = window.prompt(
        "请输入中文拆分位置（字符数，拆分点之前为第一段）",
        String(Math.floor(s.zh.length / 2)),
      );
      if (value === null) return;
      zh = value;
    }
    const a = Number(en),
      b = Number(zh);
    if (
      !Number.isInteger(a) ||
      a <= 0 ||
      a >= s.en.length ||
      (!code && (!Number.isInteger(b) || b <= 0 || b >= s.zh.length))
    ) {
      setFailure("拆分位置必须是文本内部的整数。");
      return;
    }
    const segments = [...draft.segments];
    segments.splice(
      i,
      1,
      { ...s, en: s.en.slice(0, a), zh: s.zh.slice(0, b) },
      // 后半段不带原标识，代码段需要保留类型。
      { en: s.en.slice(a), zh: s.zh.slice(b), ...(code ? { kind: "code" as const } : {}) },
    );
    change({ ...draft, segments });
  }
  if (!ready)
    return (
      <>
        <p role={loadError ? "alert" : "status"}>
          {loadError || "正在加载文章…"}
        </p>
        {loadError && (
          <button onClick={() => setRetry((n) => n + 1)}>重新加载</button>
        )}
        <Link to="/">返回书籍列表</Link>
      </>
    );
  const stale =
    sourceTouched && (parsedSource === null || parsedSource !== source);
  return (
    <>
      <Link className="back" to={`/books/${parent}`}>
        返回书籍 /
      </Link>
      <header>
        <p className="eyebrow">PREPARE YOUR READING</p>
        <h1>{articleId ? "编辑文章" : "新增文章"}</h1>
        <p className="muted">粘贴、核对、校正。预览确认后，文章才会保存。</p>
      </header>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <label>
            单元名称
            <input
              required
              value={draft.unitName}
              onChange={(e) => change({ ...draft, unitName: e.target.value })}
              placeholder="例如：Unit 1"
            />
          </label>
          <section className="panel">
            <div className="section-heading">
              <h2>01 / 双语原文</h2>
              <button
                type="button"
                onClick={() => {
                  if (
                    source &&
                    !window.confirm("使用完整 Go 示例替换当前原文？")
                  )
                    return;
                  setSource(sample);
                }}
              >
                填入示例
              </button>
            </div>
            <label>
              英语在前，中文在后；每组之间空一行
              <textarea
                rows={10}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="英语标题\n中文标题\n\n第一段英语\n第一段中文"
              />
            </label>
            <button
              type="button"
              className="primary"
              disabled={!source.trim()}
              onClick={parse}
            >
              {busy ? "正在处理…" : "解析并预览"}
            </button>
            {stale && (
              <p className="notice" role="status">
                原文尚未解析或已改变，预览不能保存，请重新解析。
              </p>
            )}
          </section>
          {preview && (
            <section className="panel">
              <div className="section-heading">
                <h2>02 / 核对配对</h2>
                <span>{draft.segments.length} 组正文</span>
              </div>
              <div className="pair">
                <label>
                  英语标题
                  <textarea
                    required
                    lang="en"
                    value={draft.title.en}
                    onChange={(e) =>
                      change({
                        ...draft,
                        title: { ...draft.title, en: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  中文标题
                  <textarea
                    required
                    value={draft.title.zh}
                    onChange={(e) =>
                      change({
                        ...draft,
                        title: { ...draft.title, zh: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  change({
                    ...draft,
                    title: { en: "", zh: "" },
                    segments: [{ ...draft.title }, ...draft.segments],
                  })
                }
              >
                将标题转为首段正文
              </button>
              {draft.segments.map((s, i) => {
                const code = s.kind === "code";
                return (
                  <section className="segment-edit" key={i}>
                    <div className="section-heading">
                      <div className="segment-title">
                        <h3>正文 {i + 1}</h3>
                        {code && <span className="kind-tag">代码</span>}
                      </div>
                      <div className="actions">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                        >
                          上移
                        </button>
                        <button
                          type="button"
                          disabled={i === draft.segments.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          下移
                        </button>
                        {!code && (
                          <button
                            type="button"
                            disabled={i === draft.segments.length - 1}
                            onClick={() => merge(i)}
                          >
                            合并下一段
                          </button>
                        )}
                        <button type="button" onClick={() => split(i)}>
                          拆分
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            if (window.confirm(`删除正文第 ${i + 1} 组？`))
                              change({
                                ...draft,
                                segments: draft.segments.filter(
                                  (_, j) => j !== i,
                                ),
                              });
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    {code ? (
                      <label>
                        第 {i + 1} 段代码
                        <textarea
                          required
                          rows={6}
                          lang="en"
                          className="code-input"
                          value={s.en}
                          onChange={(e) => segment(i, { en: e.target.value })}
                        />
                      </label>
                    ) : (
                      <div className="pair">
                        <label>
                          第 {i + 1} 段英语
                          <textarea
                            required
                            rows={4}
                            lang="en"
                            value={s.en}
                            onChange={(e) => segment(i, { en: e.target.value })}
                          />
                        </label>
                        <label>
                          第 {i + 1} 段中文
                          <textarea
                            required
                            rows={4}
                            value={s.zh}
                            onChange={(e) => segment(i, { zh: e.target.value })}
                          />
                        </label>
                      </div>
                    )}
                  </section>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  change({
                    ...draft,
                    segments: [
                      ...draft.segments,
                      { en: "", zh: "", kind: "text" },
                    ],
                  })
                }
              >
                新增正文组
              </button>
            </section>
          )}
          <ErrorNote error={failure} />
          <div className="save-bar">
            <button className="primary" disabled={!preview || stale}>
              {busy ? "保存中…" : "确认并保存文章"}
            </button>
            <Link to={`/books/${parent}`}>取消</Link>
          </div>
        </fieldset>
      </form>
      {blocker.state === "blocked" && (
        <LeavePrompt
          busy={busy}
          stay={() => blocker.reset()}
          leave={() => blocker.proceed()}
        />
      )}
    </>
  );
}
