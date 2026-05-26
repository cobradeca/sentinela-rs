const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-risco-cemaden");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-risco-cemaden");
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  return source.replace(search, replacement);
}

// 1) Adiciona cálculo de risco com chuva observada CEMADEN.
// Mantém getRiskLevel antigo intacto como fallback, mas cria uma camada operacional mais correta.
const operationalRiskFunction = `
// Risco operacional separado por tipo de dado.
// CEMADEN = chuva observada; Open-Meteo = previsão acumulada 14 dias; INMET = descrição oficial municipal.
// ATENÇÃO não entra como alerta ativo; apenas sinaliza condição moderada no Dashboard.
function getOperationalRiskLevel({ forecast14d = 0, observed24h = null, tempMin = null, windMax = null, lagoaLevel = null }) {
  let score = 0;

  // Chuva observada CEMADEN tem prioridade operacional.
  if (typeof observed24h === "number") {
    if (observed24h >= 100) score += 5;
    else if (observed24h >= 70) score += 4;
    else if (observed24h >= 50) score += 3;
    else if (observed24h >= 30) score += 2;
    else if (observed24h >= 15) score += 1;
  }

  // Previsão 14 dias é tendência, não severidade imediata.
  if (forecast14d >= 180) score += 3;
  else if (forecast14d >= 120) score += 2;
  else if (forecast14d >= 80) score += 1;

  if (typeof tempMin === "number") {
    if (tempMin < 0) score += 3;
    else if (tempMin < 5) score += 2;
    else if (tempMin < 8) score += 1;
  }

  if (typeof windMax === "number") {
    if (windMax > 80) score += 3;
    else if (windMax > 50) score += 2;
    else if (windMax > 35) score += 1;
  }

  if (typeof lagoaLevel === "number") {
    if (lagoaLevel > 1.2) score += 4;
    else if (lagoaLevel > 0.8) score += 3;
    else if (lagoaLevel > 0.5) score += 1;
  }

  if (score >= 9) return "CRITICO";
  if (score >= 6) return "EMERGENCIA";
  if (score >= 4) return "ALERTA";
  if (score >= 2) return "ATENCAO";
  return "NORMAL";
}
`;

if (!app.includes("function getOperationalRiskLevel(")) {
  if (app.includes("function getRiskLevel(")) {
    app = replaceOnce(
      app,
      "function getRiskLevel(",
      `${operationalRiskFunction}
function getRiskLevel(`,
      "função getOperationalRiskLevel"
    );
  } else {
    console.error("ERRO: não encontrei function getRiskLevel para inserir getOperationalRiskLevel.");
    process.exit(1);
  }
}

// 2) Usa chuva observada CEMADEN no cálculo, quando disponível.
if (!app.includes("const observedRain24 = cemaden?.max_acc24hr")) {
  app = replaceOnce(
    app,
    `        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
        const tempMin = Math.min(...(weather.daily?.temperature_2m_min||[99]));
        const windMax = Math.max(...(weather.daily?.wind_speed_10m_max||[0]));
        const risk    = getRiskLevel(precip,tempMin,windMax,lagoa?.atual ?? null);
`,
    `        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
        const tempMin = Math.min(...(weather.daily?.temperature_2m_min||[99]));
        const windMax = Math.max(...(weather.daily?.wind_speed_10m_max||[0]));
        const observedRain24 = cemaden?.max_acc24hr ?? null;
        const risk    = getOperationalRiskLevel({
          forecast14d: precip,
          observed24h: observedRain24,
          tempMin,
          windMax,
          lagoaLevel: lagoa?.atual ?? null,
        });
`,
    "uso do CEMADEN no cálculo operacional"
  );
}

// 3) Guarda observedRain24 no stationData para depuração futura.
if (app.includes(`results[st.id] = { weather, inmet, cemaden, lagoa, precip, tempMin, windMax, risk, realLevel };`)) {
  app = app.replace(
    `results[st.id] = { weather, inmet, cemaden, lagoa, precip, tempMin, windMax, risk, realLevel };`,
    `results[st.id] = { weather, inmet, cemaden, observedRain24, lagoa, precip, tempMin, windMax, risk, realLevel };`
  );
}

// 4) Ajusta rótulo visual para diferenciar previsão Open-Meteo de observação CEMADEN.
app = app.replace(/Precip\. 14d/g, "Previsão 14d");

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado: risco operacional agora usa CEMADEN como chuva observada.");
console.log("Backup preservado em src/App.jsx.backup-risco-cemaden.");
console.log("Agora rode: npm run build");
