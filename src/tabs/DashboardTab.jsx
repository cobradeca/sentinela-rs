export function DashboardTab({ ctx }) {
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
            <div
              onClick={() => setActiveTab("lagoa")}
              style={{ ...s.card, marginBottom:12, border:`1px solid ${lagoaSummary.above ? "#f9731655" : t.borderActive}`, cursor:"pointer" }}
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
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Acima da cota</div>
                    <div style={{ fontSize:15, fontWeight:800, color:lagoaSummary.above ? "#f97316" : "#22c55e" }}>{lagoaSummary.above}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Atenção</div>
                    <div style={{ fontSize:15, fontWeight:800, color:lagoaSummary.attention ? "#eab308" : "#22c55e" }}>{lagoaSummary.attention}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Última leitura</div>
                    <div style={{ fontSize:10, fontWeight:700, color:t.text }}>{lagoaSummary.latest ? formatDateTimeBR(lagoaSummary.latest) : "—"}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop:8, fontSize:8, color:t.accent, textAlign:"right", opacity:0.75 }}>abrir aba Lagoa dos Patos →</div>
            </div>

            <div className="sr-city-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))", gap:11 }}>
            {STATIONS.map(station => {
              const d = stationData[station.id];
              if (!d) return null;
              const risk  = RISK_LEVELS[d.risk];
              const rColor = getRiskColor(d.risk);
              return (
                <div key={station.id}
                  className="sr-city-card"
                  onClick={()=>setExpandedCard(station)}
                  style={{ ...s.card, border:`1px solid ${d.risk!=="NORMAL"?rColor+"55":t.border}`, cursor:"pointer", position:"relative", overflow:"hidden", transition:"transform 0.15s,box-shadow 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 6px 20px ${rColor}22`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=t.shadowCard;}}>
                  {d.risk!=="NORMAL" && <div style={{ position:"absolute", top:0, right:0, width:3, height:"100%", background:rColor, opacity:0.8 }} />}
                  <div className="sr-city-card-head" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div className="sr-city-card-title">
                      <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>{station.type.toUpperCase()}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:t.text }}>{station.name}</div>
                      {station.rioRef && <div style={{ fontSize:8, color:t.textFaint, marginTop:1 }}>{station.rioRef}</div>}
                      {d.inmet && (
                        <div className="sr-city-source-line" style={{ fontSize:8, color:t.accent, marginTop:3 }}>
                          ● INMET: {d.inmet.resumo}
                        </div>
                      )}
                      <div className="sr-city-source-line" title={CEMADEN_ATTRIBUTION} style={{ fontSize:8, color:d.cemaden ? "#22c55e" : t.textFaint, marginTop:3 }}>
                        ● CEMADEN: {d.cemaden ? formatCemadenRain(d.cemaden) : "sem estação/acumulado validado"}
                      </div>
                    </div>
                    <button
                      onClick={(e)=>{ e.stopPropagation(); setRiskExplain(explainCityRisk(station, d, ensoProbabilityText)); }}
                      title="Clique para entender este status"
                      className="sr-status-button"
                      style={{ background:"none", fontSize:9, fontWeight:700, padding:"2px 7px", border:`1px solid ${rColor}`, color:rColor, borderRadius:3, cursor:"pointer", fontFamily:"inherit" }}
                    >
                      {risk.icon} {risk.label} ⓘ
                    </button>
                  </div>
                  {d.error ? <div style={{ fontSize:10, color:"#ef4444" }}>Erro ao carregar</div> : (
                    <div className="sr-city-metrics" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                      {[
                        { l:"Precip. 14d", v:`${d.precip?.toFixed(0)}mm` },
                        { l:"Temp. mín.",  v:`${d.tempMin?.toFixed(1)}°C` },
                        { l:"Vento",       v:`${d.windMax?.toFixed(0)}km/h` },
                        { l:"Contexto climático", v: ensoObservedAvailable ? `${ensoClass.icon} ${ensoClass.label}` : (ensoDominantProb ? `${ensoDominantProb.label} ${formatProbability(ensoDominantProb.value)}` : "ENSO indisponível"), highlight: ensoProbabilityAvailable || ensoObservedAvailable },
                      ].map(item => (
                        <div className="sr-metric-tile" key={item.l} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"5px 7px", borderRadius:3 }}>
                          <div style={{ fontSize:9, fontWeight:600, color:t.textMuted }}>{item.l}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:item.highlight?"#f97316":t.text }}>{item.v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {station.type==="lagoa" && d.lagoa && (
                    <div style={{ marginTop:7 }}>
                      <div style={{ fontSize:8, color:t.textMuted, marginBottom:3, display:"flex", justifyContent:"space-between" }}>
                        <span>NÍVEL {d.lagoa.isReal ? (dataStaleness(getLagoaMeasuredAt(d.lagoa)) === "stale" ? "DESATUALIZADO" : "REAL") : "INDISPONÍVEL"}</span>
                        {d.lagoa.isReal && <span style={{ color:"#22c55e" }}>● ANA</span>}
                      </div>
                      {d.lagoa.isReal && d.lagoa.atual !== null ? (
                        <>
                          <div style={{ height:4, background:t.barBg, borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${Math.min(100,(d.lagoa.atual/1.5)*100)}%`, background:lagoaStatusColor(d.lagoa.levelStatus), borderRadius:2 }} />
                          </div>
                          <div style={{ fontSize:8, color:t.textMuted, marginTop:2 }}>{d.lagoa.atual.toFixed(2)}m / limiar por estação</div>
                        </>
                      ) : (
                        <div style={{ fontSize:8, color:t.textFaint, marginTop:2 }}>Sem leitura operacional validada</div>
                      )}
                    </div>
                  )}
                  {/* Indicador clicável */}
                  <div style={{ marginTop:8, fontSize:8, color:t.accent, textAlign:"right", opacity:0.7 }}>clique para detalhes →</div>
                </div>
              );
            })}
            </div>
          </div>
  );
}
