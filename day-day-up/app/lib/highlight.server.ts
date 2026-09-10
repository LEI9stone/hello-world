import githubLight from "@shikijs/themes/github-light";
import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import type { HighlighterCore } from "shiki/core";
import type { ShikiTransformer } from "shiki/core";

import type { ChapterData } from "../components/types";

/**
 * 服务端代码高亮（Shiki 细粒度）。
 *
 * - 只在 loader 里跑，`.server.ts` 保证不会被打进客户端 bundle；
 * - 语言按需动态 import：文章里没出现的语法不会进入服务端产物；
 * - 语法表里没有的语言（例如 EBNF）统一按纯文本渲染，不会报错。
 */

/** 支持的语言：key 为 Shiki 语言 id，值为按需加载的语法模块 */
const LANG_LOADERS = {
  go: () => import("@shikijs/langs/go"),
  javascript: () => import("@shikijs/langs/javascript"),
  typescript: () => import("@shikijs/langs/typescript"),
  jsx: () => import("@shikijs/langs/jsx"),
  tsx: () => import("@shikijs/langs/tsx"),
  python: () => import("@shikijs/langs/python"),
  java: () => import("@shikijs/langs/java"),
  rust: () => import("@shikijs/langs/rust"),
  c: () => import("@shikijs/langs/c"),
  cpp: () => import("@shikijs/langs/cpp"),
  csharp: () => import("@shikijs/langs/csharp"),
  bash: () => import("@shikijs/langs/bash"),
  shellscript: () => import("@shikijs/langs/shellscript"),
  json: () => import("@shikijs/langs/json"),
  yaml: () => import("@shikijs/langs/yaml"),
  toml: () => import("@shikijs/langs/toml"),
  sql: () => import("@shikijs/langs/sql"),
  html: () => import("@shikijs/langs/html"),
  css: () => import("@shikijs/langs/css"),
  xml: () => import("@shikijs/langs/xml"),
  markdown: () => import("@shikijs/langs/markdown"),
  diff: () => import("@shikijs/langs/diff"),
};

type LangId = keyof typeof LANG_LOADERS;
const isKnownLang = (id: string): id is LangId => id in LANG_LOADERS;

/** 常见别名 → Shiki 语言 id（markdown 围栏里习惯写 js/ts/py…） */
const LANG_ALIASES: Record<string, string> = {
  golang: "go",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  mts: "typescript",
  py: "python",
  "c++": "cpp",
  cc: "cpp",
  cs: "csharp",
  "c#": "csharp",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  yml: "yaml",
  md: "markdown",
  svg: "xml",
  htm: "html",
};

/** Shiki 内置的纯文本语言，无需加载语法 */
const PLAIN_TEXT = "text";

const THEME = "github-light";

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [githubLight],
    langs: [],
    engine: createOnigurumaEngine(import("shiki/wasm")),
  });
  return highlighterPromise;
}

/** 同一语言的并发加载只做一次 */
const langLoads = new Map<string, Promise<void>>();

async function ensureLang(
  highlighter: HighlighterCore,
  lang: string,
): Promise<void> {
  if (!isKnownLang(lang)) return;

  let loading = langLoads.get(lang);
  if (!loading) {
    loading = highlighter
      .loadLanguage(LANG_LOADERS[lang]())
      .then(() => undefined);
    langLoads.set(lang, loading);
  }
  await loading;
}

/** 把任意写法归一到一个可用的语言 id */
function resolveLang(lang?: string): string {
  if (!lang) return PLAIN_TEXT;
  const key = lang.trim().toLowerCase();
  const id = LANG_ALIASES[key] ?? key;
  return id === PLAIN_TEXT || isKnownLang(id) ? id : PLAIN_TEXT;
}

/** 去掉 Shiki 自带背景色，配色交给外层容器统一控制 */
const stripShikiBackground: ShikiTransformer = {
  name: "strip-shiki-background",
  pre(node) {
    node.properties.style = undefined;
  },
};

/** 高亮一段代码，返回可直接插入页面的 HTML */
export async function highlightCode(
  code: string,
  lang?: string,
): Promise<string> {
  const id = resolveLang(lang);
  const highlighter = await getHighlighter();
  await ensureLang(highlighter, id);

  return highlighter.codeToHtml(code, {
    lang: id,
    theme: THEME,
    transformers: [stripShikiBackground],
  });
}

/**
 * 为文章里所有带 codeLang 的代码块生成高亮 HTML。
 * 返回 { [sentence.id]: html }，由 <Chapter /> 按句子取用。
 */
export async function highlightArticle(
  article: readonly ChapterData[],
): Promise<Record<string, string>> {
  const jobs = article.flatMap((chapter) =>
    chapter.sentences
      .filter((sentence) => sentence.code && sentence.codeLang)
      .map(async (sentence) => {
        const html = await highlightCode(sentence.code!, sentence.codeLang);
        return [sentence.id, html] as const;
      }),
  );

  return Object.fromEntries(await Promise.all(jobs));
}
