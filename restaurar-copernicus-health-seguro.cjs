const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
const healthBackupPath = path.join(process.cwd(), "src", "App.jsx.backup-copernicus-health");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx.");
  process.exit(1);
}

const rescueBackupPath = path.join(process.cwd(), "src", "App.jsx.backup-eof-quebrado");
if (!fs.existsSync(rescueBackupPath)) {
  fs.writeFileSync(rescueBackupPath, fs.readFileSync(appPath, "utf8"), "utf8");
  console.log("Backup do arquivo quebrado criado em src/App.jsx.backup-eof-quebrado");
}

let app;

if (fs.existsSync(healthBackupPath)) {
  app = fs.readFileSync(healthBackupPath, "utf8");
  console.log("Restaurado a partir de src/App.jsx.backup-copernicus-health");
} else {
  app = fs.readFileSync(appPath, "utf8");
  console.log("AVISO: backup-copernicus-health não encontrado. Tentando correção no arquivo atual.");
}

// Funções utilitárias tolerantes.
function insertAfter(anchor, text, label) {
  if (app.includes(text.trim())) return true;
  if (!app.includes(anchor)) {
    console.warn(`AVISO: âncora não encontrada para ${label}.`);
    return false;
  }
  app = app.replace(anchor, anchor + text);
  console.log(`OK: ${label}`);
  return true;
}

// 1) Constante Copernicus, sem mexer no JSX.
if (!app.includes("COPERNICUS_HEALTH_FUNCTION_URL")) {
  const cptecAnchor = 'const CPTEC_INPE_PRODUCTS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cptec-inpe-produtos";';
  const hidrosensAnchor = 'const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";';
  if (!insertAfter(cptecAnchor, '\nconst COPERNICUS_HEALTH_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-health";', "constante Copernicus")) {
    insertAfter(hidrosensAnchor, '\nconst COPERNICUS_HEALTH_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-health";', "constante Copernicus fallback");
  }
}

// 2) Fetch Copernicus seguro, inserido fora do JSX.
const fetchFn = `
// Copernicus — health check de autenticação via Edge Function.
// Não consulta produtos ainda. Apenas valida se os secrets estão configurados e se gera token.
async function fetchCopernicusHealth() {
  try {
    const res = await fetch(COPERNICUS_HEALTH_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

`;

if (!app.includes("async function fetchCopernicusHealth()")) {
  if (!insertAfter("// CPTEC/INPE", "\n" + fetchFn, "fetchCopernicusHealth")) {
    if (!insertAfter("// NOAA/CPC", "\n" + fetchFn, "fetchCopernicusHealth fallback")) {
      insertAfter("// ─── APP", "\n" + fetchFn, "fetchCopernicusHealth antes do APP");
    }
  }
}

// 3) State.
if (!app.includes("const [copernicusHealth, setCopernicusHealth]")) {
  if (!insertAfter(
    '  const [cptecProducts, setCptecProducts]   = useState(null);',
    '\n  const [copernicusHealth, setCopernicusHealth] = useState(null);',
    "state copernicusHealth"
  )) {
    insertAfter(
      '  const [queimadas, setQueimadas]       = useState(null);',
      '\n  const [copernicusHealth, setCopernicusHealth] = useState(null);',
      "state copernicusHealth fallback"
    );
  }
}

// 4) useEffect para carregar health check, sem renderizar card novo.
const effect = `
  useEffect(() => {
    let alive = true;

    async function loadCopernicusHealth() {
      const data = await fetchCopernicusHealth();
      if (!alive || !data) return;
      setCopernicusHealth(data);
    }

    loadCopernicusHealth();
    const iv = setInterval(loadCopernicusHealth, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

`;

if (!app.includes("loadCopernicusHealth")) {
  if (!insertAfter("  useEffect(() => {\n    let alive = true;\n\n    async function loadCptecProducts() {", effect + "  useEffect(() => {\n    let alive = true;\n\n    async function loadCptecProducts() {", "useEffect Copernicus")) {
    insertAfter("  useEffect(() => {\n    loadAllData();", effect + "  useEffect(() => {\n    loadAllData();", "useEffect Copernicus fallback");
  }
}

// 5) Atualiza textos sem criar JSX novo.
app = app.replaceAll("Copernicus — Indicadores de referência", "Copernicus — Autenticação/API");
app = app.replaceAll(
  "NDVI, SPI-3, IQA e nível do mar permanecem como referência estática; APIs reais exigem cadastro/token.",
  "Health check de autenticação preparado. Produtos NDVI/água/Sentinel dependem de credenciais válidas."
);
app = app.replaceAll("Copernicus — Indicadores", "Copernicus — Autenticação/API");

// 6) Evita variável não usada causando problema? Vite não falha por unused.
// Para expor estado sem mexer no JSX, acrescenta marcador no console de desenvolvimento apenas se não existir.
if (!app.includes("copernicusHealth?.status")) {
  // Não inserir JSX. Apenas mantém state carregado.
}

// 7) Remove padrões quebrados conhecidos caso o backup não existisse.
app = app.replace(/\{activeTab==="copernicus"\s*&&\s*\(\s*\n\s*<div\s*\n\s*<div/g, '{activeTab==="copernicus" && (\n          <div>\n            <div');

// Salva.
fs.writeFileSync(appPath, app, "utf8");

// 8) Checagens simples.
const text = fs.readFileSync(appPath, "utf8");
const openCurly = (text.match(/\{/g) || []).length;
const closeCurly = (text.match(/\}/g) || []).length;
const brokenDiv = /^\s*<div\s*$/m.test(text);

console.log("App.jsx restaurado com integração Copernicus segura, sem mexer na renderização da aba.");
console.log(`Chaves: {=${openCurly} }=${closeCurly}`);
if (brokenDiv) {
  console.log("AVISO: existe linha '<div' sem fechamento. Se o build falhar, envie o trecho indicado.");
}
console.log("Agora rode: npm run build");
