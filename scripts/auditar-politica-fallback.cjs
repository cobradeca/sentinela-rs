const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx");
  process.exit(1);
}

const app = fs.readFileSync(appPath, "utf8");

const checks = [
  {
    ok: app.includes("POLÍTICA OPERACIONAL — FONTE REAL E FALLBACK"),
    fail: "Card de política operacional não encontrado na aba Fontes de Dados.",
  },
  {
    ok: app.includes("getFallbackWarningText"),
    fail: "Helper getFallbackWarningText não encontrado.",
  },
  {
    ok: app.includes("Verifique a informação junto ao órgão responsável"),
    fail: "Aviso de fallback não orienta verificar junto ao órgão responsável.",
  },
  {
    ok: !app.includes('ANA HidroWeb (Telemetria)", st:"ATIVO"'),
    fail: "ANA HidroWeb ainda aparece como ATIVO, mas deve ficar aguardando credencial/complementar.",
  },
  {
    ok: !app.includes("Fallback local 6h ativado automaticamente"),
    fail: "Fallback RADAR ainda está descrito como automático sem política.",
  },
  {
    ok: !app.includes("Fallback local 6h."),
    fail: "Fallback HidroSens ainda está descrito de forma genérica.",
  },
];

let failed = 0;

console.log("Auditoria de política de fallback e fontes\n");

for (const check of checks) {
  if (check.ok) {
    console.log("✅ OK");
  } else {
    failed++;
    console.log("❌ " + check.fail);
  }
}

console.log("\nResultado:");
if (failed) {
  console.log(`❌ ${failed} falha(s) na política operacional.`);
  process.exit(1);
}

console.log("✅ Política de fallback/fonte operacional preservada.");
