const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-hidrosens-laranjal");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-hidrosens-laranjal");
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  return source.replace(search, replacement);
}

// 1) Constante da função HidroSens.
if (!app.includes("HIDROSENS_LARANJAL_FUNCTION_URL")) {
  app = replaceOnce(
    app,
    'const LAGOA_RADAR_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/lagoa-patos-radar";\n',
    'const LAGOA_RADAR_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/lagoa-patos-radar";\nconst HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";\n',
    "constante HIDROSENS_LARANJAL_FUNCTION_URL"
  );
}

// 2) Função de leitura HidroSens/Laranjal.
const helper = `
// HidroSens/UFPel — Estação Laranjal / Pelotas.
// Fonte específica para o ponto Pelotas/Laranjal, via ThingsBoard público.
async function fetchHidroSensLaranjalLevel() {
  try {
    const res = await fetch(HIDROSENS_LARANJAL_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || typeof data.level_m !== "number") return null;

    return {
      ok: true,
      station_id: data.station_id,
      name: data.name,
      source_label: "HidroSens/UFPel",
      measured_at: data.measured_at,
      received_at: data.fetched_at,
      level_m: data.level_m,
      level_cm: data.level_cm,
      distance_m: data.distance_m,
      sensor_height_m: data.sensor_height_m,
      threshold_m: data.threshold_m ?? null,
      threshold_cm: data.threshold_cm ?? null,
      status: data.status || "SEM_LIMIAR",
      note: data.note,
    };
  } catch {
    return null;
  }
}
`;

if (!app.includes("async function fetchHidroSensLaranjalLevel()")) {
  app = replaceOnce(
    app,
    "async function fetchLagoaRadarLevels() {",
    helper + "\nasync function fetchLagoaRadarLevels() {",
    "função fetchHidroSensLaranjalLevel"
  );
}

// 3) Busca Laranjal uma vez no loadAllData.
if (!app.includes("const hidrosensLaranjal = await fetchHidroSensLaranjalLevel();")) {
  app = replaceOnce(
    app,
    `    const cemadenByCityId = await fetchCemadenAccumulations();
    const lagoaRadarByStationId = await fetchLagoaRadarLevels();

    for (const st of STATIONS) {
`,
    `    const cemadenByCityId = await fetchCemadenAccumulations();
    const lagoaRadarByStationId = await fetchLagoaRadarLevels();
    const hidrosensLaranjal = await fetchHidroSensLaranjalLevel();

    for (const st of STATIONS) {
`,
    "busca HidroSens Laranjal"
  );
}

// 4) Injeta Laranjal em Pelotas e prioriza HidroSens para esse station_id.
if (!app.includes("const hidrosensLevel = st.id === \"lagoa_patos_pelotas\" ? hidrosensLaranjal : null;")) {
  app = replaceOnce(
    app,
    `        const radarLevel = lagoaRadarByStationId[st.id] || null;
        const inmet = st.ibgeCode ? await fetchInmetForecast(st.ibgeCode) : null;
`,
    `        const radarLevel = lagoaRadarByStationId[st.id] || null;
        const hidrosensLevel = st.id === "lagoa_patos_pelotas" ? hidrosensLaranjal : null;
        const inmet = st.ibgeCode ? await fetchInmetForecast(st.ibgeCode) : null;
`,
    "variável hidrosensLevel"
  );
}

const oldLagoa = `        const lagoa = st.type==="lagoa" ? {
          atual: radarLevel?.level_m ?? realLevel,
          isReal: Boolean(radarLevel?.level_m ?? realLevel),
          source: radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null),
          radar: radarLevel,
          anaLevel: realLevel,
          threshold_m: radarLevel?.threshold_m ?? null,
          levelStatus: radarLevel?.status ?? "SEM_LIMIAR",
        } : null;`;

const newLagoa = `        const lagoa = st.type==="lagoa" ? {
          atual: hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel,
          isReal: Boolean(hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel),
          source: hidrosensLevel ? "HIDROSENS" : (radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null)),
          radar: radarLevel,
          hidrosens: hidrosensLevel,
          anaLevel: realLevel,
          threshold_m: hidrosensLevel?.threshold_m ?? radarLevel?.threshold_m ?? null,
          levelStatus: hidrosensLevel?.status ?? radarLevel?.status ?? "SEM_LIMIAR",
        } : null;`;

