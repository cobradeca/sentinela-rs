const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-remover-lagoa-level-risk");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-remover-lagoa-level-risk");
}

const oldLine = "  if (lagoaLevel > 1.2) score += 4; else if (lagoaLevel > 0.8) score += 3; else if (lagoaLevel > 0.5) score += 1;";
const newLine = "  // Nível da Lagoa não usa mais limiar genérico. O risco por nível é calculado por estação, usando threshold_m próprio.";

if (app.includes(oldLine)) {
  app = app.replace(oldLine, newLine);
} else {
  console.warn("AVISO: linha exata da regra antiga não encontrada. Tentando remoção por regex.");
  app = app.replace(
    /\s*if\s*\(\s*lagoaLevel\s*>\s*1\.2\s*\)\s*score\s*\+=\s*4\s*;\s*else\s*if\s*\(\s*lagoaLevel\s*>\s*0\.8\s*\)\s*score\s*\+=\s*3\s*;\s*else\s*if\s*\(\s*lagoaLevel\s*>\s*0\.5\s*\)\s*score\s*\+=\s*1\s*;/,
    "\n  // Nível da Lagoa não usa mais limiar genérico. O risco por nível é calculado por estação, usando threshold_m próprio."
  );
}

// Se a assinatura ainda tiver lagoaLevel, neutraliza o parâmetro para deixar claro que não entra mais no cálculo base.
app = app.replace(
  "function getRiskLevel(precip, tempMin, windMax, lagoaLevel=null)",
  "function getRiskLevel(precip, tempMin, windMax, lagoaLevel=null)"
);

// Verificação final.
const leftovers = [];
app.split(/\r?\n/).forEach((line, idx) => {
  if (/lagoaLevel\s*>\s*0\.8|alerta\s*0[,.]8/i.test(line)) {
    leftovers.push(`${idx + 1}: ${line.trim()}`);
  }
});

fs.writeFileSync(appPath, app, "utf8");

if (leftovers.length) {
  console.log("ATENÇÃO: ainda sobraram resíduos:");
  console.log(leftovers.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Regra antiga por lagoaLevel > 0.8 removida.");
  console.log("Agora rode:");
  console.log("npm run build");
  console.log("node auditar-prioridades-sentinela.cjs");
}
