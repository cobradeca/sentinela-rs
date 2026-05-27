const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-travessao-cptec-definitivo");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-travessao-cptec-definitivo");
}

let changed = 0;

// Corrige qualquer linha solta iniciando por travessão.
// Exemplo quebrado:
//   — produtos oficiais sazonais/subsazonais por imagem.
// Vira comentário JS:
//   // — produtos oficiais sazonais/subsazonais por imagem.
app = app
  .split(/\r?\n/)
  .map((line) => {
    if (/^\s*—/.test(line)) {
      changed++;
      return line.replace(/^(\s*)—/, "$1// —");
    }
    return line;
  })
  .join("\n");

// Correção específica para o bloco CPTEC, caso tenha ficado comentário partido estranho.
app = app.replace(
  /\/\/ CPTEC\/INPE\s*\n\s*\/\/ — produtos oficiais sazonais\/subsazonais por imagem\./,
  "// CPTEC/INPE — produtos oficiais sazonais/subsazonais por imagem."
);

// Procura sobras perigosas.
const leftovers = [];
app.split(/\r?\n/).forEach((line, i) => {
  if (/^\s*—/.test(line)) {
    leftovers.push(`${i + 1}: ${line.trim()}`);
  }
});

fs.writeFileSync(appPath, app, "utf8");

console.log(`Linhas com travessão solto corrigidas: ${changed}`);

if (leftovers.length) {
  console.log("ATENÇÃO: ainda há travessão solto:");
  console.log(leftovers.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Travessão solto corrigido definitivamente.");
  console.log("Agora rode: npm run build");
}
