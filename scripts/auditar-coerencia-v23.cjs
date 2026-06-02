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
  ["sem +0,9C hardcoded", !app.includes("+0,9°C")],
  ["sem Sentinel-1 no proximo bloco", !app.includes("Sentinel-1 no próximo bloco")],
  ["sem CPTEC planejado", !app.includes('CPTEC/INPE",                st:"PLANEJADO"')],
  ["sem Focos 2022 no card operacional", !app.includes("Focos 2022")],
  ["sem Risco 2026/27", !app.includes("Risco 2026/27")],
  ["WMO oficial", app.includes("const WMO_WEATHER")],
  ["Cota de alerta", app.includes("Cota de alerta")],
  ["EFFIS complementar sem alerta", app.includes("EFFIS WMS conectado") && app.includes("não aciona alerta")],
];

let fail = 0;
console.log("Auditoria de coerencia operacional v2.3\n");
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
console.log("Coerencia operacional preservada.");
