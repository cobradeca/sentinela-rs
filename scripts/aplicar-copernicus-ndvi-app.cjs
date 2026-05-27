const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-ndvi-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) {
    console.error("ERRO: trecho não encontrado:", label);
    process.exit(1);
  }
  app = app.replace(search, replacement);
  console.log("OK:", label);
}

if (!app.includes("COPERNICUS_NDVI_FUNCTION_URL")) {
  replaceOnce(
    'const COPERNICUS_SENTINEL1_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-sentinel1-water";',
    'const COPERNICUS_SENTINEL1_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-sentinel1-water";\nconst COPERNICUS_NDVI_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-ndvi";',
    "constante COPERNICUS_NDVI_FUNCTION_URL"
  );
}

if (!app.includes("async function fetchCopernicusNdvi")) {
  const anchor = `async function fetchCopernicusSentinel1(aoi = "lagoa_patos", days = 18) {
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
  const block = `${anchor}
async function fetchCopernicusNdvi(aoi = "entorno_lagoa_patos", days = 30) {
  try {
    const url = \`\${COPERNICUS_NDVI_FUNCTION_URL}?aoi=\${encodeURIComponent(aoi)}&days=\${encodeURIComponent(days)}\`;
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || typeof data.ndvi_mean !== "number") return data || null;

    return data;
  } catch {
    return null;
  }
}
`;
  replaceOnce(anchor, block, "fetchCopernicusNdvi");
}

if (!app.includes("const [copernicusNdvi")) {
  replaceOnce(
    '  const [copernicusS1, setCopernicusS1] = useState(null);',
    '  const [copernicusS1, setCopernicusS1] = useState(null);\n  const [copernicusNdvi, setCopernicusNdvi] = useState(null);',
    "state copernicusNdvi"
  );
}

if (!app.includes("loadCopernicusNdvi")) {
  const anchor = `  useEffect(() => {
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
  const block = `${anchor}
  useEffect(() => {
    let alive = true;

    async function loadCopernicusNdvi() {
      const data = await fetchCopernicusNdvi("entorno_lagoa_patos", 30);
      if (!alive) return;
      setCopernicusNdvi(data);
    }

    loadCopernicusNdvi();
    const iv = setInterval(loadCopernicusNdvi, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);
`;
  replaceOnce(anchor, block, "useEffect copernicusNdvi");
}

if (!app.includes("COPERNICUS NDVI")) {
  const anchor = `            <div style={{ padding:"8px 14px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color: dark?"#fef08a":"#854d0e" }}>
              🗓 <strong>Referências históricas:</strong> os cartões abaixo não são SITREP operacional. São contexto técnico/histórico separado da leitura Copernicus Water acima.
            </div>`;
  const card = `            <div style={{ ...s.card, border:\`1px solid \${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e55" : "#eab30855"}\` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS NDVI</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>
                    {copernicusNdvi?.aoi || "Entorno terrestre da Lagoa dos Patos"}
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    Vegetação/estiagem · Sentinel-2 L2A
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:\`1px solid \${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308"}\`, color:copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308" }}>
                  {copernicusNdvi?.ndvi_mean !== undefined ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusNdvi?.ndvi_mean !== undefined ? (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
                    {[
                      { l:"NDVI médio", v:copernicusNdvi.ndvi_mean.toFixed(3), c:"#22c55e" },
                      { l:"Vegetação saudável", v: typeof copernicusNdvi.vegetation_percent === "number" ? \`\${copernicusNdvi.vegetation_percent}%\` : "–", c:"#16a34a" },
                      { l:"Vegetação baixa", v: typeof copernicusNdvi.low_vegetation_percent === "number" ? \`\${copernicusNdvi.low_vegetation_percent}%\` : "–", c:"#eab308" },
                      { l:"Cobertura válida", v: typeof copernicusNdvi.valid_coverage_percent === "number" ? \`\${copernicusNdvi.valid_coverage_percent}%\` : "–", c:"#22d3ee" },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.25)":t.bg, border:\`1px solid \${t.border}\`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>{item.l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:item.c, marginTop:3 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
                    Período: {copernicusNdvi.period?.from ? formatDateTimeBR(copernicusNdvi.period.from) : "–"} → {copernicusNdvi.period?.to ? formatDateTimeBR(copernicusNdvi.period.to) : "–"} · Consulta: {copernicusNdvi.fetched_at ? formatDateTimeBR(copernicusNdvi.fetched_at) : "sem horário"}
                  </div>

                  <div style={{ marginTop:8, padding:"8px 10px", background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color:dark?"#fef08a":"#854d0e", lineHeight:1.5 }}>
                    ⚠ {copernicusNdvi.limitation || "NDVI é contexto de vegetação/estiagem e não gera alerta automático sozinho."}
                  </div>

                  <div style={{ marginTop:6, fontSize:8, color:t.textFaint }}>
                    Fonte: {copernicusNdvi.source} · Método: {copernicusNdvi.method}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  Produto NDVI ainda não carregado nesta sessão. Se persistir, rode o diagnóstico do endpoint.
                </div>
              )}
            </div>

${anchor}`;
  replaceOnce(anchor, card, "card NDVI na aba Copernicus");
}

app = app.replace(
  '{ n:"Copernicus — NDVI / Vegetação", st:"PRÓXIMO OPCIONAL", c:"#eab308", d:"Ainda não operacional. Pode ser usado depois como contexto de estiagem/vegetação, separado dos alertas hidrológicos.", a:"Copernicus Data Space / Sentinel Hub", h:"Não usar placeholder. Só ativar depois de endpoint real NDVI responder com fonte, período e auditoria." },',
  '{ n:"Copernicus NDVI / Vegetação", st:"ATIVO", c:"#22c55e", d:"Indicador real de vegetação/estiagem por Sentinel-2 L2A/NDVI. Contexto ambiental; não aciona alerta sozinho.", a:"Copernicus Data Space / Sentinel Hub", h:"Endpoint: copernicus-ndvi. Produto óptico: depende de baixa nebulosidade. Usar como contexto, não como alerta automático." },'
);

fs.writeFileSync(appPath, app, "utf8");

console.log("App integrado com Copernicus NDVI.");
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
