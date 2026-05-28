const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
if (!fs.existsSync(appPath)) {
  console.error("ERRO: src/App.jsx não encontrado");
  process.exit(1);
}

const app = fs.readFileSync(appPath, "utf8");

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
  ["label OK", app.includes('ok ? "OK" : "Falhou"')],
];

let fail = 0;
console.log("Auditoria de saúde OK validado\n");

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
console.log("✅ Painel de saúde usa OK para respostas validadas.");
