const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-lagoa-parametros");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-lagoa-parametros");
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  return source.replace(search, replacement);
}

// 1) Helpers de exibição de parâmetros da Lagoa.
const helpers = `
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

function lagoaSourceLabel(lagoa) {
  if (!lagoa?.isReal) return "SEM LEITURA";
  if (lagoa?.radar) return "RADAR";
  if (lagoa?.anaLevel !== null && lagoa?.anaLevel !== undefined) return "ANA";
  return "DADO REAL";
}

function lagoaStatusLabel(status) {
  if (status === "ALERTA") return "Acima da cota de inundação";
  if (status === "ATENCAO") return "Próximo da cota de inundação";
  if (status === "NORMAL") return "Abaixo da cota de inundação";
  return "Sem limiar validado";
}

function lagoaStatusColor(status) {
  if (status === "ALERTA") return "#f97316";
  if (status === "ATENCAO") return "#eab308";
  if (status === "NORMAL") return "#22c55e";
  return "#64748b";
}
`;

if (!app.includes("function formatDateTimeBR(value)")) {
  app = replaceOnce(
    app,
    "function radarRiskToLevel(status) {\n  if (status === \"ALERTA\") return \"ALERTA\";\n  if (status === \"ATENCAO\") return \"ATENCAO\";\n  return \"NORMAL\";\n}\n",
    "function radarRiskToLevel(status) {\n  if (status === \"ALERTA\") return \"ALERTA\";\n  if (status === \"ATENCAO\") return \"ATENCAO\";\n  return \"NORMAL\";\n}\n" + helpers + "\n",
    "helpers Lagoa"
  );
}

// 2) Cards do Dashboard: trocar ANA/0,8 por fonte/limiar próprios.
const oldDashboardBlock = `                  {station.type==="lagoa" && d.lagoa && (
                    <div style={{ marginTop:7 }}>
                      <div style={{ fontSize:8, color:t.textMuted, marginBottom:3, display:"flex", justifyContent:"space-between" }}>
                        <span>NÍVEL {d.lagoa.isReal ? "REAL" : "INDISPONÍVEL"}</span>
                        {d.lagoa.isReal && <span style={{ color:"#22c55e" }}>● ANA</span>}
                      </div>
                      {d.lagoa.isReal && d.lagoa.atual !== null ? (
                        <>
                          <div style={{ height:4, background:t.barBg, borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:\`${Math.min(100,(d.lagoa.atual/1.5)*100)}%\`, background:d.lagoa.atual>1.2?"#ef4444":d.lagoa.atual>0.8?"#f97316":"#22c55e", borderRadius:2 }} />
                          </div>
                          <div style={{ fontSize:8, color:t.textMuted, marginTop:2 }}>{d.lagoa.atual.toFixed(2)}m / alerta 0.8m</div>
                        </>
                      ) : (
                        <div style={{ fontSize:8, color:t.textFaint, marginTop:2 }}>ANA HidroWeb indisponível</div>
                      )}
                    </div>
                  )}`;

const newDashboardBlock = `                  {station.type==="lagoa" && d.lagoa && (
                    <div style={{ marginTop:7 }}>
                      <div style={{ fontSize:8, color:t.textMuted, marginBottom:3, display:"flex", justifyContent:"space-between" }}>
                        <span>NÍVEL {d.lagoa.isReal ? "REAL" : "SEM LEITURA"}</span>
                        {d.lagoa.isReal && <span style={{ color:lagoaStatusColor(d.lagoa.levelStatus) }}>● {lagoaSourceLabel(d.lagoa)}</span>}
                      </div>
                      {d.lagoa.isReal && d.lagoa.atual !== null ? (
                        <>
                          <div style={{ height:4, background:t.barBg, borderRadius:2, overflow:"hidden" }}>
                            <div style={{
                              height:"100%",
                              width:\`\${Math.min(100,(d.lagoa.atual / Math.max(d.lagoa.threshold_m || d.lagoa.atual || 1, 1)) * 100)}%\`,
                              background:lagoaStatusColor(d.lagoa.levelStatus),
                              borderRadius:2
                            }} />
                          </div>
                          <div style={{ fontSize:8, color:t.textMuted, marginTop:2 }}>
                            {d.lagoa.atual.toFixed(2)}m
                            {d.lagoa.threshold_m ? \` / inundação \${d.lagoa.threshold_m.toFixed(2)}m\` : " / sem limiar"}
                            {d.lagoa.radar?.measured_at ? \` · \${formatDateTimeBR(d.lagoa.radar.measured_at)}\` : ""}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize:8, color:t.textFaint, marginTop:2 }}>Sem leitura operacional validada no período</div>
                      )}
                    </div>
                  )}`;

if (app.includes(oldDashboardBlock)) {
  app = app.replace(oldDashboardBlock, newDashboardBlock);
} else {
  console.warn("AVISO: bloco do Dashboard não encontrado exatamente; vou aplicar substituições pontuais.");
  app = app.replace('{d.lagoa.isReal && <span style={{ color:"#22c55e" }}>● ANA</span>}', '{d.lagoa.isReal && <span style={{ color:lagoaStatusColor(d.lagoa.levelStatus) }}>● {lagoaSourceLabel(d.lagoa)}</span>}');
  app = app.replace('{d.lagoa.atual.toFixed(2)}m / alerta 0.8m', '{d.lagoa.atual.toFixed(2)}m{d.lagoa.threshold_m ? ` / inundação ${d.lagoa.threshold_m.toFixed(2)}m` : " / sem limiar"}');
  app = app.replace('background:d.lagoa.atual>1.2?"#ef4444":d.lagoa.atual>0.8?"#f97316":"#22c55e"', 'background:lagoaStatusColor(d.lagoa.levelStatus)');
}

