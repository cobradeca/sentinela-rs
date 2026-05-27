const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-iri-enso-probabilidades");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-iri-enso-probabilidades");
}

function fail(label) {
  console.error(`ERRO: trecho não encontrado para: ${label}`);
  process.exit(1);
}

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) fail(label);
  app = app.replace(search, replacement);
}

// 1) Constante da Edge Function IRI.
if (!app.includes("IRI_ENSO_PROB_FUNCTION_URL")) {
  if (app.includes('const NOAA_ENSO_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/noaa-enso";')) {
    replaceOnce(
      'const NOAA_ENSO_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/noaa-enso";',
      'const NOAA_ENSO_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/noaa-enso";\nconst IRI_ENSO_PROB_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/iri-enso-probabilidades";',
      "IRI_ENSO_PROB_FUNCTION_URL"
    );
  } else {
    replaceOnce(
      'const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";',
      'const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";\nconst IRI_ENSO_PROB_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/iri-enso-probabilidades";',
      "IRI_ENSO_PROB_FUNCTION_URL fallback"
    );
  }
}

// 2) Fetch da probabilidade IRI.
const fetchFn = `
// IRI/CCSR — Probabilidades ENSO reais via Edge Function.
// Substitui as probabilidades estáticas quando disponível.
async function fetchIriEnsoProbabilities() {
  try {
    const res = await fetch(IRI_ENSO_PROB_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || !data?.prob || !Array.isArray(data?.forecast)) return null;

    return {
      prob: data.prob,
      forecast: data.forecast,
      probabilitySource: data.source,
      probabilityReferenceDate: data.referenceDate,
      probabilityDynamic: true,
      probabilityFetchedAt: data.fetched_at,
      probabilityParsing: data.parsing,
    };
  } catch {
    return null;
  }
}

`;

if (!app.includes("async function fetchIriEnsoProbabilities()")) {
  if (app.includes("// Previsão 14 dias via Open-Meteo (forecast_days=14)")) {
    replaceOnce("// Previsão 14 dias via Open-Meteo (forecast_days=14)", fetchFn + "// Previsão 14 dias via Open-Meteo (forecast_days=14)", "fetchIriEnsoProbabilities");
  } else {
    replaceOnce("async function fetchWeather14Days", fetchFn + "async function fetchWeather14Days", "fetchIriEnsoProbabilities fallback");
  }
}

// 3) State.
if (!app.includes("const [ensoProbLive, setEnsoProbLive]")) {
  replaceOnce(
    '  const [ensoLive, setEnsoLive]         = useState(null);',
    '  const [ensoLive, setEnsoLive]         = useState(null);\n  const [ensoProbLive, setEnsoProbLive]     = useState(null);',
    "state ensoProbLive"
  );
}

// 4) useEffect de atualização IRI a cada 6h.
const iriEffect = `
  useEffect(() => {
    let alive = true;

    async function loadIriProbabilities() {
      const live = await fetchIriEnsoProbabilities();
      if (!alive || !live) return;
      setEnsoProbLive(live);
    }

    loadIriProbabilities();
    const iv = setInterval(loadIriProbabilities, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

`;

if (!app.includes("loadIriProbabilities")) {
  const anchor = `  useEffect(() => {
    let alive = true;

    async function loadEnsoLive() {`;
  if (app.includes(anchor)) {
    replaceOnce(anchor, iriEffect + anchor, "useEffect IRI antes do ENSO observado");
  } else {
    replaceOnce(
      `  useEffect(() => {
    loadAllData();`,
      iriEffect + `  useEffect(() => {
    loadAllData();`,
      "useEffect IRI fallback"
    );
  }
}

// 5) Mescla activeENSO com probabilidades IRI.
// Procura a linha criada no patch NOAA.
if (app.includes("const activeENSO = ensoLive || ENSO;")) {
  app = app.replace(
    "const activeENSO = ensoLive || ENSO;",
    `const observedENSO = ensoLive || ENSO;
  const activeENSO = ensoProbLive ? {
    ...observedENSO,
    prob: ensoProbLive.prob || observedENSO.prob,
    forecast: ensoProbLive.forecast || observedENSO.forecast,
    probabilitySource: ensoProbLive.probabilitySource,
    probabilityReferenceDate: ensoProbLive.probabilityReferenceDate,
    probabilityDynamic: true,
    probabilityFetchedAt: ensoProbLive.probabilityFetchedAt,
    probabilityParsing: ensoProbLive.probabilityParsing,
  } : observedENSO;`
  );
} else if (!app.includes("const observedENSO = ensoLive || ENSO;")) {
  console.warn("AVISO: não encontrei const activeENSO = ensoLive || ENSO;. Verifique manualmente se activeENSO está mesclando IRI.");
}

// 6) Atualiza texto de fontes se existir.
app = app.replaceAll("NOAA/CPC — ENSO observado", "NOAA/CPC + IRI — ENSO");
app = app.replaceAll("Niño 3.4 e ONI atualizados via Edge Function; probabilidades IRI ainda usam referência estática.", "Niño 3.4, ONI e probabilidades ENSO atualizados via Edge Functions.");
app = app.replaceAll("Probabilidades IRI continuam separadas até integração específica.", "Probabilidades IRI integradas via Edge Function.");

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado para probabilidades ENSO IRI reais.");
console.log("Backup preservado em src/App.jsx.backup-iri-enso-probabilidades.");
console.log("Agora rode: npm run build");
