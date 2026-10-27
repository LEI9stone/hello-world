import { index, route, type RouteConfig } from "@react-router/dev/routes";
export default [
  index("books.tsx"),
  route("books/:bookId/new", "editor.tsx"),
  route("articles/:articleId/edit", "editor.tsx", { id: "article-edit" }),
  route("articles/:articleId", "reader.tsx"),
] satisfies RouteConfig;
