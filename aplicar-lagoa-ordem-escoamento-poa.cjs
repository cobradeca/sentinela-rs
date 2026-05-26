const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-lagoa-ordem-escoamento-poa");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-lagoa-ordem-escoamento-poa");
}

function fail(label) {
  console.error(`ERRO: trecho não encontrado para: ${label}`);
  process.exit(1);
}

function replaceRegex(regex, replacement, label) {
  if (!regex.test(app)) fail(label);
  app = app.replace(regex, replacement);
}

// 1) Reordena a Lagoa no sentido operacional aproximado de escoamento até o mar.
//    Também separa Itapuã/RADAR de Guaíba/ANA para não misturar fontes.
const stationsLagoa = `const STATIONS_LAGOA = [
  // Ordem operacional aproximada: entrada norte / Guaíba → norte da Lagoa → margem oeste/sul → saída para o mar.
  { id: "guaiba_sul_poa",       name: "Guaíba / Sul POA",             displayName: "Sistema Guaíba — Sul POA",              lat: -30.11, lon: -51.18, type: "lagoa", anaCode: "87450004", sourceHint: "ANA", ordemEscoamento: 1 },
  { id: "lagoa_patos_poa",      name: "Itapuã / Norte POA",           displayName: "Lagoa dos Patos — Itapuã / Norte POA", lat: -30.36, lon: -51.03, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 2 },
  { id: "lagoa_patos_arambare", name: "Arambaré",                     displayName: "Lagoa dos Patos — Arambaré",           lat: -30.91, lon: -51.50, type: "lagoa", anaCode: "87540000", sourceHint: "RADAR", ordemEscoamento: 3 },
  { id: "lagoa_sao_lourenco",   name: "São Lourenço do Sul",          displayName: "Lagoa dos Patos — São Lourenço do Sul",lat: -31.36, lon: -51.98, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 4 },
  { id: "lagoa_patos_pelotas",  name: "Pelotas / Laranjal",           displayName: "Lagoa dos Patos — Pelotas / Laranjal",lat: -31.77, lon: -52.34, type: "lagoa", anaCode: "87955000", sourceHint: "HIDROSENS", ordemEscoamento: 5 },
  { id: "lagoa_sao_jose_norte", name: "São José do Norte",            displayName: "Lagoa dos Patos — São José do Norte",  lat: -32.02, lon: -52.04, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 6 },
  { id: "lagoa_rio_grande",     name: "Rio Grande / FURG CCMAR",      displayName: "Lagoa dos Patos — Rio Grande / Barra", lat: -32.03, lon: -52.10, type: "lagoa", anaCode: "87980000", sourceHint: "RADAR", ordemEscoamento: 7 },
];`;

replaceRegex(/const STATIONS_LAGOA = \[[\s\S]*?\];/, stationsLagoa, "STATIONS_LAGOA com Guaíba e ordem de escoamento");

// 2) Garante que o Dashboard usa só cidades, mas o carregamento usa Lagoa + Cidades.
if (app.includes("const STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];")) {
  app = app.replace(
    "const STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];",
    "const STATIONS = [...STATIONS_CIDADES];\nconst ALL_STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];"
  );
} else if (!app.includes("const ALL_STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];")) {
  fail("const ALL_STATIONS");
}

if (app.includes("for (const st of STATIONS) {")) {
  app = app.replace("for (const st of STATIONS) {", "for (const st of ALL_STATIONS) {");
}

app = app.replaceAll("useState(STATIONS[0])", "useState(STATIONS_CIDADES[0])");

