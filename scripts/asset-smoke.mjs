/** Check that HTML only points at stylesheets and scripts that actually exist. */

export function referencedAssets(html) {
  const assets = [];
  const tags = String(html).match(/<(?:link|script)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const stylesheet = /rel=["']stylesheet["']/i.test(tag);
    const src = /(?:href|src)=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src || src.startsWith("data:") || src.startsWith("https://") || src.startsWith("http://")) continue;
    if (tag.startsWith("<link") && !stylesheet) continue;
    if (tag.startsWith("<script") && !src) continue;
    assets.push(src);
  }
  return [...new Set(assets)];
}

export function assetResponseOk(url, status, contentType) {
  if (status < 200 || status >= 300) return false;
  const type = String(contentType ?? "").toLowerCase();
  if (url.endsWith(".css")) return type.includes("text/css");
  if (url.endsWith(".js") || url.endsWith(".mjs")) return type.includes("javascript");
  return true;
}
