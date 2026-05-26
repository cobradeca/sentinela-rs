const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-lagoa-cards-reorganizados");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-lagoa-cards-reorganizados");
}

function replaceOrFail(search, replacement, label) {
  if (!app.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  app = app.replace(search, replacement);
}

function replaceRegexOrFail(regex, replacement, label) {
  if (!regex.test(app)) {
    console.error(`ERRO: padrão não encontrado para: ${label}`);
    process.exit(1);
  }
  app = app.replace(regex, replacement);
}

const newStationsLagoa = `const STATIONS_LAGOA = [
  { id: "lagoa_rio_grande",       name: "Rio Grande / FURG CCMAR",       displayName: "Lagoa dos Patos — Rio Grande",          lat: -32.03, lon: -52.10, type: "lagoa", anaCode: "87980000", sourceHint: "RADAR" },
  { id: "lagoa_patos_pelotas",    name: "Pelotas / Laranjal",            displayName: "Lagoa dos Patos — Pelotas / Laranjal", lat: -31.77, lon: -52.34, type: "lagoa", anaCode: "87955000", sourceHint: "HIDROSENS" },
  { id: "lagoa_sao_lourenco",     name: "São Lourenço do Sul",           displayName: "Lagoa dos Patos — São Lourenço do Sul", lat: -31.36, lon: -51.98, type: "lagoa", sourceHint: "RADAR" },
  { id: "lagoa_patos_arambare",   name: "Arambaré",                      displayName: "Lagoa dos Patos — Arambaré",            lat: -30.91, lon: -51.50, type: "lagoa", anaCode: "87540000", sourceHint: "RADAR" },
  { id: "lagoa_sao_jose_norte",   name: "São José do Norte",             displayName: "Lagoa dos Patos — São José do Norte",    lat: -32.02, lon: -52.04, type: "lagoa", sourceHint: "RADAR" },
  { id: "lagoa_patos_poa",        name: "Itapuã",                        displayName: "Lagoa dos Patos — Itapuã",              lat: -30.36, lon: -51.03, type: "lagoa", anaCode: "87450004", sourceHint: "RADAR" },
];`;

replaceRegexOrFail(
  /const STATIONS_LAGOA = \[[\s\S]*?\];/,
  newStationsLagoa,
  "STATIONS_LAGOA com todos os pontos"
);

// Dashboard deve focar nas cidades. A aba Lagoa fica com os pontos técnicos.
replaceOrFail(
  "const STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];",
  "const STATIONS = [...STATIONS_CIDADES];\nconst ALL_STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];",
  "separar Dashboard de Lagoa"
);

// Load deve continuar buscando todos os pontos, inclusive lagoa.
replaceOrFail(
  "    for (const st of STATIONS) {",
  "    for (const st of ALL_STATIONS) {",
  "loadAllData usa ALL_STATIONS"
);

// Select inicial deve continuar existindo; se estiver usando STATIONS[0], troca para cidade.
app = app.replace("useState(STATIONS[0])", "useState(STATIONS_CIDADES[0])");

// Helper para nível da lagoa.
const helper = `
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

function getLagoaReceivedAt(lagoa) {
  return lagoa?.hidrosens?.received_at || lagoa?.radar?.received_at || null;
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
  replaceOrFail(
    "function lagoaStatusColor(status) {",
    helper + "\nfunction lagoaStatusColor(status) {",
    "helpers de resumo da Lagoa"
  );
}

// Summary perto dos dados calculados.
if (!app.includes("const lagoaSummary = getLagoaSummary(stationData);")) {
  replaceOrFail(
    "  const selData   = stationData[selStation.id];",
    "  const selData   = stationData[selStation.id];\n  const lagoaSummary = getLagoaSummary(stationData);",
    "const lagoaSummary"
  );
}

// Card resumo no dashboard antes da grid de cidades.
const oldDashboardStart = `        {!loading && activeTab==="dashboard" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:10 }}>
            {STATIONS.map(station => {`;

const newDashboardStart = `        {!loading && activeTab==="dashboard" && (
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
                    {lagoaSummary.monitored}/{lagoaSummary.total} pontos com leitura real · RADAR + HidroSens · ANA complementar
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

replaceOrFail(oldDashboardStart, newDashboardStart, "início Dashboard com resumo Lagoa");

// Fecha wrapper extra do dashboard. O bloco termina antes de PREVISÃO.
const dashboardEnd = `            })}
          </div>
        )}

        {/* ══ PREVISÃO 14 DIAS ══ */`;

const newDashboardEnd = `            })}
            </div>
          </div>
        )}

        {/* ══ PREVISÃO 14 DIAS ══ */`;

replaceOrFail(dashboardEnd, newDashboardEnd, "fim Dashboard com wrapper extra");

// Substitui a aba Lagoa antiga inteira por cards organizados.
// Pega da abertura do comentário da aba Lagoa até antes da aba ENSO.
const lagoaSectionRegex = /\s*\{\/\* ══ LAGOA DOS PATOS[\s\S]*?\n\s*\{\/\* ══ ENSO/;

const newLagoaSection = `
        {/* ══ LAGOA DOS PATOS — sensores reais organizados ══ */}
        {!loading && activeTab==="lagoa" && (
          <div>
            <div style={{ ...s.card, marginBottom:12, border:\`1px solid \${t.borderActive}\` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>LAGOA DOS PATOS</div>
                  <div style={{ fontSize:18, fontWeight:800, color:t.text, marginTop:2 }}>Monitoramento de nível por estação</div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:5 }}>
                    Fonte principal: sensores RADAR e HidroSens/UFPel. ANA HidroWeb permanece como fonte complementar parcial.
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
                        <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>ESTAÇÃO</div>
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
                            <div style={{ fontSize:8, color:t.textMuted }}>{measuredAt ? formatDateTimeBR(measuredAt) : "sem horário"}</div>
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

replaceRegexOrFail(lagoaSectionRegex, newLagoaSection, "substituir aba Lagoa antiga por cards");

// Remove texto antigo visível se sobrou.
app = app.replaceAll("ANA HidroWeb (telemetria horária)", "RADAR + HidroSens + ANA parcial");
app = app.replaceAll("NÍVEL REAL — ANA HIDROWEB", "NÍVEL REAL");
app = app.replaceAll("Dado Real ANA HidroWeb", "Dado real");

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx reorganizado: Dashboard com resumo e aba Lagoa com todos os cards.");
console.log("Backup preservado em src/App.jsx.backup-lagoa-cards-reorganizados.");
console.log("Agora rode: npm run build");
