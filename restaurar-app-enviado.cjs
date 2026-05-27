const fs = require("fs");
const path = require("path");

const root = process.cwd();
const currentPath = path.join(root, "src", "App.jsx");
const restoredPath = path.join(root, "App.restaurado.jsx");

if (!fs.existsSync(currentPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto sentinela-rs.");
  process.exit(1);
}

if (!fs.existsSync(restoredPath)) {
  console.error("ERRO: não encontrei App.restaurado.jsx. Extraia este pacote na raiz do projeto.");
  process.exit(1);
}

const now = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(root, "src", `App.jsx.backup-antes-restaurar-enviado-${now}`);

fs.copyFileSync(currentPath, backupPath);
fs.copyFileSync(restoredPath, currentPath);

const restored = fs.readFileSync(currentPath, "utf8");

const looseDash = restored.split(/\r?\n/).filter((line) => /^\s*—/.test(line));
const brokenDiv = restored.includes('{activeTab==="copernicus" && (\n          <div\n            <div');
const curlyOpen = (restored.match(/\{/g) || []).length;
const curlyClose = (restored.match(/\}/g) || []).length;

console.log(`Backup criado em: ${path.relative(root, backupPath)}`);
console.log("src/App.jsx restaurado a partir de App.restaurado.jsx.");
console.log(`Chaves: {=${curlyOpen} }=${curlyClose}`);

if (looseDash.length) {
  console.log("ATENÇÃO: ainda há linhas com travessão solto:");
  console.log(looseDash.join("\n"));
  process.exitCode = 1;
}

if (brokenDiv) {
  console.log("ATENÇÃO: ainda há padrão de <div quebrado na seção Copernicus.");
  process.exitCode = 1;
}

if (!process.exitCode) {
  console.log("Checagem simples OK. Agora rode: npm run build");
}
