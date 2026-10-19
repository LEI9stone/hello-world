import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import type { LinksFunction } from "react-router";
import type { ReactNode } from "react";
import "./style.css";
export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>影子阅读</title>
        <Meta />
        <Links />
      </head>
      <body>
        <a className="skip" href="#main">
          跳至内容
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          影子阅读<span>SHADOW READING</span>
        </Link>
        <nav>
          <Link to="/">我的书籍</Link>
        </nav>
        <p>
          先理解，再聆听。
          <br />
          让每一次跟读从容开始。
        </p>
      </aside>
      <main id="main">
        <Outlet />
      </main>
    </div>
  );
}
export function ErrorBoundary() {
  const e = useRouteError();
  return (
    <main>
      <h1>暂时无法打开页面</h1>
      <p role="alert">
        {isRouteErrorResponse(e)
          ? `${e.status} ${e.statusText}`
          : "请返回书籍列表重试。"}
      </p>
      <Link to="/">返回书籍列表</Link>
    </main>
  );
}
