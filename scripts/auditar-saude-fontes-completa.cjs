const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
if (!fs.existsSync(appPath)) {
  console.error("ERRO: src/App.jsx não encontrado");
  process.exit(1);
}

const app = fs.readFileSync(appPath, "utf8");

const checks = [
  ["NOAA/CPC ENSO no painel", app.includes('"NOAA/CPC ENSO"')],
  ["IRI/CCSR ENSO no painel", app.includes('"IRI/CCSR ENSO"')],
  ["CPTEC/INPE no painel", app.includes('"CPTEC/INPE"')],
  ["Copernicus Water no painel", app.includes('"Copernicus Water"')],
  ["Copernicus Sentinel-1 no painel", app.includes('"Copernicus Sentinel-1"')],
  ["Copernicus NDVI no painel", app.includes('"Copernicus NDVI"')],
  ["Health Copernicus Water", app.includes('markSourceHealth("Copernicus Water"')],
  ["Health Copernicus Sentinel-1", app.includes('markSourceHealth("Copernicus Sentinel-1"')],
  ["Health Copernicus NDVI", app.includes('markSourceHealth("Copernicus NDVI"')],
  ["ANA aguardando API", app.includes('"Aguardando API"')],
];

let fail = 0;
console.log("Auditoria de saúde completa das fontes\n");
for (const [label, ok] of checks) {
  if (ok) console.log("✅ " + label);
  else {
    console.log("❌ " + label);
    fail++;
  }
}

console.log("\nResultado:");
if (fail) {
  console.log(`❌ ${fail} falha(s).`);
  process.exit(1);
}
console.log("✅ Painel de saúde completo configurado.");
