/**
 * bump-sw-version.cjs
 *
 * Reescreve o CACHE_NAME em public/sw.js com um valor único por build,
 * forçando o service worker a invalidar o cache antigo no próximo deploy.
 *
 * Uso: node scripts/bump-sw-version.cjs   (chamado automaticamente via "prebuild")
 */

const fs = require("fs");
const path = require("path");

const SW_PATH = path.resolve(__dirname, "..", "public", "sw.js");

const content = fs.readFileSync(SW_PATH, "utf-8");

const newCacheName = `sentinela-rs-v${Date.now()}`;

const updated = content.replace(
  /const CACHE_NAME\s*=\s*"[^"]*"/,
  `const CACHE_NAME = "${newCacheName}"`
);

if (updated === content) {
  console.error("⚠  bump-sw-version: não encontrou a linha CACHE_NAME em", SW_PATH);
  process.exit(1);
}

fs.writeFileSync(SW_PATH, updated, "utf-8");
console.log(`✔  CACHE_NAME → "${newCacheName}"`);
