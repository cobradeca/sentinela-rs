const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const distAssetsDir = path.join(root, "dist", "assets");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(publicDir, relativePath.replace(/^\/sentinela-rs\//, "")));
}

const failures = [];
const notes = [];
const manifestPath = path.join(publicDir, "manifest.json");
const swPath = path.join(publicDir, "sw.js");

assert(fs.existsSync(manifestPath), "public/manifest.json nao encontrado", failures);
assert(fs.existsSync(swPath), "public/sw.js nao encontrado", failures);

if (fs.existsSync(manifestPath)) {
  const manifest = readJson(manifestPath);
  for (const field of ["name", "short_name", "id", "start_url", "scope", "display", "background_color", "theme_color", "icons"]) {
    assert(Boolean(manifest[field]), `manifest sem campo obrigatorio: ${field}`, failures);
  }
  assert(manifest.start_url?.startsWith("/sentinela-rs/"), "manifest start_url fora do escopo /sentinela-rs/", failures);
  assert(manifest.scope === "/sentinela-rs/", "manifest scope deve ser /sentinela-rs/", failures);
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "manifest precisa de icones 192 e 512", failures);

  for (const icon of manifest.icons || []) {
    assert(fileExists(icon.src), `icone ausente: ${icon.src}`, failures);
  }
  for (const screenshot of manifest.screenshots || []) {
    assert(fileExists(screenshot.src), `screenshot ausente: ${screenshot.src}`, failures);
  }
  for (const shortcut of manifest.shortcuts || []) {
    assert(shortcut.url?.startsWith("/sentinela-rs/"), `atalho fora do escopo: ${shortcut.name}`, failures);
  }
}

if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, "utf8");
  assert(sw.includes("CACHE_NAME"), "service worker sem CACHE_NAME", failures);
  assert(sw.includes("networkFirst"), "service worker sem estrategia networkFirst", failures);
  assert(sw.includes("cacheFirst"), "service worker sem estrategia cacheFirst", failures);
}

if (fs.existsSync(distAssetsDir)) {
  const assets = fs.readdirSync(distAssetsDir);
  const queimadasChunk = assets.find((name) => /^QueimadasTab-.*\.js$/.test(name));
  const geojsonAsset = assets.find((name) => /^fire-monitored-areas-.*\.geojson$/.test(name));

  assert(Boolean(queimadasChunk), "chunk da aba Queimadas nao encontrado no dist", failures);
  assert(Boolean(geojsonAsset), "GeoJSON de geocercas nao foi emitido como asset separado", failures);

  if (queimadasChunk) {
    const sizeKb = fs.statSync(path.join(distAssetsDir, queimadasChunk)).size / 1024;
    notes.push(`QueimadasTab: ${sizeKb.toFixed(1)} KB`);
    assert(sizeKb < 100, `QueimadasTab acima do orcamento de 100 KB: ${sizeKb.toFixed(1)} KB`, failures);
  }
} else {
  notes.push("dist/assets nao encontrado; rode npm run build antes da auditoria de performance.");
}

if (failures.length) {
  console.error("Auditoria PWA falhou:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Auditoria PWA ok.");
for (const note of notes) console.log(`- ${note}`);
