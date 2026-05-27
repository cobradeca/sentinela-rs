const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-cptec-produtos");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-cptec-produtos");
}

function fail(label) {
  console.error(`ERRO: trecho não encontrado: ${label}`);
  process.exit(1);
}

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) fail(label);
  app = app.replace(search, replacement);
}

// 1) Constante da função CPTEC.
if (!app.includes("CPTEC_INPE_PRODUCTS_FUNCTION_URL")) {
  const anchor = 'const IRI_ENSO_PROB_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/iri-enso-probabilidades";';
  if (app.includes(anchor)) {
    replaceOnce(anchor, anchor + '\nconst CPTEC_INPE_PRODUCTS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cptec-inpe-produtos";', "const CPTEC");
  } else {
    replaceOnce(
      'const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";',
      'const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";\nconst CPTEC_INPE_PRODUCTS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cptec-inpe-produtos";',
      "const CPTEC fallback"
    );
  }
}

// 2) Fetch da função CPTEC.
const fetchFn = `
// CPTEC/INPE — produtos oficiais sazonais/subsazonais por imagem.
// São dados reais oficiais publicados como PNG, não série numérica JSON.
async function fetchCptecInpeProducts() {
  try {
    const res = await fetch(CPTEC_INPE_PRODUCTS_FUNCTION_URL, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data?.products)) return null;

    return data;
  } catch {
    return null;
  }
}

`;

if (!app.includes("async function fetchCptecInpeProducts()")) {
  if (app.includes("// IRI/CCSR")) {
    replaceOnce("// IRI/CCSR", fetchFn + "// IRI/CCSR", "fetch CPTEC");
  } else if (app.includes("// Previsão 14 dias via Open-Meteo")) {
    replaceOnce("// Previsão 14 dias via Open-Meteo", fetchFn + "// Previsão 14 dias via Open-Meteo", "fetch CPTEC fallback");
  } else {
    fail("ponto de inserção fetch CPTEC");
  }
}

// 3) State.
if (!app.includes("const [cptecProducts, setCptecProducts]")) {
  if (app.includes("const [ensoProbLive, setEnsoProbLive]")) {
    replaceOnce(
      '  const [ensoProbLive, setEnsoProbLive]     = useState(null);',
      '  const [ensoProbLive, setEnsoProbLive]     = useState(null);\n  const [cptecProducts, setCptecProducts]   = useState(null);',
      "state CPTEC"
    );
  } else {
    replaceOnce(
      '  const [queimadas, setQueimadas]       = useState(null);',
      '  const [queimadas, setQueimadas]       = useState(null);\n  const [cptecProducts, setCptecProducts]   = useState(null);',
      "state CPTEC fallback"
    );
  }
}

// 4) useEffect para CPTEC.
const cptecEffect = `
  useEffect(() => {
    let alive = true;

    async function loadCptecProducts() {
      const data = await fetchCptecInpeProducts();
      if (!alive || !data) return;
      setCptecProducts(data);
    }

    loadCptecProducts();
    const iv = setInterval(loadCptecProducts, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

`;

if (!app.includes("loadCptecProducts")) {
  if (app.includes("loadIriProbabilities")) {
    replaceOnce(
      "  useEffect(() => {\n    let alive = true;\n\n    async function loadIriProbabilities() {",
      cptecEffect + "  useEffect(() => {\n    let alive = true;\n\n    async function loadIriProbabilities() {",
      "useEffect CPTEC"
    );
  } else {
    replaceOnce(
      "  useEffect(() => {\n    loadAllData();",
      cptecEffect + "  useEffect(() => {\n    loadAllData();",
      "useEffect CPTEC fallback"
    );
  }
}

// 5) Aba CPTEC.
if (!app.includes('key:"cptec"')) {
  replaceOnce(
    '    { key:"copernicus", label:"🛰️ Copernicus" },',
    '    { key:"cptec",      label:"🌦️ CPTEC/INPE" },\n    { key:"copernicus", label:"🛰️ Copernicus" },',
    "tab CPTEC"
  );
}

