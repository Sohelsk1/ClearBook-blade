import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const buildDir = "emergent/frontend/build";
const staticDir = join(buildDir, "static");
rmSync("public/static", { recursive: true, force: true });
mkdirSync("public/static", { recursive: true });
cpSync(staticDir, "public/static", { recursive: true });

for (const name of readdirSync(buildDir)) {
  if (name === "index.html" || name === "static" || name === "asset-manifest.json") continue;
  const from = join(buildDir, name);
  if (!statSync(from).isFile()) continue;
  if (name === "robots.txt" || name === "sitemap.xml") continue;
  cpSync(from, join("public", name));
}
