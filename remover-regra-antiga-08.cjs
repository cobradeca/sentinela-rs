const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-remover-regra-08");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-remover-regra-08");
}

// Remove resíduos da regra antiga de alerta único 0,8 m.
// A Lagoa agora usa limiares por estação:
// - RADAR: limiar próprio do sensor
// - HidroSens Pelotas/Laranjal: alerta 1,20 m; crítico 1,40 m
// Não deve restar texto "alerta 0.8m" ou "alerta 0,8m" no App.jsx.

const replacements = [
  ["alerta 0.8m", "limiar por estação"],
  ["alerta 0,8m", "limiar por estação"],
  ["alerta 0.8 m", "limiar por estação"],
  ["alerta 0,8 m", "limiar por estação"],
  ["alerta 0.80m", "limiar por estação"],
  ["alerta 0,80m", "limiar por estação"],
  ["alerta 0.80 m", "limiar por estação"],
  ["alerta 0,80 m", "limiar por estação"],

  // Textos antigos de ANA única.
  ["ANA / alerta 0.8m", "limiar por estação"],
  ["ANA / alerta 0,8m", "limiar por estação"],
  ["ANA HidroWeb indisponível", "Sem leitura operacional validada"],
];

let count = 0;
for (const [from, to] of replacements) {
  const before = app;
  app = app.replaceAll(from, to);
  if (app !== before) count++;
}

// Remove lógica antiga visual se ainda tiver sobrado no card.
// Não altera limiares técnicos atuais; só elimina fallback visual por 0.8.
app = app.replaceAll(
  'background:d.lagoa.atual>1.2?"#ef4444":d.lagoa.atual>0.8?"#f97316":"#22c55e"',
  'background:lagoaStatusColor(d.lagoa.levelStatus)'
);

app = app.replaceAll(
  'd.lagoa.isReal && d.lagoa.atual > 0.8',
  'false'
);

// Relatório das ocorrências restantes.
const leftovers = [];
const lines = app.split(/\r?\n/);
lines.forEach((line, idx) => {
  if (/alerta\s*0[,.]8/i.test(line) || />\s*0\.8/.test(line) || />\s*0,8/.test(line)) {
    leftovers.push({ line: idx + 1, text: line.trim() });
  }
});

fs.writeFileSync(appPath, app, "utf8");

console.log(`Substituições aplicadas: ${count}`);
if (leftovers.length) {
  console.log("\nATENÇÃO: ainda há possíveis resíduos de 0,8 no App.jsx:");
  for (const item of leftovers) {
    console.log(`${item.line}: ${item.text}`);
  }
  console.log("\nRevise manualmente essas linhas antes do build.");
  process.exitCode = 1;
} else {
  console.log("Regra antiga 0,8 m removida do App.jsx.");
  console.log("Agora rode: npm run build");
}