// 3) Modal: substituir o parâmetro antigo "Nível lagoa".
const oldModalItem = `{ l:"Nível lagoa", v: d.lagoa.isReal && d.lagoa.atual !== null ? \`\${d.lagoa.atual.toFixed(2)} m (ANA)\` : "– (ANA indisponível)", alert: d.lagoa.isReal && d.lagoa.atual > 0.8 },`;

const newModalItems = `{ l:"Cota atual", v: d.lagoa.isReal && d.lagoa.atual !== null ? \`\${d.lagoa.atual.toFixed(2)} m\` : "sem leitura", alert: d.lagoa.levelStatus === "ALERTA" },
                { l:"Fonte nível", v: lagoaSourceLabel(d.lagoa), alert:false },
                { l:"Cota inundação", v: d.lagoa.threshold_m ? \`\${d.lagoa.threshold_m.toFixed(2)} m\` : "sem limiar", alert:false },
                { l:"Status nível", v: lagoaStatusLabel(d.lagoa.levelStatus), alert: d.lagoa.levelStatus === "ALERTA" },`;

if (app.includes(oldModalItem)) {
  app = app.replace(oldModalItem, newModalItems);
} else {
  console.warn("AVISO: item antigo do modal não encontrado.");
}

// 4) Modal: inserir painel específico da Lagoa com valores iguais ao portal.
const marker = `          {/* Previsão compacta dos 14 dias */}
          <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2, marginBottom:8 }}>PREVISÃO 14 DIAS</div>`;

const lagoonPanel = `          {d.lagoa?.radar && (
            <div style={{ marginBottom:14, padding:12, border:\`1px solid \${lagoaStatusColor(d.lagoa.levelStatus)}55\`, borderRadius:6, background:dark?"rgba(0,0,0,0.25)":"rgba(0,0,0,0.03)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>PARÂMETROS DO SENSOR RADAR</div>
                  <div style={{ fontSize:13, fontWeight:700, color:t.text }}>{d.lagoa.radar.name || station.name}</div>
                </div>
                <div style={{ fontSize:9, color:lagoaStatusColor(d.lagoa.levelStatus), fontWeight:700 }}>● {lagoaStatusLabel(d.lagoa.levelStatus)}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                  <div style={{ fontSize:8, color:t.textMuted }}>Cota atual</div>
                  <div style={{ fontSize:20, fontWeight:800, color:lagoaStatusColor(d.lagoa.levelStatus) }}>{d.lagoa.radar.level_cm.toFixed(1)} cm</div>
                  <div style={{ fontSize:8, color:t.textMuted }}>{d.lagoa.radar.level_m.toFixed(3)} m</div>
                </div>
                <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                  <div style={{ fontSize:8, color:t.textMuted }}>Última atualização</div>
                  <div style={{ fontSize:11, fontWeight:700, color:t.text }}>{formatDateTimeBR(d.lagoa.radar.measured_at)}</div>
                  <div style={{ fontSize:8, color:t.textMuted }}>recebido: {formatDateTimeBR(d.lagoa.radar.received_at)}</div>
                </div>
                <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                  <div style={{ fontSize:8, color:t.textMuted }}>Cota de inundação</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#f97316" }}>{d.lagoa.radar.threshold_cm.toFixed(0)} cm</div>
                  <div style={{ fontSize:8, color:t.textMuted }}>{d.lagoa.radar.threshold_m.toFixed(2)} m</div>
                </div>
                <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                  <div style={{ fontSize:8, color:t.textMuted }}>Máx. Maio/2024</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#60a5fa" }}>{(d.lagoa.radar.max_may_2024_m*100).toFixed(0)} cm</div>
                  <div style={{ fontSize:8, color:t.textMuted }}>{d.lagoa.radar.max_may_2024_m.toFixed(2)} m</div>
                </div>
              </div>
            </div>
          )}

`;

if (!app.includes("PARÂMETROS DO SENSOR RADAR")) {
  app = replaceOnce(app, marker, lagoonPanel + marker, "painel parâmetros RADAR no modal");
}

// 5) Texto de carregamento e aba lagoa: trocar ANA única por RADAR + ANA parcial.
app = app.replace("Open-Meteo · ANA HidroWeb · INPE · NOAA", "Open-Meteo · Lagoa RADAR · ANA parcial · INPE · NOAA");
app = app.replace("4 pontos de monitoramento · ANA HidroWeb (telemetria horária) · El Niño eleva risco costeiro em Rio Grande", "Monitoramento da Lagoa · RADAR como fonte principal · ANA HidroWeb como fonte complementar parcial");

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado com parâmetros detalhados da Lagoa.");
console.log("Backup preservado em src/App.jsx.backup-lagoa-parametros.");
console.log("Agora rode: npm run build");
