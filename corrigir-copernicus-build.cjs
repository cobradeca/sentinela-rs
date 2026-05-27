const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-corrigir-copernicus-build");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-corrigir-copernicus-build");
}

let changed = 0;

// Corrige a linha quebrada que ficou sem comentário:
//   — produtos oficiais sazonais/subsazonais por imagem.
// Isso quebra o JSX/JS porque começa com travessão fora de comentário.
const before = app;
app = app.replace(
  /^\s*— produtos oficiais sazonais\/subsazonais por imagem\.\s*$/m,
  "// CPTEC/INPE — produtos oficiais sazonais/subsazonais por imagem."
);
if (app !== before) changed++;

// Correção adicional caso tenha ficado um comentário partido em duas linhas.
const before2 = app;
app = app.replace(
  /\/\/ CPTEC\/INPE\s*\n\s*\/\/ CPTEC\/INPE — produtos oficiais sazonais\/subsazonais por imagem\./,
  "// CPTEC/INPE — produtos oficiais sazonais/subsazonais por imagem."
);
if (app !== before2) changed++;

// Garante que não sobrou travessão solto no começo de linha dentro do JS.
const leftovers = [];
app.split(/\r?\n/).forEach((line, i) => {
  if (/^\s*—/.test(line)) leftovers.push(`${i + 1}: ${line.trim()}`);
});

fs.writeFileSync(appPath, app, "utf8");

console.log(`Correções aplicadas: ${changed}`);

if (leftovers.length) {
  console.log("ATENÇÃO: ainda há linhas começando com travessão:");
  console.log(leftovers.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Erro do travessão solto corrigido.");
  console.log("Agora rode: npm run build");
}
