export type Book = {
  id: number;
  name: string;
  articleCount: number;
  firstArticleId: number | null;
};
export type Segment = {
  id?: number;
  position?: number;
  kind?: "text" | "code" | "table";
  en: string;
  zh: string;
};
export type ArticleInput = {
  unitName: string;
  title: { en: string; zh: string };
  segments: Segment[];
};
export type Article = ArticleInput & {
  id: number;
  bookId: number;
  parentId: number | null;
  position: number;
  childCount: number;
};
export type ParseResult = {
  title: { en: string; zh: string };
  segments: Segment[];
};
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    signal,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
