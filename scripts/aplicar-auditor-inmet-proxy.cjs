const fs = require("fs");
const path = require("path");

const auditorPath = path.join(process.cwd(), "scripts", "auditar-sitrep-hardcoded-fontes.cjs");

if (!fs.existsSync(auditorPath)) {
  console.error("ERRO: não encontrei scripts/auditar-sitrep-hardcoded-fontes.cjs");
  process.exit(1);
}

let src = fs.readFileSync(auditorPath, "utf8");
const backup = path.join(process.cwd(), "scripts", `auditar-sitrep-hardcoded-fontes.cjs.backup-inmet-proxy-${Date.now()}`);
fs.writeFileSync(backup, src, "utf8");

if (src.includes("inmet-previsao?codigo_ibge=4314902")) {
  console.log("Auditor já possui INMET proxy.");
  process.exit(0);
}

// Insere INMET oficial proxy logo após Defesa Civil, ou no início da lista de fontes reais.
const needle = `["Defesa Civil RS", \`https://\${PROJECT_REF}.supabase.co/functions/v1/defesa-civil-rs\`, (d) => d.ok === true && d.mode === "essential_active_only", "SITREP real: alertas oficiais vigentes"],`;
const insert = `${needle}
  ["INMET Proxy", \`https://\${PROJECT_REF}.supabase.co/functions/v1/inmet-previsao?codigo_ibge=4314902\`, (d) => d.ok === true && d.status === "OK" && d.latest?.source === "INMET", "SITREP real: previsão oficial INMET via proxy Supabase"],`;

if (!src.includes(needle)) {
  console.error("ERRO: ponto de inserção Defesa Civil não encontrado no auditor.");
  process.exit(1);
}

src = src.replace(needle, insert);
fs.writeFileSync(auditorPath, src, "utf8");

console.log("Auditor atualizado com INMET Proxy.");
console.log("Backup:", path.relative(process.cwd(), backup));
