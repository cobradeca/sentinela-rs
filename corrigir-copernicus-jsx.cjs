const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-corrigir-copernicus-jsx");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-corrigir-copernicus-jsx");
}

let changed = 0;

// O patch anterior inseriu um bloco dentro de:
// {activeTab==="copernicus" && (
//   <div
//     <div style=...
//
// Ou seja: ficou um <div sem fechamento do ">" antes de outro <div.
// Corrige especificamente essa quebra.
const broken = `{activeTab==="copernicus" && (
          <div
            <div style={{ ...s.card, marginBottom:12, border:\`1px solid \${copernicusHealth?.ok ? "#22c55e55" : t.border}\` }}>`;

const fixed = `{activeTab==="copernicus" && (
          <div>
            <div style={{ ...s.card, marginBottom:12, border:\`1px solid \${copernicusHealth?.ok ? "#22c55e55" : t.border}\` }}>`;

if (app.includes(broken)) {
  app = app.replace(broken, fixed);
  changed++;
}

// Correção tolerante caso tenha espaços diferentes.
const beforeRegex = app;
app = app.replace(
  /\{activeTab==="copernicus"\s*&&\s*\(\s*\n\s*<div\s*\n\s*<div style=\{\{ \.\.\.s\.card, marginBottom:12, border:`1px solid \$\{copernicusHealth\?\.ok \? "#22c55e55" : t\.border\}` \}\}>/,
  `{activeTab==="copernicus" && (
          <div>
            <div style={{ ...s.card, marginBottom:12, border:\`1px solid \${copernicusHealth?.ok ? "#22c55e55" : t.border}\` }}>`
);
if (app !== beforeRegex) changed++;

// Verificação final: procurar padrão "<div" seguido imediatamente de outro "<div" sem ">".
const lines = app.split(/\r?\n/);
const suspicious = [];
for (let i = 0; i < lines.length - 1; i++) {
  if (/^\s*<div\s*$/.test(lines[i]) && /^\s*<div\b/.test(lines[i + 1])) {
    suspicious.push(`${i + 1}: ${lines[i].trim()} / ${i + 2}: ${lines[i + 1].trim()}`);
  }
}

fs.writeFileSync(appPath, app, "utf8");

console.log(`Correções aplicadas: ${changed}`);

if (suspicious.length) {
  console.log("ATENÇÃO: ainda há possíveis <div sem fechamento:");
  console.log(suspicious.join("\n"));
  process.exitCode = 1;
} else {
  console.log("JSX da seção Copernicus corrigido.");
  console.log("Agora rode: npm run build");
}
