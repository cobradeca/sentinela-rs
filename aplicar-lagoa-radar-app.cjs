const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-lagoa-radar");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-lagoa-radar");
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  return source.replace(search, replacement);
}

// 1) Constante da função Lagoa Radar.
if (!app.includes("LAGOA_RADAR_FUNCTION_URL")) {
  app = replaceOnce(
    app,
    'const ANA_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/ana-rs";\n',
    'const ANA_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/ana-rs";\nconst LAGOA_RADAR_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/lagoa-patos-radar";\n',
    "constante LAGOA_RADAR_FUNCTION_URL"
  );
}

// 2) Funções de leitura radar.
const radarFunctions = `
// Lagoa dos Patos — sensores RADAR do portal de monitoramento.
// Fonte principal para pontos onde a ANA não retorna nível operacional.
async function fetchLagoaRadarLevels() {
  try {
    const res = await fetch(LAGOA_RADAR_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return {};

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.sensors)) return {};

    return Object.fromEntries(
      data.sensors
        .filter((sensor) => sensor?.ok && sensor?.station_id)
        .map((sensor) => [sensor.station_id, sensor])
    );
  } catch {
    return {};
  }
}

function radarRiskToLevel(status) {
  if (status === "ALERTA") return "ALERTA";
  if (status === "ATENCAO") return "ATENCAO";
  return "NORMAL";
}
`;

if (!app.includes("async function fetchLagoaRadarLevels()")) {
  if (app.includes("// ANA HidroWeb — nível real")) {
    app = replaceOnce(
      app,
      "// ANA HidroWeb — nível real",
      `${radarFunctions}
// ANA HidroWeb — nível real`,
      "funções Lagoa Radar"
    );
  } else {
    console.error("ERRO: não encontrei ponto para inserir funções Lagoa Radar.");
    process.exit(1);
  }
}

// 3) Busca radar uma vez por carregamento.
if (!app.includes("const lagoaRadarByStationId = await fetchLagoaRadarLevels();")) {
  app = replaceOnce(
    app,
    `    const results = {};
    const newAlerts = [];
    const cemadenByCityId = await fetchCemadenAccumulations();

    for (const st of STATIONS) {
`,
    `    const results = {};
    const newAlerts = [];
    const cemadenByCityId = await fetchCemadenAccumulations();
    const lagoaRadarByStationId = await fetchLagoaRadarLevels();

    for (const st of STATIONS) {
`,
    "busca Lagoa Radar"
  );
}

// 4) Injeta radar no loop e separa nível real de alerta.
const oldBlock = `        let realLevel = null;
        if (st.anaCode) realLevel = await fetchAnaLevel(st.anaCode);
        const inmet = st.ibgeCode ? await fetchInmetForecast(st.ibgeCode) : null;
        const cemaden = cemadenByCityId[st.id] || null;
        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
        const tempMin  = Math.min(...(weather.daily?.temperature_2m_min||[20]));
        const windMax  = Math.max(...(weather.daily?.windspeed_10m_max||[0]));
        // lagoa.atual: só dado real ANA — nunca simulado
        // lagoa.projetado: removido (fórmula empírica sem base hidrológica)
        const lagoa = st.type==="lagoa" ? {
          atual:  realLevel, // null quando ANA indisponível — exibido como "–"
          isReal: realLevel !== null,
        } : null;
        // Risco da lagoa só entra no score quando há dado real
        const risk = getRiskLevel(precip, tempMin, windMax, lagoa?.isReal ? lagoa.atual : null);
        results[st.id] = { weather, inmet, cemaden, lagoa, precip, tempMin, windMax, risk, realLevel };`;

