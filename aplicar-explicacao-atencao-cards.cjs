const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-explicar-atencao-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

function insertAfter(search, insert, label) {
  if (!app.includes(search)) {
    console.error("ERRO: trecho não encontrado:", label);
    process.exit(1);
  }
  app = app.replace(search, search + insert);
  console.log("OK:", label);
}

// Cria função única de explicação do risco nos cards.
// Critério: explica o que de fato elevou o risco por previsão/nível/observação.
// ENSO fica como contexto e não deve justificar atenção local sozinho.
if (!app.includes("function explainCityRisk")) {
  insertAfter(
`function formatCemadenRain(cemaden) {
  if (!cemaden) return "";
  const acc24 = typeof cemaden.max_acc24hr === "number" ? cemaden.max_acc24hr : null;
  const acc6 = typeof cemaden.max_acc6hr === "number" ? cemaden.max_acc6hr : null;

  if (acc24 !== null) return \`chuva observada 24h \${acc24.toFixed(1)}mm\`;
  if (acc6 !== null) return \`chuva observada 6h \${acc6.toFixed(1)}mm\`;

  return "chuva observada disponível";
}
`,
`
function explainCityRisk(d) {
  if (!d || d.error) return "sem dados suficientes";

  const reasons = [];

  if (typeof d.precip === "number") {
    if (d.precip > 150) reasons.push(\`chuva prevista muito alta: \${d.precip.toFixed(0)}mm/14d\`);
    else if (d.precip > 80) reasons.push(\`chuva prevista alta: \${d.precip.toFixed(0)}mm/14d\`);
    else if (d.precip > 40) reasons.push(\`chuva prevista moderada: \${d.precip.toFixed(0)}mm/14d\`);
    else if (d.precip > 20) reasons.push(\`chuva prevista em acompanhamento: \${d.precip.toFixed(0)}mm/14d\`);
  }

  if (typeof d.tempMin === "number") {
    if (d.tempMin < 0) reasons.push(\`frio extremo previsto: \${d.tempMin.toFixed(1)}°C\`);
    else if (d.tempMin < 5) reasons.push(\`temperatura mínima baixa: \${d.tempMin.toFixed(1)}°C\`);
    else if (d.tempMin < 10) reasons.push(\`temperatura mínima em atenção: \${d.tempMin.toFixed(1)}°C\`);
  }

  if (typeof d.windMax === "number") {
    if (d.windMax > 80) reasons.push(\`vento muito forte previsto: \${d.windMax.toFixed(0)}km/h\`);
    else if (d.windMax > 50) reasons.push(\`vento forte previsto: \${d.windMax.toFixed(0)}km/h\`);
    else if (d.windMax > 30) reasons.push(\`vento em acompanhamento: \${d.windMax.toFixed(0)}km/h\`);
  }

  const cemaden24 = typeof d.cemaden?.max_acc24hr === "number" ? d.cemaden.max_acc24hr : null;
  const cemaden6 = typeof d.cemaden?.max_acc6hr === "number" ? d.cemaden.max_acc6hr : null;
  if (cemaden24 !== null && cemaden24 > 50) reasons.push(\`chuva observada CEMADEN 24h: \${cemaden24.toFixed(1)}mm\`);
  else if (cemaden6 !== null && cemaden6 > 30) reasons.push(\`chuva observada CEMADEN 6h: \${cemaden6.toFixed(1)}mm\`);

  if (d.lagoa?.isReal && d.lagoa?.levelStatus && !["NORMAL", "SEM_LIMIAR", "SEM_LEITURA"].includes(d.lagoa.levelStatus)) {
    reasons.push(\`nível da Lagoa: \${d.lagoa.levelStatus.toLowerCase()}\`);
  }

  if (!reasons.length) {
    return d.risk === "NORMAL"
      ? "parâmetros dentro da normalidade"
      : "atenção por combinação de parâmetros meteorológicos";
  }

  return reasons.slice(0, 2).join(" · ");
}
`,
"função explainCityRisk"
  );
}

// Insere a explicação abaixo do selo de risco nos cards.
// Busca trecho comum do card de cidade/lagoa que renderiza RISK_LEVELS.
const riskLineRegex = /(<div[^>]*>\{RISK_LEVELS\[d\.risk\]\.icon\}\s*\{RISK_LEVELS\[d\.risk\]\.label\}<\/div>)/;
if (riskLineRegex.test(app) && !app.includes("{explainCityRisk(d)}")) {
  app = app.replace(
    riskLineRegex,
    `$1
                    <div style={{ fontSize:8, color:t.textMuted, marginTop:4, lineHeight:1.35 }}>{explainCityRisk(d)}</div>`
  );
  console.log("OK: explicação inserida após selo de risco");
} else if (app.includes("{explainCityRisk(d)}")) {
  console.log("OK: explicação já existia");
} else {
  console.error("ERRO: não encontrei a linha do selo de risco nos cards.");
  process.exit(1);
}

// Ajusta também "Contexto ENSO 98%" para não parecer causa do risco local.
app = app.replaceAll("Contexto ENSO", "Contexto climático");
app = app.replaceAll("Contexto ENSO", "Contexto climático");

// Torna CEMADEN mais conservador no texto quando não houver dado.
app = app.replaceAll('d.cemaden ? formatCemadenRain(d.cemaden) : "sem leitura observada"', 'd.cemaden ? formatCemadenRain(d.cemaden) : "sem leitura observada validada"');

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log("Patch aplicado: cards agora explicam o motivo do status Atenção/Alerta.");
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
