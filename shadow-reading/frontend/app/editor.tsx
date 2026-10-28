import { useEffect, useRef, useState } from "react";
import {
  Link,
  useBeforeUnload,
  useBlocker,
  useMatch,
  useNavigate,
  useParams,
} from "react-router";
import { api, type Article, type ArticleInput, type ParseResult } from "./api";
import { ErrorNote, message } from "./shared";
import { sample } from "./sample";

// 提示用的合法 JSON 形状，不作为内容写入。
const template = `[
  {
    "en": "# 文章标题",
    "zh": "文章标题译文"
  },
  {
    "en": "第一段英文，支持 **Markdown**、\`行内代码\` 与 [链接](https://example.com)。",
    "zh": "第一段中文译文。"
  }
]`;

// 编辑时把已有文章还原成 JSON：标题补回 #，代码段补回围栏，表格原样。
function toSource(a: Article): string {
  const items = [
    { en: `# ${a.title.en}`, zh: a.title.zh },
    ...a.segments.map((s) => ({
      en: s.kind === "code" ? "```\n" + s.en + "\n```" : s.en,
      zh: s.zh,
    })),
  ];
  return JSON.stringify(items, null, 2);
}

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
  const childMatch = useMatch("/articles/:articleId/new");
  const parentId = childMatch ? Number(childMatch.params.articleId) : undefined;
  const editingId = articleId && !childMatch ? articleId : undefined;
  const navigate = useNavigate();
  const [source, setSourceValue] = useState("");
  const [original, setOriginal] = useState("");
  const [parentTitle, setParentTitle] = useState("");
  const [ready, setReady] = useState(!articleId && !parentId);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [parent, setParent] = useState(bookId);
  const saved = useRef(false);
  useEffect(() => {
    const loadId = editingId || parentId;
    if (!loadId) return;
    const controller = new AbortController();
    setReady(false);
    setLoadError("");
    api<Article>(`/articles/${loadId}`, "GET", undefined, controller.signal)
      .then((a) => {
        if (editingId) {
          const text = toSource(a);
          setSourceValue(text);
          setOriginal(text);
        } else {
          setParentTitle(a.title.en || a.title.zh || "未命名文章");
        }
        setParent(String(a.bookId));
        setReady(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setLoadError(message(e));
      });
    return () => controller.abort();
  }, [editingId, parentId, retry]);
  const dirty = ready && !saved.current && source !== original;
  const blocker = useBlocker(() => !saved.current && (dirty || busy));
  useBeforeUnload((e) => {
    if (dirty || busy) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  function changeSource(value: string) {
    saved.current = false;
    setSourceValue(value);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!source.trim()) {
      setFailure("请粘贴 JSON 数组。");
      return;
    }
    setBusy(true);
    setFailure("");
    try {
      const parsed = await api<ParseResult>("/parse", "POST", {
        text: source,
      });
      const body: ArticleInput = {
        unitName: parsed.title.en,
        title: parsed.title,
        segments: parsed.segments.map(({ kind, en, zh }) => ({
          kind,
          en,
          zh,
        })),
      };
      const a = await api<Article>(
        editingId
          ? `/articles/${editingId}`
          : parentId
            ? `/articles/${parentId}/children`
            : `/books/${parent}/articles`,
        editingId ? "PUT" : "POST",
        body,
      );
      saved.current = true;
      navigate(`/articles/${a.id}`);
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(false);
    }
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
  const backTo = editingId
    ? `/articles/${editingId}`
    : parentId
      ? `/articles/${parentId}`
      : "/";
  return (
    <>
      <Link className="back" to={backTo}>
        {editingId ? "返回文章 /" : parentId ? "返回父文章 /" : "返回首页 /"}
      </Link>
      <header>
        <p className="eyebrow">PREPARE YOUR READING</p>
        <h1>{editingId ? "编辑文章" : parentId ? "新增小节" : "新增文章"}</h1>
        <p className="muted">
          {parentId
            ? `将作为《${parentTitle || "当前文章"}》的小节；第一条 en 作为小节名称与标题。`
            : "粘贴 JSON 数组，第一条 en 作为单元名称与标题；保存后在阅读页查看效果。"}
        </p>
      </header>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <section className="panel">
            <div className="section-heading">
              <h2>01 / 粘贴 JSON</h2>
              <button
                type="button"
                onClick={() => {
                  if (
                    source &&
                    !window.confirm("使用示例 JSON 替换当前内容？")
                  )
                    return;
                  changeSource(sample);
                }}
              >
                填入示例
              </button>
            </div>
            <label>
              {"[{\"en\": \"...\", \"zh\": \"...\"}]，第一条为标题，en 使用 Markdown"}
              <textarea
                rows={16}
                className="code-input"
                value={source}
                onChange={(e) => changeSource(e.target.value)}
                placeholder={template}
              />
            </label>
          </section>
          <ErrorNote error={failure} />
          <div className="save-bar">
            <button className="primary" disabled={busy}>
              {busy ? "保存中…" : "保存文章"}
            </button>
            <Link to={backTo}>取消</Link>
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
