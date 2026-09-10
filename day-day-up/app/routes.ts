import {
  type RouteConfig,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Chrome DevTools 的 well-known 探测，返回 204 避免控制台报「No route matches」
  route(
    ".well-known/appspecific/com.chrome.devtools.json",
    "routes/chrome-devtools.ts",
  ),
] satisfies RouteConfig;