// 3) Helper: ANA/Guaíba precisa aparecer como dado real mesmo sem radar/hidrosens.
//    O patch de cards v2 já costuma ter estes helpers; se não tiver, cria.
const helperBlock = `
function formatDateTimeBR(value) {
  if (!value) return "sem horário";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lagoaStatusLabel(status) {
  if (status === "ALERTA") return "Acima da cota";
  if (status === "ATENCAO") return "Atenção";
  if (status === "NORMAL") return "Normal";
  if (status === "SEM_LIMIAR") return "Sem limiar";
  return "Sem leitura";
}

function lagoaStatusColor(status) {
  if (status === "ALERTA") return "#f97316";
  if (status === "ATENCAO") return "#eab308";
  if (status === "NORMAL") return "#22c55e";
  if (status === "SEM_LIMIAR") return "#22c55e";
  return "#64748b";
}

function getLagoaPointData(point, stationData) {
  return stationData?.[point.id] || null;
}

function getLagoaSourceText(lagoa) {
  if (!lagoa?.isReal) return "Sem leitura";
  if (lagoa?.hidrosens) return "HidroSens/UFPel";
  if (lagoa?.radar) return "RADAR Lagoa dos Patos";
  if (lagoa?.anaLevel !== null && lagoa?.anaLevel !== undefined) return "ANA HidroWeb";
  return "Fonte validada";
}

function getLagoaMeasuredAt(lagoa) {
  return lagoa?.hidrosens?.measured_at || lagoa?.radar?.measured_at || null;
}

function getLagoaMaxMay2024(lagoa) {
  return lagoa?.radar?.max_may_2024_m ?? null;
}

function getLagoaSummary(stationData) {
  const points = STATIONS_LAGOA
    .map((point) => ({ point, data: stationData?.[point.id] }))
    .filter((item) => item.data?.lagoa?.isReal);

  const above = points.filter(({ data }) => data.lagoa?.levelStatus === "ALERTA").length;
  const attention = points.filter(({ data }) => data.lagoa?.levelStatus === "ATENCAO").length;

  const latestMs = Math.max(
    0,
    ...points
      .map(({ data }) => new Date(getLagoaMeasuredAt(data.lagoa) || 0).getTime())
      .filter((value) => Number.isFinite(value))
  );

  return {
    monitored: points.length,
    total: STATIONS_LAGOA.length,
    above,
    attention,
    latest: latestMs ? new Date(latestMs).toISOString() : null,
  };
}
`;

if (!app.includes("function getLagoaSummary(stationData)")) {
  const radarFn = `function radarRiskToLevel(status) {
  if (status === "ALERTA") return "ALERTA";
  if (status === "ATENCAO") return "ATENCAO";
  return "NORMAL";
}
`;
  if (!app.includes(radarFn)) fail("radarRiskToLevel para inserir helpers");
  app = app.replace(radarFn, radarFn + helperBlock + "\n");
}

// 4) Ajusta o cálculo de lagoa para ANA ficar SEM_LIMIAR, não herdando status velho.
const oldLagoaBlock = `        const lagoa = st.type==="lagoa" ? {
          atual: hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel,
          isReal: Boolean(hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel),
          source: hidrosensLevel ? "HIDROSENS" : (radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null)),
          radar: radarLevel,
          hidrosens: hidrosensLevel,
          anaLevel: realLevel,
          threshold_m: hidrosensLevel?.threshold_m ?? radarLevel?.threshold_m ?? null,
          levelStatus: hidrosensLevel?.status ?? radarLevel?.status ?? "SEM_LIMIAR",
        } : null;`;

const newLagoaBlock = `        const lagoa = st.type==="lagoa" ? {
          atual: hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel,
          isReal: Boolean(hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel),
          source: hidrosensLevel ? "HIDROSENS" : (radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null)),
          radar: radarLevel,
          hidrosens: hidrosensLevel,
          anaLevel: realLevel,
          threshold_m: hidrosensLevel?.threshold_m ?? radarLevel?.threshold_m ?? null,
          levelStatus: hidrosensLevel?.status ?? radarLevel?.status ?? (realLevel !== null ? "SEM_LIMIAR" : "SEM_LEITURA"),
        } : null;`;

if (app.includes(oldLagoaBlock)) {
  app = app.replace(oldLagoaBlock, newLagoaBlock);
}

