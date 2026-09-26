import assert from "node:assert/strict";
import test from "node:test";
import { assetResponseOk, referencedAssets } from "./asset-smoke.mjs";

const html = `<link rel="stylesheet" href="/assets/styles-OROOk-Es.css"><link rel="icon" href="/favicon.svg"><script type="module" src="/assets/index-D1lBbb00.js"></script>`;

test("entry HTML asset list ignores icons and keeps css and js", () => {
  assert.deepEqual(referencedAssets(html), ["/assets/styles-OROOk-Es.css", "/assets/index-D1lBbb00.js"]);
});

test("a stylesheet 404 or html body is not a successful css asset", () => {
  assert.equal(assetResponseOk("/assets/styles-OROOk-Es.css", 404, "text/html"), false);
  assert.equal(assetResponseOk("/assets/styles-OROOk-Es.css", 200, "text/html"), false);
  assert.equal(assetResponseOk("/assets/styles-OROOk-Es.css", 200, "text/css; charset=utf-8"), true);
  assert.equal(assetResponseOk("/assets/index-D1lBbb00.js", 200, "application/javascript"), true);
});
