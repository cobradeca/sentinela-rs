import { DefesaCivilNotice } from "../components/DefesaCivilNotice";
export function EnsoTab({ ctx }) {
  const {
    APAS_RS,
    COPERNICUS_REFERENCE,
    FIRE_MONITORED_AREAS_RS,
    HistorySparkline,
    RISK_LEVELS,
    STATIONS,
    STATIONS_CIDADES,
    STATIONS_LAGOA,
    activeENSO,
    alerts,
    copernicusEms,
    copernicusNdvi,
    copernicusS1,
    copernicusWater,
    dark,
    dataStaleness,
    effisHealth,
    ensoClass,
    ensoDominantProb,
    ensoFirstForecast,
    ensoObservedAvailable,
    ensoObservedText,
    ensoProbabilityAvailable,
    ensoProbabilityText,
    explainCityRisk,
    explainDailyRisk,
    explainLagoaRisk,
    formatDateTimeBR,
    formatProbability,
    formatSignedCelsius,
    getFallbackWarningText,
    getLagoaMaxMay2024,
    getLagoaMeasuredAt,
    getLagoaPointData,
    getLagoaSourceText,
    getResponsibleAgencyText,
    getRiskColor,
    getRiskLevel,
    getValidatedSourceHealth,
    lagoaHistory,
    lagoaHistoryMeta,
    lagoaStatusColor,
    lagoaStatusLabel,
    lagoaSummary,
    lastUpdate,
    loadAllData,
    percentValue,
    queimadas,
    s,
    safeEnsoForecast,
    selStation,
    setActiveTab,
    setExpandedCard,
    setRiskExplain,
    setSelStation,
    sourceHealth,
    stationData,
    t,
    wmoDesc,
    wmoEmoji
  } = ctx;

  return (

          <div style={{ display:"grid", gap:12 }}>
            <DefesaCivilNotice t={t} dark={dark} />
            <div style={{ padding:"12px 16px", background: dark?"rgba(34,211,238,0.08)":"rgba(8,145,178,0.06)", border:`1px solid ${t.borderActive}`, borderRadius:5, display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:24 }}>🌡️</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:3 }}>ENSO — SITREP OBSERVADO + PROBABILÍSTICO</div>
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  {ensoObservedText}. {ensoProbabilityText}.
                </div>
              </div>
            </div>

            <div style={{ padding:"8px 14px", background: dark?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:4, fontSize:9, color: dark?"#bbf7d0":"#166534", display:"flex", gap:8, alignItems:"center" }}>
              ✅ <span><strong>Fontes ativas:</strong> observado por NOAA/CPC; probabilidade por IRI/CCSR. Consulta: {activeENSO.probabilityFetchedAt ? formatDateTimeBR(activeENSO.probabilityFetchedAt) : lastUpdate ? lastUpdate.toLocaleString("pt-BR") : "sem horário"}.</span>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:11 }}>
              {[
                { l:"Fase observada", v: ensoObservedAvailable ? `${ensoClass.icon} ${ensoClass.label}` : "indisponível", s: ensoObservedAvailable ? `Niño 3.4: ${formatSignedCelsius(activeENSO.nino34)}` : "NOAA/CPC sem leitura", c:ensoClass.color },
                { l:"ONI trimestral", v: formatSignedCelsius(activeENSO.oni3m), s:"NOAA/CPC observado", c: ensoObservedAvailable ? "#f97316" : "#64748b" },
                { l:"Prob. El Niño (atual)", v: formatProbability(activeENSO.prob?.elNino), s: ensoFirstForecast?.p ? `IRI/CCSR · ${ensoFirstForecast.p}` : "IRI/CCSR", c:"#f97316" },
                { l:"Prob. Neutro", v: formatProbability(activeENSO.prob?.neutral), s:"IRI/CCSR", c:"#22c55e" },
                { l:"Prob. La Niña", v: formatProbability(activeENSO.prob?.laNina), s:"IRI/CCSR", c:"#3b82f6" },
                { l:"Tipo de uso", v:"Contexto climático", s:"iminência de formação de El Niño", c:"#eab308" },
              ].map(item=>(
                <div key={item.l} style={{ padding:"12px 14px", background:t.cardBg, border:`1px solid ${item.c}44`, borderTop:`3px solid ${item.c}`, borderRadius:5, boxShadow:t.shadowCard }}>
                  <div style={{ fontSize:8, color:t.textMuted, letterSpacing:2, marginBottom:5 }}>{item.l.toUpperCase()}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:item.c, marginBottom:3 }}>{item.v}</div>
                  <div style={{ fontSize:8, color:t.textFaint }}>{item.s}</div>
                </div>
              ))}
            </div>

            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>ESCALA NIÑO 3.4 — OBSERVADO NOAA/CPC</div>
              <div style={{ position:"relative", height:24, borderRadius:3, overflow:"hidden", background:t.barBg }}>
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#1e3a8a 0%,#3b82f6 20%,#22c55e 38%,#22c55e 62%,#f97316 76%,#ef4444 88%,#dc2626 100%)", opacity:0.75 }} />
                {[
                  {l:"La Niña Forte",pos:"10%"},{l:"La Niña",pos:"28%"},{l:"Neutro",pos:"50%"},{l:"El Niño",pos:"70%"},{l:"Super",pos:"90%"}
                ].map(lb=>(
                  <div key={lb.l} style={{ position:"absolute", top:0, left:lb.pos, transform:"translateX(-50%)", fontSize:7, color:"rgba(255,255,255,0.8)", height:"100%", display:"flex", alignItems:"center" }}>{lb.l}</div>
                ))}
                {ensoObservedAvailable && (
                  <div style={{ position:"absolute", top:0, left:`${Math.min(97,Math.max(3,((activeENSO.nino34+3)/6)*100))}%`, transform:"translateX(-50%)", width:3, height:"100%", background:"#fff", boxShadow:"0 0 6px #fff" }} />
                )}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:8, color:t.textMuted }}>
                <span>-3°C</span>
                <span style={{ color:ensoClass.color, fontWeight:700 }}>{ensoObservedAvailable ? `▲ ATUAL: ${formatSignedCelsius(activeENSO.nino34)} → ${ensoClass.label}` : "NOAA/CPC indisponível"}</span>
                <span>+3°C</span>
              </div>
            </div>

            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>PREVISÃO PROBABILÍSTICA IRI/CCSR — CURVAS DE EVOLUÇÃO</div>
              <div style={{ fontSize:9, color:t.textFaint, marginBottom:12 }}>
                Cada linha mostra como a probabilidade de cada fase ENSO sobe ou cai mês a mês. O cruzamento das curvas indica transição de fase.
              </div>
              {safeEnsoForecast(activeENSO.forecast).length >= 2 ? (() => {
                const pts = safeEnsoForecast(activeENSO.forecast);
                const W = 620, H = 210, padL = 42, padR = 86, padT = 20, padB = 68;
                const innerW = W - padL - padR;
                const innerH = H - padT - padB;
                const xOf = (i) => padL + (i / (pts.length - 1)) * innerW;
                const yOf = (v) => padT + innerH - (typeof v === "number" && Number.isFinite(v) ? v * innerH : 0);
                const splitSeasonLabel = (label) => {
                  const match = String(label || "").match(/^(.+?)\s+(\d{4}(?:\/\d{2})?)$/);
                  return match ? { season: match[1], year: match[2] } : { season: label, year: "" };
                };
                const mkLine = (key, color) => {
                  const d = pts.map((f,i) => `${i===0?"M":"L"}${xOf(i).toFixed(1)},${yOf(f[key]).toFixed(1)}`).join(" ");
                  const lastV = pts[pts.length-1][key];
                  const lastX = xOf(pts.length-1);
                  const lastY = yOf(lastV);
                  return { d, color, lastV, lastX, lastY };
                };
                const lines = [
                  { key:"en", label:"El Niño",  labelOffset:-8, ...mkLine("en","#f97316") },
                  { key:"nu", label:"Neutro",   labelOffset:-22, ...mkLine("nu","#22c55e") },
                  { key:"ln", label:"La Niña",  labelOffset:16, ...mkLine("ln","#3b82f6") },
                ];
                const pointLabelY = (f, key) => {
                  const y = yOf(f[key]);
                  if (key === "nu") return Math.max(8, y - 12);
                  if (key === "ln") return Math.min(padT + innerH + 22, y + 22);
                  return Math.max(8, y - 8);
                };
                const yGridVals = [0, 0.25, 0.5, 0.75, 1.0];
                return (
                  <div>
                    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"hidden", display:"block" }}>
                      {/* grid horizontal */}
                      {yGridVals.map(v => (
                        <g key={v}>
                          <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke={dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.07)"} strokeWidth="1"/>
                          <text x={padL-4} y={yOf(v)+3} textAnchor="end" fontSize="7" fill={dark?"#64748b":"#94a3b8"}>{Math.round(v*100)}%</text>
                        </g>
                      ))}
                      {/* grid vertical por período */}
                      {pts.map((f,i) => (
                        <g key={i}>
                          <line x1={xOf(i)} x2={xOf(i)} y1={padT} y2={padT+innerH} stroke={dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"} strokeWidth="1"/>
                          <text x={xOf(i)} y={padT+innerH+38} textAnchor="middle" fontSize="7" fill={dark?"#64748b":"#94a3b8"}>{splitSeasonLabel(f.p).season}</text>
                          <text x={xOf(i)} y={padT+innerH+49} textAnchor="middle" fontSize="7" fill={dark?"#64748b":"#94a3b8"}>{splitSeasonLabel(f.p).year}</text>
                        </g>
                      ))}
                      {/* limiar 50% */}
                      <line x1={padL} x2={W-padR} y1={yOf(0.5)} y2={yOf(0.5)} stroke="#eab30855" strokeWidth="1" strokeDasharray="4 3"/>
                      {/* linhas das fases */}
                      {lines.map(ln => (
                        <g key={ln.key}>
                          <path d={ln.d} fill="none" stroke={ln.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9"/>
                          {pts.map((f,i) => (
                            <circle key={i} cx={xOf(i)} cy={yOf(f[ln.key])} r="3" fill={ln.color} opacity="0.85"/>
                          ))}
                          {pts.map((f,i) => (
                            <text key={`label-${i}`} x={xOf(i)} y={pointLabelY(f, ln.key)} textAnchor="middle" fontSize="7" fill={ln.color} fontWeight="700">
                              {typeof f[ln.key] === "number" ? Math.round(f[ln.key]*100)+"%" : ""}
                            </text>
                          ))}
                          {/* label no final */}
                          <text x={Math.min(W - padR + 8, ln.lastX + 6)} y={Math.max(padT + 8, Math.min(H - padB - 6, ln.lastY + 3 + ln.labelOffset))} fontSize="8" fill={ln.color} fontWeight="700">{ln.label}</text>
                        </g>
                      ))}
                    </svg>
                    <div style={{ marginTop:6, fontSize:8, color:t.textFaint, lineHeight:1.5 }}>
                      Fonte do gráfico: {activeENSO.probabilitySource || "IRI/CCSR ENSO Forecast"}{activeENSO.probabilitySourceUrl ? ` · ${activeENSO.probabilitySourceUrl}` : ""}. Curvas derivadas por parser textual do Sentinela-RS a partir do Quick Look; não representam tabela oficial trimestral estruturada.
                    </div>
                    {/* tabela compacta abaixo */}
                    <div style={{ display:"grid", gap:5, marginTop:10 }}>
                      {pts.map((f,i) => (
                        <div key={i} style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 1fr", gap:6, alignItems:"center", padding:"4px 6px", background: i===0?(dark?"rgba(34,211,238,0.06)":"rgba(8,145,178,0.05)"):"transparent", borderRadius:3 }}>
                          <div style={{ fontSize:9, fontWeight: i===0?700:400, color: i===0?t.accent:t.textMuted }}>{f.p}{i===0?" (atual)":""}</div>
                          {[{l:"El Niño",v:f.en,c:"#f97316"},{l:"Neutro",v:f.nu,c:"#22c55e"},{l:"La Niña",v:f.ln,c:"#3b82f6"}].map(bar=>(
                            <div key={bar.l} style={{ fontSize:9, color:bar.c, fontWeight:600 }}>{bar.l} {formatProbability(bar.v)}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })() : (
                <div style={{ fontSize:10, color:t.textMuted }}>Sem previsão probabilística validada no momento. A curva aparece quando a Edge Function IRI/CCSR retornar dados.</div>
              )}
              <div style={{ fontSize:8, color:t.textFaint, marginTop:8 }}>
                Fonte: {activeENSO.probabilitySource || "IRI/CCSR"} · Referência: {activeENSO.probabilityReferenceDate || "indisponível"} · Consulta: {activeENSO.probabilityFetchedAt ? formatDateTimeBR(activeENSO.probabilityFetchedAt) : "sem horário"}
              </div>
            </div>

            <div style={{ padding:12, background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:5 }}>
              <div style={{ fontSize:10, color:"#eab308", letterSpacing:2, marginBottom:6 }}>REGRA OPERACIONAL</div>
              <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                ENSO e CPTEC são contexto climático. Não geram alerta local sozinhos. Alertas operacionais dependem de Defesa Civil, chuva observada Open-Meteo, previsão INMET/Open-Meteo e níveis reais da Lagoa/RADAR/HidroSens.
              </div>
            </div>
          </div>
  );
}
