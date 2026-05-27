const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
if (!fs.existsSync(appPath)) {
  console.error("ERRO: src/App.jsx não encontrado");
  process.exit(1);
}

const app = fs.readFileSync(appPath, "utf8");

const checks = [
  ["sem +0,9°C hardcoded", !app.includes("+0,9°C")],
  ["sem Sentinel-1 no próximo bloco", !app.includes("Sentinel-1 no próximo bloco")],
  ["sem CPTEC planejado", !app.includes('CPTEC/INPE",                st:"PLANEJADO"')],
  ["sem Focos 2022 no card operacional", !app.includes("Focos 2022")],
  ["sem Risco 2026/27", !app.includes("Risco 2026/27")],
  ["WMO oficial", app.includes("const WMO_WEATHER")],
  ["Cota de alerta", app.includes("Cota de alerta")],
  ["EFFIS não conectado em tempo real", app.includes("EFFIS não está conectado em tempo real") || app.includes("EFFIS não conectado em tempo real")],
];

let fail = 0;
console.log("Auditoria de coerência operacional v2.3\n");
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
console.log("✅ Coerência operacional preservada.");
