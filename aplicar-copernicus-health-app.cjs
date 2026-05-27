const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-copernicus-health");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-copernicus-health");
}

function insertAfter(anchor, text, label) {
  if (!app.includes(anchor)) {
    console.warn(`AVISO: âncora não encontrada para ${label}.`);
    return false;
  }
  app = app.replace(anchor, anchor + text);
  return true;
}

// 1) Constante da Edge Function.
if (!app.includes("COPERNICUS_HEALTH_FUNCTION_URL")) {
  const anchor =
    'const CPTEC_INPE_PRODUCTS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cptec-inpe-produtos";';

  if (!insertAfter(anchor, '\nconst COPERNICUS_HEALTH_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-health";', "COPERNICUS_HEALTH_FUNCTION_URL")) {
    insertAfter(
      'const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";',
      '\nconst COPERNICUS_HEALTH_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-health";',
      "COPERNICUS_HEALTH_FUNCTION_URL fallback"
    );
  }
}

// 2) Fetch.
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
    insertAfter("// NOAA/CPC", "\n" + fetchFn, "fetchCopernicusHealth fallback");
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

// 4) useEffect.
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

// 5) Atualiza texto da fonte Copernicus sem marcar como ativo final.
app = app.replaceAll(
  "Copernicus — Indicadores de referência",
  "Copernicus — Autenticação/API"
);

app = app.replaceAll(
  "NDVI, SPI-3, IQA e nível do mar permanecem como referência estática; APIs reais exigem cadastro/token.",
  "Health check de autenticação preparado. Produtos NDVI/água/Sentinel dependem de credenciais válidas."
);

app = app.replaceAll(
  "Copernicus — Indicadores",
  "Copernicus — Autenticação/API"
);

// 6) Inserção visual leve na aba Copernicus, se a seção existir.
// Faz uma inserção tolerante: adiciona um bloco antes do primeiro conteúdo da aba copernicus quando encontra activeTab==="copernicus".
if (!app.includes("Status Copernicus API")) {
  const needle = 'activeTab==="copernicus" && (';
  const idx = app.indexOf(needle);

  if (idx >= 0) {
    const insertPoint = app.indexOf("<div", idx);
    if (insertPoint >= 0) {
      const block = `<div style={{ ...s.card, marginBottom:12, border:\`1px solid \${copernicusHealth?.ok ? "#22c55e55" : t.border}\` }}>
              <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>Status Copernicus API</div>
              <div style={{ fontSize:16, fontWeight:900, color:copernicusHealth?.ok ? "#22c55e" : "#eab308", marginTop:2 }}>
                {copernicusHealth?.status || "VERIFICANDO"}
              </div>
              <div style={{ fontSize:10, color:t.textMuted, marginTop:5 }}>
                {copernicusHealth?.ok
                  ? "Autenticação validada. Próximo passo: ativar produto NDVI/água/Sentinel."
                  : copernicusHealth?.status === "NOT_CONFIGURED"
                    ? "Secrets ainda não configurados no Supabase."
                    : "Health check preparado; aguardando credenciais ou validação."}
              </div>
              <div style={{ fontSize:8, color:t.textMuted, marginTop:6 }}>
                Última consulta: {copernicusHealth?.fetched_at ? formatDateTimeBR(copernicusHealth.fetched_at) : "—"}
              </div>
            </div>
            `;
      app = app.slice(0, insertPoint + 4) + "\n            " + block + app.slice(insertPoint + 4);
    } else {
      console.warn("AVISO: seção Copernicus encontrada, mas não achei ponto de inserção visual.");
    }
  } else {
    console.warn("AVISO: não encontrei activeTab copernicus para inserir health card visual. Função e state foram adicionados.");
  }
}

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado com Copernicus health check.");
console.log("Backup preservado em src/App.jsx.backup-copernicus-health.");
console.log("Agora rode: npm run build");
