export function AlertasTab({ ctx }) {
  const {
    APAS_RS,
    CEMADEN_ATTRIBUTION,
    COPERNICUS_REFERENCE,
    FIRE_MONITORED_AREAS_RS,
    HistorySparkline,
    RISK_LEVELS,
    STATIONS,
    STATIONS_CIDADES,
    STATIONS_LAGOA,
    activeENSO,
    alerts,
    anaComplementar,
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
    ensoProbabilityAvailable,
    ensoProbabilityText,
    explainCityRisk,
    explainDailyRisk,
    explainLagoaRisk,
    formatCemadenRain,
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
    notificationCards,
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

          <div>
            <div style={{ marginBottom:12, padding:"10px 14px", background: dark?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:5, fontSize:10, color: dark?"#fdba74":"#c2410c" }}>
              🌡️ <strong>ENSO — contexto climático:</strong> {ensoObservedAvailable ? `${ensoClass.label} · Niño 3.4 ${formatSignedCelsius(activeENSO.nino34)}.` : "leitura NOAA/CPC indisponível."} {ensoDominantProb ? `${ensoDominantProb.label}: ${formatProbability(ensoDominantProb.value)} (IRI/CCSR).` : "Probabilidade IRI/CCSR indisponível."} ENSO é contexto climático e não aciona alerta local sozinho.
            </div>
            {alerts.length===0 ? (
              <div style={{ textAlign:"center", padding:50, border:"1px solid rgba(34,197,94,0.3)", borderRadius:5, background:"rgba(34,197,94,0.05)" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>✓</div>
                <div style={{ fontSize:13, color:"#22c55e", letterSpacing:2 }}>NENHUM ALERTA ATIVO</div>
                <div style={{ fontSize:10, color:t.textMuted, marginTop:5 }}>Sem alertas operacionais severos. Condições de atenção podem aparecer no Dashboard.</div>
              </div>
            ) : (
              <div style={{ display:"grid", gap:8 }}>
                {[...alerts].sort((a,b)=>["CRITICO","EMERGENCIA","ALERTA","ATENCAO","NORMAL"].indexOf(a.risk_level)-["CRITICO","EMERGENCIA","ALERTA","ATENCAO","NORMAL"].indexOf(b.risk_level)).map((alert,i)=>{
                  const r=RISK_LEVELS[alert.risk_level];
                  const rColor=getRiskColor(alert.risk_level);
                  const rBg=getRiskBg(alert.risk_level);
                  return (
                    <div
                      key={i}
                      onClick={() => alert.explain && setRiskExplain(alert.explain)}
                      title={alert.explain ? "Clique para ver os parâmetros deste alerta" : "Alerta oficial ou externo"}
                      style={{ padding:"12px 14px", background:rBg, border:`1px solid ${rColor}55`, borderLeft:`4px solid ${rColor}`, borderRadius:5, cursor:alert.explain?"pointer":"default" }}
                    >
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:rColor }}>{r.icon} {r.label.toUpperCase()} — {alert.station}</div>
                        <div style={{ fontSize:9, color:t.textMuted }}>detectado {new Date(alert.at).toLocaleString("pt-BR")}</div>
                      </div>
                      <div style={{ fontSize:11, color:t.textMuted }}>{alert.message}</div>
                      {alert.explain && (
                        <div style={{ marginTop:6, fontSize:8, color:t.accent, textAlign:"right", opacity:0.75 }}>ver parâmetros →</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Canais */}
            <div style={{ marginTop:16, ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:10 }}>CANAIS DE NOTIFICAÇÃO</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:8 }}>
                {notificationCards.map(c=>(
                  <div key={c.n} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, borderRadius:4, border:`1px solid ${t.border}`, overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px" }}>
                      <span style={{ fontSize:18 }}>{c.i}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, color:t.text }}>{c.n}</div>
                        <div style={{ fontSize:9, color:c.status.ok ? c.status.color : c.status.color }}>{c.status.label} · {c.s}</div>
                      </div>
                      {c.h && <button onClick={()=>setExpanded(expanded===c.n?null:c.n)} style={{ background:"none", border:`1px solid ${t.accent}44`, color:t.accent, cursor:"pointer", fontSize:8, padding:"2px 6px", borderRadius:3, fontFamily:"inherit" }}>{expanded===c.n?"▲":"▼"}</button>}
                    </div>
                    {c.h && expanded===c.n && <div style={{ padding:"8px 11px", borderTop:`1px solid ${t.border}`, fontSize:9, color:t.textMuted, lineHeight:1.7, whiteSpace:"pre-line" }}>{c.h}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
  );
}
