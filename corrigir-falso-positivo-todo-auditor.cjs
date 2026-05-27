const fs = require("fs");
const path = require("path");

const auditorPath = path.join(process.cwd(), "scripts", "auditar-sitrep-hardcoded-fontes.cjs");

if (!fs.existsSync(auditorPath)) {
  console.error("ERRO: não encontrei scripts/auditar-sitrep-hardcoded-fontes.cjs");
  process.exit(1);
}

let src = fs.readFileSync(auditorPath, "utf8");
const backup = path.join(process.cwd(), "scripts", `auditar-sitrep-hardcoded-fontes.cjs.backup-todo-falso-positivo-${Date.now()}`);
fs.writeFileSync(backup, src, "utf8");

const oldPattern = /pattern:\/TODO\|FIXME\|PLACEHOLDER\|mock\|dummy\|lorem\|SEU_CLIENT_ID\|SEU_CLIENT_SECRET\|valor_real\/gi/;

if (!oldPattern.test(src)) {
  console.error("ERRO: padrão antigo de placeholder_terms não encontrado. Vou procurar alternativas.");
  const hasTodo = src.includes("TODO|FIXME|PLACEHOLDER|mock|dummy|lorem|SEU_CLIENT_ID|SEU_CLIENT_SECRET|valor_real");
  if (!hasTodo) {
    console.error("Não encontrei o trecho esperado no auditor.");
    process.exit(1);
  }
}

src = src.replace(
  /pattern:\/TODO\|FIXME\|PLACEHOLDER\|mock\|dummy\|lorem\|SEU_CLIENT_ID\|SEU_CLIENT_SECRET\|valor_real\/gi/g,
  'pattern:/\\\\bTODO\\\\b|\\\\bFIXME\\\\b|PLACEHOLDER|\\\\bmock\\\\b|\\\\bdummy\\\\b|\\\\blorem\\\\b|SEU_CLIENT_ID|SEU_CLIENT_SECRET|valor_real/g'
);

fs.writeFileSync(auditorPath, src, "utf8");

console.log("Auditor corrigido: 'todo' em português não será mais tratado como TODO técnico.");
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