// 6) Seção render CPTEC antes da seção Copernicus.
const cptecSection = `
        {/* ══ CPTEC / INPE ══ */}
        {!loading && activeTab==="cptec" && (
          <div>
            <div style={{ ...s.card, marginBottom:12, border:\`1px solid \${t.borderActive}\` }}>
              <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>CPTEC/INPE</div>
              <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>Produtos sazonais e subsazonais oficiais</div>
              <div style={{ fontSize:10, color:t.textMuted, marginTop:5 }}>
                Produtos gráficos reais do CPTEC/INPE. Atualização verificada via Edge Function. Uso operacional: contexto climático, não alerta local imediato.
              </div>
              <div style={{ marginTop:8, display:"flex", gap:8, flexWrap:"wrap", fontSize:9 }}>
                <span style={{ padding:"4px 8px", border:\`1px solid \${cptecProducts?.ok ? "#22c55e" : "#64748b"}\`, color:cptecProducts?.ok ? "#22c55e" : t.textMuted, borderRadius:4 }}>
                  {cptecProducts?.ok ? "ATIVO" : "CARREGANDO"}
                </span>
                <span style={{ padding:"4px 8px", border:\`1px solid \${t.border}\`, color:t.textMuted, borderRadius:4 }}>
                  Produtos válidos: {cptecProducts?.available ?? 0}/{cptecProducts?.total ?? 0}
                </span>
                <span style={{ padding:"4px 8px", border:\`1px solid \${t.border}\`, color:t.textMuted, borderRadius:4 }}>
                  Última consulta: {cptecProducts?.fetched_at ? formatDateTimeBR(cptecProducts.fetched_at) : "—"}
                </span>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:12 }}>
              {(cptecProducts?.products || []).filter((p) => p.ok).map((p) => (
                <div key={p.id} style={{ ...s.card, overflow:"hidden" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:8, color:t.textMuted, letterSpacing:2 }}>{p.group?.toUpperCase()} · {p.period}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:t.text }}>{p.title}</div>
                    </div>
                    <div style={{ fontSize:8, color:"#22c55e", border:"1px solid #22c55e55", borderRadius:4, padding:"3px 6px" }}>OK</div>
                  </div>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt={p.title} style={{ width:"100%", borderRadius:6, border:\`1px solid \${t.border}\`, background:"#fff" }} />
                  </a>
                  <div style={{ marginTop:7, fontSize:8, color:t.textMuted }}>
                    Fonte: CPTEC/INPE · produto gráfico oficial · {p.contentLength ? \`\${Math.round(p.contentLength/1024)} KB\` : "tamanho não informado"}
                  </div>
                </div>
              ))}
            </div>

            {cptecProducts && !cptecProducts.ok && (
              <div style={{ ...s.card, color:t.textMuted, fontSize:11 }}>
                Nenhum produto CPTEC/INPE validado no momento.
              </div>
            )}
          </div>
        )}

`;

if (!app.includes("Produtos sazonais e subsazonais oficiais")) {
  if (app.includes("        {/* ══ COPERNICUS")) {
    replaceOnce("        {/* ══ COPERNICUS", cptecSection + "        {/* ══ COPERNICUS", "seção CPTEC antes Copernicus");
  } else if (app.includes("{/* ══ COPERNICUS")) {
    replaceOnce("        {/* ══ COPERNICUS", cptecSection + "        {/* ══ COPERNICUS", "seção CPTEC alt");
  } else {
    console.warn("AVISO: não encontrei seção COPERNICUS para inserir a aba CPTEC. A tab foi criada, mas a seção render pode precisar de ajuste manual.");
  }
}

// 7) Atualiza Fontes de Dados.
app = app.replaceAll(
  "CPTEC/INPE\\nPrevisão climática sazonal e boletins oficiais BR; aguardando endpoint público estável.",
  "CPTEC/INPE\\nProdutos sazonais/subsazonais oficiais por imagem via Edge Function."
);
app = app.replaceAll(
  "Previsão climática sazonal e boletins oficiais BR; aguardando endpoint público estável.",
  "Produtos sazonais/subsazonais oficiais por imagem via Edge Function."
);
app = app.replaceAll("CPTEC/INPE\\n", "CPTEC/INPE\\n");

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado com aba CPTEC/INPE e produtos oficiais.");
console.log("Backup preservado em src/App.jsx.backup-cptec-produtos.");
console.log("Agora rode: npm run build");
