const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-risco-operacional");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-risco-operacional");
}

const oldLine = '  if (ENSO.nino34 >= 1.5) score += 3; else if (ENSO.nino34 >= 0.5) score += 2; else if (ENSO.nino34 > 0) score += 1;\n';
const newLine = '  // ENSO é contexto climático, não alerta operacional local. Não entra no score das cidades.\n';

if (app.includes(oldLine)) {
  app = app.replace(oldLine, newLine);
} else if (!app.includes("ENSO é contexto climático, não alerta operacional local")) {
  console.error("ERRO: não encontrei a linha antiga do ENSO dentro de getRiskLevel.");
  process.exit(1);
}

// Opcional seguro: renomeia o indicador dentro do card para evitar parecer fator operacional.
// Não remove o dado; apenas deixa claro que é contexto.
app = app.replace(
  '{ l:"El Niño",     v:`${(ENSO.prob.elNino*100).toFixed(0)}%`, highlight:true },',
  '{ l:"Contexto ENSO", v:`${(ENSO.prob.elNino*100).toFixed(0)}%`, highlight:true },'
);

app = app.replace(
  '{ l:"El Niño prob.",v:`${(ENSO.prob.elNino*100).toFixed(0)}%`, alert:true },',
  '{ l:"Contexto ENSO",v:`${(ENSO.prob.elNino*100).toFixed(0)}%`, alert:false },'
);

app = app.replace(
  '{ l:"El Niño prob.",v:`${(ENSO.prob.elNino*100).toFixed(0)}%`, a:true },',
  '{ l:"Contexto ENSO",v:`${(ENSO.prob.elNino*100).toFixed(0)}%`, a:false },'
);

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado: ENSO removido do cálculo de risco operacional.");
console.log("Backup preservado em src/App.jsx.backup-risco-operacional.");
console.log("Agora rode: npm run build");
