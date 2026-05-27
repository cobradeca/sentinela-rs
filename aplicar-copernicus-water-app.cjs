const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-integrar-copernicus-water-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) {
    console.error("ERRO: trecho não encontrado:", label);
    process.exit(1);
  }
  app = app.replace(search, replacement);
  console.log("OK:", label);
}

if (!app.includes("COPERNICUS_WATER_FUNCTION_URL")) {
  replaceOnce(
    'const CPTEC_INPE_PRODUCTS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cptec-inpe-produtos";',
    'const CPTEC_INPE_PRODUCTS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cptec-inpe-produtos";\nconst COPERNICUS_WATER_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-water";',
    "constante COPERNICUS_WATER_FUNCTION_URL"
  );
}

if (!app.includes("async function fetchCopernicusWater")) {
  const anchor = `async function fetchCptecInpeProducts() {
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
  const block = `${anchor}
async function fetchCopernicusWater(aoi = "lagoa_patos", days = 30) {
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
  replaceOnce(anchor, block, "fetchCopernicusWater");
}

if (!app.includes("const [copernicusWater")) {
  replaceOnce(
    '  const [cptecProducts, setCptecProducts]   = useState(null);',
    '  const [cptecProducts, setCptecProducts]   = useState(null);\n  const [copernicusWater, setCopernicusWater] = useState(null);',
    "state copernicusWater"
  );
}

if (!app.includes("loadCopernicusWater")) {
  const anchor = `  useEffect(() => {
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
  const block = `${anchor}
  useEffect(() => {
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
  replaceOnce(anchor, block, "useEffect copernicusWater");
}

const start = app.indexOf('        {/* ══ COPERNICUS ══ */}');
const end = app.indexOf('        {/* ══ QUEIMADAS / APAs ══ */}', start);

if (start < 0 || end < 0 || end <= start) {
  console.error("ERRO: não encontrei bloco Copernicus/Queimadas.");
  process.exit(1);
}

const newBlock = `        {/* ══ COPERNICUS ══ */}
        {activeTab==="copernicus" && (
          <div style={{ display:"grid", gap:12 }}>
            <div style={{ padding:"10px 14px", background: dark?"rgba(139,92,246,0.08)":"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.3)", borderRadius:5, fontSize:10, color: dark?"#c4b5fd":"#7c3aed" }}>
              🛰️ <strong>Copernicus — produto real ativo</strong> · Sentinel-2 L2A / NDWI para água superficial. Uso: contexto hidrológico por satélite.
            </div>

            <div style={{ ...s.card, border:\`1px solid \${copernicusWater?.ok ? "#22c55e55" : "#eab30855"}\` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS WATER</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>
                    {copernicusWater?.aoi || "Lagoa dos Patos"}
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    {copernicusWater?.product || "Sentinel-2 L2A NDWI water indicator"}
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:\`1px solid \${copernicusWater?.ok ? "#22c55e" : "#eab308"}\`, color:copernicusWater?.ok ? "#22c55e" : "#eab308" }}>
                  {copernicusWater?.ok ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusWater?.ok ? (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
                    {[
                      { l:"Água superficial", v:\`\${copernicusWater.water_percent}%\`, c:"#22d3ee" },
                      { l:"NDWI médio", v: typeof copernicusWater.ndwi_mean === "number" ? copernicusWater.ndwi_mean.toFixed(3) : "–", c:"#60a5fa" },
                      { l:"Cobertura válida", v: typeof copernicusWater.valid_coverage_percent === "number" ? \`\${copernicusWater.valid_coverage_percent}%\` : "–", c:"#22c55e" },
                      { l:"Amostras", v: copernicusWater.sample_count?.toLocaleString("pt-BR") || "–", c:t.text },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.25)":t.bg, border:\`1px solid \${t.border}\`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>{item.l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:item.c, marginTop:3 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
                    Período: {copernicusWater.period?.from ? formatDateTimeBR(copernicusWater.period.from) : "–"} → {copernicusWater.period?.to ? formatDateTimeBR(copernicusWater.period.to) : "–"} · Consulta: {copernicusWater.fetched_at ? formatDateTimeBR(copernicusWater.fetched_at) : "sem horário"}
                  </div>

                  <div style={{ marginTop:8, padding:"8px 10px", background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color:dark?"#fef08a":"#854d0e", lineHeight:1.5 }}>
                    ⚠ {copernicusWater.limitation || "Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, usar Sentinel-1."}
                  </div>

                  <div style={{ marginTop:6, fontSize:8, color:t.textFaint }}>
                    Fonte: {copernicusWater.source} · Regra: {copernicusWater.threshold}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  Produto real ainda não carregado nesta sessão. A função Copernicus Water já existe; se persistir, verificar a aba Fontes de Dados ou rodar o auditor.
                </div>
              )}
            </div>

            <div style={{ padding:"8px 14px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color: dark?"#fef08a":"#854d0e" }}>
              🗓 <strong>Referências históricas:</strong> os cartões abaixo não são SITREP operacional. São contexto técnico/histórico separado da leitura Copernicus Water acima.
            </div>

            <div style={{ display:"grid", gap:8 }}>
              {COPERNICUS_REFERENCE.themes.map(theme=>(
                <div key={theme.id} style={{ background:t.cardBg, border:\`1px solid \${theme.color}44\`, borderLeft:\`4px solid \${theme.color}\`, borderRadius:5, overflow:"hidden", boxShadow:t.shadowCard }}>
                  <div style={{ padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:11 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:20 }}>{theme.icon}</span>
                        <div style={{ fontSize:13, fontWeight:600, color:t.text }}>{theme.name}</div>
                        <div style={{ fontSize:8, padding:"2px 7px", border:\`1px solid \${theme.color}\`, color:theme.color, borderRadius:3, letterSpacing:2 }}>REFERÊNCIA</div>
                      </div>
                      <div style={{ fontSize:10, color:t.textMuted, marginBottom:4, lineHeight:1.5 }}><strong style={{ color:t.text }}>Histórico RS:</strong> {theme.rsHistory}</div>
                      <div style={{ fontSize:9, color:t.textFaint }}>📡 {theme.copSource}</div>
                    </div>
                    <div style={{ flexShrink:0, textAlign:"right", maxWidth:170 }}>
                      <div style={{ fontSize:8, color:"#eab308", marginBottom:4 }}>○ NÃO OPERACIONAL</div>
                      <div style={{ fontSize:9, color:theme.color, fontWeight:600, textAlign:"right", lineHeight:1.4 }}>{theme.indicator}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

`;

app = app.slice(0, start) + newBlock + app.slice(end);

fs.writeFileSync(appPath, app, "utf8");

console.log("Copernicus Water integrado visualmente na aba Copernicus.");
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
