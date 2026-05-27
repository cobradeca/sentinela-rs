const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-sentinel1-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) {
    console.error("ERRO: trecho não encontrado:", label);
    process.exit(1);
  }
  app = app.replace(search, replacement);
  console.log("OK:", label);
}

if (!app.includes("COPERNICUS_SENTINEL1_FUNCTION_URL")) {
  replaceOnce(
    'const COPERNICUS_WATER_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-water";',
    'const COPERNICUS_WATER_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-water";\nconst COPERNICUS_SENTINEL1_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-sentinel1-water";',
    "constante COPERNICUS_SENTINEL1_FUNCTION_URL"
  );
}

if (!app.includes("async function fetchCopernicusSentinel1")) {
  const anchor = `async function fetchCopernicusWater(aoi = "lagoa_patos", days = 30) {
  try {
    const url = \`\${COPERNICUS_WATER_FUNCTION_URL}?aoi=\${encodeURIComponent(aoi)}&days=\${encodeURIComponent(days)}\`;
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.ok !== true || typeof data.water_percent !== "number") return data || null;

    return data;
  } catch {
    return null;
  }
}
`;
  const block = `${anchor}
async function fetchCopernicusSentinel1(aoi = "lagoa_patos", days = 18) {
  try {
    const url = \`\${COPERNICUS_SENTINEL1_FUNCTION_URL}?aoi=\${encodeURIComponent(aoi)}&days=\${encodeURIComponent(days)}\`;
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || typeof data.water_like_percent !== "number") return data || null;

    return data;
  } catch {
    return null;
  }
}
`;
  replaceOnce(anchor, block, "fetchCopernicusSentinel1");
}

if (!app.includes("const [copernicusS1")) {
  replaceOnce(
    '  const [copernicusWater, setCopernicusWater] = useState(null);',
    '  const [copernicusWater, setCopernicusWater] = useState(null);\n  const [copernicusS1, setCopernicusS1] = useState(null);',
    "state copernicusS1"
  );
}

if (!app.includes("loadCopernicusSentinel1")) {
  const anchor = `  useEffect(() => {
    let alive = true;

    async function loadCopernicusWater() {
      const data = await fetchCopernicusWater("lagoa_patos", 30);
      if (!alive) return;
      setCopernicusWater(data);
    }

    loadCopernicusWater();
    const iv = setInterval(loadCopernicusWater, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);
`;
  const block = `${anchor}
  useEffect(() => {
    let alive = true;

    async function loadCopernicusSentinel1() {
      const data = await fetchCopernicusSentinel1("lagoa_patos", 18);
      if (!alive) return;
      setCopernicusS1(data);
    }

    loadCopernicusSentinel1();
    const iv = setInterval(loadCopernicusSentinel1, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);
`;
  replaceOnce(anchor, block, "useEffect copernicusS1");
}

if (!app.includes("COPERNICUS SENTINEL-1")) {
  const anchor = `            <div style={{ padding:"8px 14px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color: dark?"#fef08a":"#854d0e" }}>
              🗓 <strong>Referências históricas:</strong> os cartões abaixo não são SITREP operacional. São contexto técnico/histórico separado da leitura Copernicus Water acima.
            </div>`;
  const s1Card = `            <div style={{ ...s.card, border:\`1px solid \${copernicusS1?.water_like_percent !== undefined ? "#8b5cf655" : "#eab30855"}\` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS SENTINEL-1</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>
                    {copernicusS1?.aoi || "Lagoa dos Patos"}
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    Radar SAR · água/alagamento sob nuvens/noite
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:\`1px solid \${copernicusS1?.water_like_percent !== undefined ? "#8b5cf6" : "#eab308"}\`, color:copernicusS1?.water_like_percent !== undefined ? "#8b5cf6" : "#eab308" }}>
                  {copernicusS1?.water_like_percent !== undefined ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusS1?.water_like_percent !== undefined ? (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
                    {[
                      { l:"Indicador SAR água", v:\`\${copernicusS1.water_like_percent}%\`, c:"#8b5cf6" },
                      { l:"VV médio", v: typeof copernicusS1.vv_db_mean === "number" ? \`\${copernicusS1.vv_db_mean.toFixed(2)} dB\` : "–", c:"#60a5fa" },
                      { l:"VH médio", v: typeof copernicusS1.vh_db_mean === "number" ? \`\${copernicusS1.vh_db_mean.toFixed(2)} dB\` : "–", c:"#22d3ee" },
                      { l:"Cobertura válida", v: typeof copernicusS1.valid_coverage_percent === "number" ? \`\${copernicusS1.valid_coverage_percent}%\` : "–", c:"#22c55e" },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.25)":t.bg, border:\`1px solid \${t.border}\`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>{item.l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:item.c, marginTop:3 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
                    Período: {copernicusS1.period?.from ? formatDateTimeBR(copernicusS1.period.from) : "–"} → {copernicusS1.period?.to ? formatDateTimeBR(copernicusS1.period.to) : "–"} · Consulta: {copernicusS1.fetched_at ? formatDateTimeBR(copernicusS1.fetched_at) : "sem horário"}
                  </div>

                  <div style={{ marginTop:8, padding:"8px 10px", background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color:dark?"#fef08a":"#854d0e", lineHeight:1.5 }}>
                    ⚠ {copernicusS1.limitation || "Indicador SAR de baixa retroespalhamento compatível com água; confirmar com órgãos responsáveis."}
                  </div>

                  <div style={{ marginTop:6, fontSize:8, color:t.textFaint }}>
                    Fonte: {copernicusS1.source} · Método: {copernicusS1.method}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  Produto Sentinel-1 ainda não carregado nesta sessão. Se persistir, rode o diagnóstico do endpoint.
                </div>
              )}
            </div>

${anchor}`;
  replaceOnce(anchor, s1Card, "card Sentinel-1 na aba Copernicus");
}

fs.writeFileSync(appPath, app, "utf8");

console.log("App integrado com Copernicus Sentinel-1.");
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