// 5) Garante resumo da Lagoa.
if (!app.includes("const lagoaSummary = getLagoaSummary(stationData);")) {
  if (!app.includes("  const selData   = stationData[selStation.id];")) fail("const selData para inserir resumo");
  app = app.replace(
    "  const selData   = stationData[selStation.id];",
    "  const selData   = stationData[selStation.id];\n  const lagoaSummary = getLagoaSummary(stationData);"
  );
}

// 6) Se ainda não tem resumo no Dashboard, aplica resumo simples.
if (!app.includes("abrir aba Lagoa dos Patos →")) {
  const dashStart = `        {!loading && activeTab==="dashboard" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:10 }}>
            {STATIONS.map(station => {`;

  const dashNew = `        {!loading && activeTab==="dashboard" && (
          <div>
            <div
              onClick={() => setActiveTab("lagoa")}
              style={{ ...s.card, marginBottom:12, border:\`1px solid \${lagoaSummary.above ? "#f9731655" : t.borderActive}\`, cursor:"pointer" }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>LAGOA DOS PATOS</div>
                  <div style={{ fontSize:15, fontWeight:800, color:t.text, marginTop:2 }}>Monitoramento de nível</div>
                  <div style={{ fontSize:9, color:t.textMuted, marginTop:5 }}>
                    {lagoaSummary.monitored}/{lagoaSummary.total} pontos com leitura real · ordem Guaíba → Lagoa → mar
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(80px, 1fr))", gap:8, minWidth:260 }}>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"7px 9px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Acima da cota</div>
                    <div style={{ fontSize:15, fontWeight:800, color:lagoaSummary.above ? "#f97316" : "#22c55e" }}>{lagoaSummary.above}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"7px 9px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Atenção</div>
                    <div style={{ fontSize:15, fontWeight:800, color:lagoaSummary.attention ? "#eab308" : "#22c55e" }}>{lagoaSummary.attention}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"7px 9px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Última leitura</div>
                    <div style={{ fontSize:10, fontWeight:700, color:t.text }}>{lagoaSummary.latest ? formatDateTimeBR(lagoaSummary.latest) : "—"}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop:8, fontSize:8, color:t.accent, textAlign:"right", opacity:0.75 }}>abrir aba Lagoa dos Patos →</div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:10 }}>
            {STATIONS.map(station => {`;

  if (app.includes(dashStart)) {
    app = app.replace(dashStart, dashNew);
    app = app.replace(
      `            })}
          </div>
        )}

        {/* ══ PREVISÃO 14 DIAS ══ */`,
      `            })}
            </div>
          </div>
        )}

        {/* ══ PREVISÃO 14 DIAS ══ */`
    );
  }
}