const newBlock = `        let realLevel = null;
        if (st.anaCode) realLevel = await fetchAnaLevel(st.anaCode);
        const radarLevel = lagoaRadarByStationId[st.id] || null;
        const inmet = st.ibgeCode ? await fetchInmetForecast(st.ibgeCode) : null;
        const cemaden = cemadenByCityId[st.id] || null;
        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
        const tempMin  = Math.min(...(weather.daily?.temperature_2m_min||[20]));
        const windMax  = Math.max(...(weather.daily?.windspeed_10m_max||[0]));

        // Nível real disponível: prioriza RADAR da Lagoa quando houver sensor validado.
        // ANA permanece como fonte complementar/parcial.
        const lagoa = st.type==="lagoa" ? {
          atual: radarLevel?.level_m ?? realLevel,
          isReal: Boolean(radarLevel?.level_m ?? realLevel),
          source: radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null),
          radar: radarLevel,
          anaLevel: realLevel,
          threshold_m: radarLevel?.threshold_m ?? null,
          levelStatus: radarLevel?.status ?? "SEM_LIMIAR",
        } : null;

        // Não usa limiar único de 0,8m. Risco de nível só entra quando a fonte traz limiar próprio validado.
        const baseRisk = getRiskLevel(precip, tempMin, windMax, null);
        const levelRisk = lagoa?.radar ? radarRiskToLevel(lagoa.levelStatus) : "NORMAL";
        const order = ["NORMAL","ATENCAO","ALERTA","EMERGENCIA","CRITICO"];
        const risk = order.indexOf(levelRisk) > order.indexOf(baseRisk) ? levelRisk : baseRisk;
        results[st.id] = { weather, inmet, cemaden, lagoa, precip, tempMin, windMax, risk, realLevel, radarLevel };`;

if (app.includes(oldBlock)) {
  app = app.replace(oldBlock, newBlock);
} else if (!app.includes("radarLevel = lagoaRadarByStationId")) {
  console.error("ERRO: não encontrei bloco do loop principal para trocar.");
  process.exit(1);
}

// 5) Ajusta geração de alertas locais para nível radar com limiar próprio.
app = app.replace(
  'if (lagoa?.isReal && lagoa.atual>0.8) parts.push(`lagoa ${lagoa.atual.toFixed(2)}m (ANA)`);',
  'if (lagoa?.radar && lagoa.levelStatus === "ALERTA") parts.push(`lagoa ${lagoa.atual.toFixed(2)}m / limiar ${lagoa.threshold_m.toFixed(2)}m (RADAR)`);'
);

// 6) Atualiza texto de ANA se existir e adiciona fonte radar se a lista tiver Fonte de Dados.
app = app.replace(
  /{ n:"ANA HidroWeb"[^}]+}/,
  `{ n:"ANA HidroWeb",               st:"ATIVO PARCIAL", c:"#22c55e", d:"Nível real por telemetria ANA quando a estação possui dados no período. Mantida como fonte complementar.", a:"Supabase Edge Function", h:"Endpoint: ana-rs?codEstacao=. Parser usa <Nivel> em cm e converte para metros." }`
);

// Adiciona item de fonte RADAR após ANA HidroWeb, se conseguir localizar o item ANA.
if (!app.includes('n:"Lagoa dos Patos RADAR"')) {
  app = app.replace(
    `{ n:"ANA HidroWeb",               st:"ATIVO PARCIAL", c:"#22c55e", d:"Nível real por telemetria ANA quando a estação possui dados no período. Mantida como fonte complementar.", a:"Supabase Edge Function", h:"Endpoint: ana-rs?codEstacao=. Parser usa <Nivel> em cm e converte para metros." }`,
    `{ n:"ANA HidroWeb",               st:"ATIVO PARCIAL", c:"#22c55e", d:"Nível real por telemetria ANA quando a estação possui dados no período. Mantida como fonte complementar.", a:"Supabase Edge Function", h:"Endpoint: ana-rs?codEstacao=. Parser usa <Nivel> em cm e converte para metros." },
    { n:"Lagoa dos Patos RADAR",       st:"ATIVO",     c:"#22c55e", d:"Níveis reais por sensores RADAR do portal Monitoramento da Lagoa dos Patos, com limiares próprios por sensor.", a:"API pública via Edge Function", h:"Endpoint: lagoa-patos-radar. Sensores: FURG CCMAR, São Lourenço, Arambaré, São José do Norte e Itapuã." }`
  );
}

// 7) Atualiza rodapé.
app = app.replace(
  "Open-Meteo + INMET + CEMADEN + ANA HidroWeb + NOAA ENSO + INPE + Copernicus",
  "Open-Meteo + INMET + CEMADEN + Lagoa RADAR + ANA HidroWeb + NOAA ENSO + INPE + Copernicus"
);

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado com Lagoa dos Patos RADAR.");
console.log("Backup preservado em src/App.jsx.backup-lagoa-radar.");
console.log("Agora rode: npm run build");
