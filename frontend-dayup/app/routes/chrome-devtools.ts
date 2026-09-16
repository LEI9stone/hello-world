/**
 * Chrome DevTools 打开时会探测这个地址（用于「自动工作区」功能）。
 * 没有对应路由时 React Router 会抛 "No route matches URL ..." 并在控制台刷栈，
 * 这里显式返回 204，交给 DevTools 自行忽略。
 */
export function loader() {
  return new Response(null, { status: 204 });
}