// 7) Substitui a aba Lagoa inteira por uma versão ordenada e com 7 cards.
const lagoaSectionRegex = /\s*\{\/\* ══ LAGOA DOS PATOS[\s\S]*?\n\s*\{\/\* ══ ENSO/;

const lagoaSection = `
        {/* ══ LAGOA DOS PATOS — ordem operacional de escoamento ══ */}
        {!loading && activeTab==="lagoa" && (
          <div>
            <div style={{ ...s.card, marginBottom:12, border:\`1px solid \${t.borderActive}\` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>LAGOA DOS PATOS</div>
                  <div style={{ fontSize:18, fontWeight:800, color:t.text, marginTop:2 }}>Monitoramento em ordem de escoamento</div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:5 }}>
                    Organização visual: Guaíba / Sul POA → Itapuã / Norte POA → margem oeste/sul → saída para o mar.
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(90px, 1fr))", gap:8 }}>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Pontos com leitura</div>
                    <div style={{ fontSize:18, fontWeight:800, color:t.accent }}>{lagoaSummary.monitored}/{lagoaSummary.total}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Acima da cota</div>
                    <div style={{ fontSize:18, fontWeight:800, color:lagoaSummary.above ? "#f97316" : "#22c55e" }}>{lagoaSummary.above}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Atualização</div>
                    <div style={{ fontSize:10, fontWeight:700, color:t.text }}>{lagoaSummary.latest ? formatDateTimeBR(lagoaSummary.latest) : "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))", gap:10 }}>
              {STATIONS_LAGOA.map((point) => {
                const d = getLagoaPointData(point, stationData);
                const lagoa = d?.lagoa;
                const rColor = lagoaStatusColor(lagoa?.levelStatus);
                const sourceText = getLagoaSourceText(lagoa);
                const measuredAt = getLagoaMeasuredAt(lagoa);
                const max2024 = getLagoaMaxMay2024(lagoa);
                const hasLevel = lagoa?.isReal && lagoa?.atual !== null && lagoa?.atual !== undefined;
                const threshold = lagoa?.threshold_m ?? null;
                const progressBase = Math.max(threshold || lagoa?.atual || 1, 1);
                const progress = hasLevel ? Math.min(100, (lagoa.atual / progressBase) * 100) : 0;

                return (
                  <div key={point.id} style={{ ...s.card, border:\`1px solid \${hasLevel ? rColor+"55" : t.border}\` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>PONTO {point.ordemEscoamento} · ESTAÇÃO</div>
                        <div style={{ fontSize:14, fontWeight:800, color:t.text }}>{point.name}</div>
                        <div style={{ fontSize:8, color:t.textFaint, marginTop:2 }}>{point.displayName}</div>
                      </div>
                      <div style={{ fontSize:9, fontWeight:800, padding:"3px 7px", border:\`1px solid \${rColor}\`, color:rColor, borderRadius:4 }}>
                        {lagoaStatusLabel(lagoa?.levelStatus)}
                      </div>
                    </div>

                    {hasLevel ? (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:7, marginBottom:9 }}>
                          <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Cota atual</div>
                            <div style={{ fontSize:22, fontWeight:900, color:rColor }}>{(lagoa.atual*100).toFixed(1)} cm</div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{lagoa.atual.toFixed(3)} m</div>
                          </div>
                          <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Fonte</div>
                            <div style={{ fontSize:12, fontWeight:800, color:t.text }}>{sourceText}</div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{measuredAt ? formatDateTimeBR(measuredAt) : "horário não informado"}</div>
                          </div>
                          <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Cota de inundação</div>
                            <div style={{ fontSize:14, fontWeight:800, color:threshold ? "#f97316" : t.textFaint }}>
                              {threshold ? \`\${(threshold*100).toFixed(0)} cm\` : "sem limiar"}
                            </div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{threshold ? \`\${threshold.toFixed(2)} m\` : "não gera alerta por nível"}</div>
                          </div>
                          <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Máx. maio/2024</div>
                            <div style={{ fontSize:14, fontWeight:800, color:max2024 ? "#60a5fa" : t.textFaint }}>
                              {max2024 ? \`\${(max2024*100).toFixed(0)} cm\` : "–"}
                            </div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{max2024 ? \`\${max2024.toFixed(2)} m\` : "sem referência no sensor"}</div>
                          </div>
                        </div>

                        <div style={{ height:5, background:t.barBg, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ width:\`\${progress}%\`, height:"100%", background:rColor, borderRadius:3 }} />
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:8, color:t.textMuted }}>
                          <span>{sourceText}</span>
                          <span>{threshold ? \`limiar \${threshold.toFixed(2)} m\` : "sem limiar validado"}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding:12, background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:5, color:t.textMuted, fontSize:10 }}>
                        Sem leitura operacional validada no período.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ ENSO`;

replaceRegex(lagoaSectionRegex, lagoaSection, "aba Lagoa ordenada");

// 8) Textos finais.
app = app.replaceAll("Lagoa dos Patos — Sul POA", "Lagoa dos Patos — Itapuã / Norte POA");
app = app.replaceAll("Itapuã", "Itapuã / Norte POA").replaceAll("Itapuã / Norte POA / Norte POA", "Itapuã / Norte POA");

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado: 7 cards em ordem Guaíba → Lagoa → mar.");
console.log("Backup preservado em src/App.jsx.backup-lagoa-ordem-escoamento-poa.");
console.log("Agora rode: npm run build");
