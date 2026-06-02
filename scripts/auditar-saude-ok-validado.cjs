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
  ["helper central", app.includes("function getValidatedSourceHealth(name)")],
  ["NOAA validado", app.includes('name === "NOAA/CPC ENSO" && ensoLive && typeof ensoLive.nino34 === "number"')],
  ["IRI validado", app.includes('name === "IRI/CCSR ENSO" && ensoProbLive && ensoProbLive.prob && typeof ensoProbLive.prob.elNino === "number"')],
  ["CPTEC validado", app.includes('name === "CPTEC/INPE" && cptecProducts')],
  ["Copernicus Water validado", app.includes('name === "Copernicus Water" && copernicusWater')],
  ["Copernicus Sentinel-1 validado", app.includes('name === "Copernicus Sentinel-1" && copernicusS1')],
  ["Copernicus NDVI validado", app.includes('name === "Copernicus NDVI" && copernicusNdvi')],
  ["painel usa helper", app.includes("getValidatedSourceHealth(name)")],
  ["sem termo existe", !app.includes('"existe"') && !app.includes(">existe<")],
  ["label OK", app.includes('ok ? "OK"')],
];

let fail = 0;
console.log("Auditoria de saude OK validado\n");
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
console.log("Painel de saude usa OK para respostas validadas.");
