const fs = require("fs");
const path = require("path");

const srcDir = path.join(process.cwd(), "src");
const appPath = path.join(srcDir, "App.jsx");
const tabsDir = path.join(srcDir, "tabs");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: nao encontrei src/App.jsx");
  process.exit(1);
}

const tabFiles = fs.existsSync(tabsDir)
  ? fs.readdirSync(tabsDir).filter((name) => name.endsWith(".jsx")).map((name) => path.join(tabsDir, name))
  : [];
const app = [appPath, ...tabFiles].map((file) => fs.readFileSync(file, "utf8")).join("\n");

const checks = [
  {
    ok: app.includes("POL") && app.includes("FONTE REAL"),
    fail: "Card de politica operacional nao encontrado na aba Fontes de Dados.",
  },
  {
    ok: app.includes("getFallbackWarningText"),
    fail: "Helper getFallbackWarningText nao encontrado.",
  },
  {
    ok: app.toLowerCase().includes("verifique") && app.toLowerCase().includes("informa") && app.toLowerCase().includes("respons"),
    fail: "Aviso de fallback nao orienta verificar junto ao orgao responsavel.",
  },
  {
    ok: !app.includes('ANA HidroWeb (Telemetria)", st:"ATIVO"'),
    fail: "ANA HidroWeb ainda aparece como ATIVO, mas deve ficar aguardando credencial/complementar.",
  },
  {
    ok: !app.includes("Fallback local 6h ativado automaticamente"),
    fail: "Fallback RADAR ainda esta descrito como automatico sem politica.",
  },
  {
    ok: !app.includes("Fallback local 6h."),
    fail: "Fallback HidroSens ainda esta descrito de forma generica.",
  },
];

let failed = 0;
console.log("Auditoria de politica de fallback e fontes\n");
for (const check of checks) {
  if (check.ok) console.log("OK");
  else {
    failed++;
    console.log("FALHA " + check.fail);
  }
}

console.log("\nResultado:");
if (failed) {
  console.log(`${failed} falha(s) na politica operacional.`);
  process.exit(1);
}
console.log("Politica de fallback/fonte operacional preservada.");
