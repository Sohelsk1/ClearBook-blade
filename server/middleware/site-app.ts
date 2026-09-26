import siteHtml from "../site-index.html?raw";

interface SiteEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

export default function siteAppMiddleware(event: SiteEvent, next: () => unknown) {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return next();
  const path = event.url.pathname;
  if (
    path.startsWith("/static/") ||
    path.startsWith("/__grok/") ||
    path.startsWith("/assets/") ||
    path.startsWith("/src/")
  ) {
    return next();
  }
  if (path.includes(".") && !path.endsWith(".html")) return next();
  const accept = event.req.headers.get("accept") ?? "";
  if (accept && !accept.includes("text/html") && !accept.includes("*/*")) return next();
  return new Response(siteHtml, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}
