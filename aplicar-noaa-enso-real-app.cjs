const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-noaa-enso-real");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-noaa-enso-real");
}

function fail(label) {
  console.error(`ERRO: trecho não encontrado para: ${label}`);
  process.exit(1);
}

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) fail(label);
  app = app.replace(search, replacement);
}

// 1) Constante da função NOAA ENSO.
if (!app.includes("NOAA_ENSO_FUNCTION_URL")) {
  replaceOnce(
    'const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";',
    'const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";\nconst NOAA_ENSO_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/noaa-enso";',
    "NOAA_ENSO_FUNCTION_URL"
  );
}

// 2) Função de fetch do ENSO real.
const fetchFn = `
// NOAA/CPC — ENSO observado real via Edge Function.
// Atualiza Niño 3.4 e ONI. Probabilidades IRI permanecem como camada separada até integração própria.
async function fetchNoaaEnso() {
  try {
    const res = await fetch(NOAA_ENSO_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || !data?.enso) return null;

    return data.enso;
  } catch {
    return null;
  }
}

`;

if (!app.includes("async function fetchNoaaEnso()")) {
  replaceOnce(
    "// Previsão 14 dias via Open-Meteo (forecast_days=14)",
    fetchFn + "// Previsão 14 dias via Open-Meteo (forecast_days=14)",
    "fetchNoaaEnso"
  );
}

// 3) Estado ensoLive no componente.
if (!app.includes("const [ensoLive, setEnsoLive]")) {
  replaceOnce(
    '  const [dark, setDark]                 = useState(true);',
    '  const [dark, setDark]                 = useState(true);\n  const [ensoLive, setEnsoLive]         = useState(null);',
    "state ensoLive"
  );
}

// 4) useEffect de atualização ENSO a cada 6h.
const ensoEffect = `
  useEffect(() => {
    let alive = true;

    async function loadEnsoLive() {
      const live = await fetchNoaaEnso();
      if (!alive || !live) return;

      // Mantém forecast/probabilidade do objeto estático até a integração IRI específica.
      setEnsoLive({ ...ENSO, ...live, prob: ENSO.prob, forecast: ENSO.forecast });
    }

    loadEnsoLive();
    const iv = setInterval(loadEnsoLive, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

`;

if (!app.includes("loadEnsoLive")) {
  replaceOnce(
    `  useEffect(() => {
    loadAllData();
    const iv = setInterval(loadAllData, 30*60*1000);
    return () => clearInterval(iv);
  }, [loadAllData]);

`,
    `  useEffect(() => {
    loadAllData();
    const iv = setInterval(loadAllData, 30*60*1000);
    return () => clearInterval(iv);
  }, [loadAllData]);

${ensoEffect}`,
    "useEffect ENSO"
  );
}

// 5) Dentro do componente, trocar usos de ENSO. por activeENSO.
const marker = "export default function SentinelaRS() {";
const idx = app.indexOf(marker);
if (idx < 0) fail("componente SentinelaRS");

const before = app.slice(0, idx);
let body = app.slice(idx);

body = body.replaceAll("ENSO.", "activeENSO.");

if (!body.includes("const activeENSO = ensoLive || ENSO;")) {
  body = body.replace(
    "  const overallRisk = Object.values(stationData).reduce((w,d) => {",
    "  const overallRisk = Object.values(stationData).reduce((w,d) => {"
  );

  body = body.replace(
    `  const ensoClass = classifyENSO(activeENSO.nino34);`,
    `  const activeENSO = ensoLive || ENSO;
  const ensoClass = classifyENSO(activeENSO.nino34);`
  );
}

app = before + body;

// 6) Corrigir caso a inserção não tenha achado a linha por já estar diferente.
if (!app.includes("const activeENSO = ensoLive || ENSO;")) {
  app = app.replace(
    "  const ensoClass = classifyENSO(activeENSO.nino34);",
    "  const activeENSO = ensoLive || ENSO;\n  const ensoClass = classifyENSO(activeENSO.nino34);"
  );
}

// 7) Atualiza textos da aba/fontes quando existirem.
app = app.replaceAll("NOAA/IRI — Índice ENSO", "NOAA/CPC — ENSO observado");
app = app.replaceAll("Dados de referência mai/2026 — requer atualização manual mensal.", "Niño 3.4 e ONI atualizados via Edge Function; probabilidades IRI ainda usam referência estática.");
app = app.replaceAll("ESTÁTICO", "ATIVO PARCIAL");

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado para NOAA/CPC ENSO observado real.");
console.log("Backup preservado em src/App.jsx.backup-noaa-enso-real.");
console.log("Agora rode: npm run build");
