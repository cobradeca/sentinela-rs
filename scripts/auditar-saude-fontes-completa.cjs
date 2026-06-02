const fs = require("fs");
const path = require("path");

const srcDir = path.join(process.cwd(), "src");
const appPath = path.join(srcDir, "App.jsx");
const tabsDir = path.join(srcDir, "tabs");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: src/App.jsx nao encontrado");
  process.exit(1);
}

const tabFiles = fs.existsSync(tabsDir)
  ? fs.readdirSync(tabsDir).filter((name) => name.endsWith(".jsx")).map((name) => path.join(tabsDir, name))
  : [];
const app = [appPath, ...tabFiles].map((file) => fs.readFileSync(file, "utf8")).join("\n");

const checks = [
  ["NOAA/CPC ENSO no painel", app.includes('"NOAA/CPC ENSO"')],
  ["IRI/CCSR ENSO no painel", app.includes('"IRI/CCSR ENSO"')],
  ["CPTEC/INPE no painel", app.includes('"CPTEC/INPE"')],
  ["Copernicus Water no painel", app.includes('"Copernicus Water"')],
  ["Copernicus Sentinel-1 no painel", app.includes('"Copernicus Sentinel-1"')],
  ["Copernicus NDVI no painel", app.includes('"Copernicus NDVI"')],
  ["Health Copernicus Water", app.includes('markSourceHealth("Copernicus Water"') || app.includes('markSourcePending("Copernicus Water"')],
  ["Health Copernicus Sentinel-1", app.includes('markSourceHealth("Copernicus Sentinel-1"') || app.includes('markSourcePending("Copernicus Sentinel-1"')],
  ["Health Copernicus NDVI", app.includes('markSourceHealth("Copernicus NDVI"') || app.includes('markSourcePending("Copernicus NDVI"')],
  ["ANA complementar nao reprova SITREP", app.includes("Fontes complementares ou sem leitura validada")],
];

let fail = 0;
console.log("Auditoria de saude completa das fontes\n");
for (const [label, ok] of checks) {
  if (ok) console.log("OK " + label);
  else {
    console.log("FALHA " + label);
    fail++;
  }
}

console.log("\nResultado:");
if (fail) {
  console.log(`${fail} falha(s).`);
  process.exit(1);
}
console.log("Painel de saude completo configurado.");
