import { useEffect, useState } from "react";
import { api } from "./api";
export const message = (e: unknown) =>
  e instanceof Error ? e.message : "请求失败，请重试";
export function useResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError("");
    api<T>(path, "GET", undefined, controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      });
    return () => controller.abort();
  }, [path, version]);
  return { data, setData, error, reload: () => setVersion((v) => v + 1) };
}
export function LoadState({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return error ? (
    <div className="notice" role="alert">
      <p>{error}</p>
      <button onClick={retry}>重新加载</button>
    </div>
  ) : (
    <p role="status">正在加载…</p>
  );
}
export function ErrorNote({ error }: { error: string }) {
  return error ? (
    <p className="notice" role="alert">
      {error}
    </p>
  ) : null;
}