if (app.includes(oldLagoa)) {
  app = app.replace(oldLagoa, newLagoa);
} else if (!app.includes("hidrosens: hidrosensLevel")) {
  console.error("ERRO: não encontrei bloco const lagoa para atualizar.");
  process.exit(1);
}

// 5) Atualiza helper visual de fonte, se existir.
app = app.replace(
  'if (lagoa?.radar) return "RADAR";',
  'if (lagoa?.hidrosens) return "HIDROSENS";\n  if (lagoa?.radar) return "RADAR";'
);

// 6) Atualiza painel de parâmetros para aceitar HidroSens também.
// Se o patch de parâmetros já estiver aplicado, troca condição e campos.
app = app.replaceAll("d.lagoa?.radar && (", "(d.lagoa?.radar || d.lagoa?.hidrosens) && (");
app = app.replaceAll("d.lagoa.radar.name || station.name", "(d.lagoa.hidrosens?.name || d.lagoa.radar?.name || station.name)");
app = app.replaceAll("d.lagoa.radar.level_cm.toFixed(1)", "(d.lagoa.hidrosens?.level_cm ?? d.lagoa.radar?.level_cm).toFixed(1)");
app = app.replaceAll("d.lagoa.radar.level_m.toFixed(3)", "(d.lagoa.hidrosens?.level_m ?? d.lagoa.radar?.level_m).toFixed(3)");
app = app.replaceAll("d.lagoa.radar.measured_at", "(d.lagoa.hidrosens?.measured_at || d.lagoa.radar?.measured_at)");
app = app.replaceAll("d.lagoa.radar.received_at", "(d.lagoa.hidrosens?.received_at || d.lagoa.radar?.received_at)");
app = app.replaceAll("d.lagoa.radar.threshold_cm.toFixed(0)", "d.lagoa.threshold_m ? (d.lagoa.threshold_m*100).toFixed(0) : \"sem limiar\"");
app = app.replaceAll("d.lagoa.radar.threshold_m.toFixed(2)", "d.lagoa.threshold_m ? d.lagoa.threshold_m.toFixed(2) : \"sem limiar\"");
app = app.replaceAll("(d.lagoa.radar.max_may_2024_m*100).toFixed(0)", "d.lagoa.radar?.max_may_2024_m ? (d.lagoa.radar.max_may_2024_m*100).toFixed(0) : \"–\"");
app = app.replaceAll("d.lagoa.radar.max_may_2024_m.toFixed(2)", "d.lagoa.radar?.max_may_2024_m ? d.lagoa.radar.max_may_2024_m.toFixed(2) : \"–\"");

// 7) Adiciona fonte em Fontes de Dados, se a estrutura foi encontrada.
if (!app.includes('n:"HidroSens Laranjal"')) {
  app = app.replace(
    `{ n:"Lagoa dos Patos RADAR",       st:"ATIVO",     c:"#22c55e", d:"Níveis reais por sensores RADAR do portal Monitoramento da Lagoa dos Patos, com limiares próprios por sensor.", a:"API pública via Edge Function", h:"Endpoint: lagoa-patos-radar. Sensores: FURG CCMAR, São Lourenço, Arambaré, São José do Norte e Itapuã." }`,
    `{ n:"Lagoa dos Patos RADAR",       st:"ATIVO",     c:"#22c55e", d:"Níveis reais por sensores RADAR do portal Monitoramento da Lagoa dos Patos, com limiares próprios por sensor.", a:"API pública via Edge Function", h:"Endpoint: lagoa-patos-radar. Sensores: FURG CCMAR, São Lourenço, Arambaré, São José do Norte e Itapuã." },
    { n:"HidroSens Laranjal",           st:"ATIVO",     c:"#22c55e", d:"Nível real de Pelotas/Laranjal via dashboard público HidroSens/UFPel ThingsBoard.", a:"Login público ThingsBoard via Edge Function", h:"Endpoint: hidrosens-laranjal. Calcula nível = 5.06 - Distance do payload." }`
  );
}

// 8) Rodapé.
app = app.replace(
  "Open-Meteo + INMET + CEMADEN + Lagoa RADAR + ANA HidroWeb + NOAA ENSO + INPE + Copernicus",
  "Open-Meteo + INMET + CEMADEN + Lagoa RADAR + HidroSens + ANA HidroWeb + NOAA ENSO + INPE + Copernicus"
);

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado com HidroSens Laranjal.");
console.log("Backup preservado em src/App.jsx.backup-hidrosens-laranjal.");
console.log("Agora rode: npm run build");
