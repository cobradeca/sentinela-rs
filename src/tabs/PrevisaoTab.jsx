import { DefesaCivilNotice } from "../components/DefesaCivilNotice";
export function PrevisaoTab({ ctx }) {
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
    dayNames,
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
    formatDateTimeBR,
    formatProbability,
    formatSignedCelsius,
    getFallbackWarningText,
    getLagoaMaxMay2024,
    getLagoaMeasuredAt,
    getLagoaPointData,
    getLagoaSourceText,
    getResponsibleAgencyText,
    getRiskBg,
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
    selData,
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
  const forecastDayIndexes = selData?.weather?.forecastDayIndexes
    || selData?.weather?.daily?.time?.slice(0, 14).map((_, index) => index)
    || [];
  const forecastPrecipValues = forecastDayIndexes.map((index) => selData?.weather?.daily?.precipitation_sum?.[index] || 0);

  return (

          <div>
            <DefesaCivilNotice t={t} dark={dark} />
            {/* Select com seta visível, apenas cidades */}
            <div style={{ position:"relative", zIndex:1, display:"inline-block", marginTop:12, marginBottom:18 }}>
              <select value={selStation.id} onChange={e=>setSelStation(STATIONS_CIDADES.find(st=>st.id===e.target.value)||STATIONS_CIDADES[0])}
                style={{ appearance:"none", WebkitAppearance:"none", background:t.inputBg, border:`1px solid ${t.borderActive}`, color:t.text, padding:"8px 36px 8px 12px", borderRadius:5, fontFamily:"inherit", fontSize:11, cursor:"pointer", minWidth:200 }}>
                {STATIONS_CIDADES.map(st=><option key={st.id} value={st.id} style={{ background:dark?"#0f172a":"#fff" }}>{st.name}</option>)}
              </select>
              <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:t.accent, fontSize:12 }}>▼</div>
            </div>
            {selData?.weather?.daily ? (
              <div>
                {/* 14 cards dias */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:20 }}>
                  {forecastDayIndexes.map((dayIndex,i) => {
                    const date=selData.weather.daily.time?.[dayIndex];
                    const dd=new Date(date+"T12:00:00");
                    const p=selData.weather.daily.precipitation_sum?.[dayIndex]||0;
                    const tx=selData.weather.daily.temperature_2m_max?.[dayIndex]||0;
                    const tn=selData.weather.daily.temperature_2m_min?.[dayIndex]||0;
                    const w=selData.weather.daily.windspeed_10m_max?.[dayIndex]||0;
                    const c=selData.weather.daily.weathercode?.[dayIndex]||0;
                    const baseDr=getRiskLevel(p*1.5,tn,w);
                    const dr=(baseDr!=="NORMAL" || p>=10 || w>=30 || tn<5) ? "MONITORAR" : "NORMAL";
                    const r=RISK_LEVELS[dr];
                    const rColor=getRiskColor(dr);
                    return (
                      <div key={date} style={{ padding:"10px 6px", background:i===0?(dark?"rgba(34,211,238,0.08)":"rgba(8,145,178,0.08)"):(dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)"), border:`1px solid ${i===0?t.accent+"44":(dr!=="NORMAL"?rColor+"55":t.border)}`, borderRadius:5, textAlign:"center" }}>
                        <div style={{ fontSize:8, color:t.textMuted }}>{i===0?"HOJE":dayNames[dd.getDay()]}</div>
                        <div style={{ fontSize:8, color:t.textFaint }}>{dd.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</div>
                        <div style={{ fontSize:22, margin:"6px 0 4px" }}>{wmoEmoji(c)}</div>
                        <div style={{ fontSize:7, color:t.textMuted, marginBottom:5, minHeight:18 }}>{wmoDesc(c)}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#fbbf24" }}>{tx.toFixed(0)}°</div>
                        <div style={{ fontSize:10, color:"#60a5fa" }}>{tn.toFixed(0)}°</div>
                        <div style={{ marginTop:5, paddingTop:5, borderTop:`1px solid ${t.border}`, fontSize:8 }}>
                          <div style={{ color:t.accent }}>🌧 {p.toFixed(0)}mm</div>
                          <div style={{ color:t.textMuted }}>💨 {w.toFixed(0)}km/h</div>
                        </div>
                        <button
                          onClick={()=>setRiskExplain(explainDailyRisk(selStation, date, p, tn, w, dr))}
                          title="Clique para entender este status diário"
                          style={{ marginTop:5, background:"none", fontSize:7, padding:"2px 3px", border:`1px solid ${rColor}`, color:rColor, borderRadius:3, cursor:"pointer", fontFamily:"inherit" }}
                        >
                          {r.label} ⓘ
                        </button>
                      </div>
                    );
                  })}
                </div>
                {/* Gráfico precipitação */}
                <div className="sr-precip-card" style={{ ...s.card, marginBottom:12 }}>
                  <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>PRECIPITAÇÃO (mm/dia)</div>
                  <div className="sr-precip-chart" style={{ display:"flex", alignItems:"flex-end", gap:4, height:80 }}>
                    {forecastPrecipValues.map((p,i) => {
                      const mx=Math.max(...forecastPrecipValues,1);
                      const dayIndex=forecastDayIndexes[i];
                      const dd=new Date(selData.weather.daily.time[dayIndex]+"T12:00:00");
                      return (
                        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <div style={{ fontSize:7, color:t.accent }}>{p.toFixed(0)}</div>
                          <div style={{ width:"100%", height:(p/mx)*70, minHeight:p>0?3:0, background:p>50?"#ef4444":p>20?"#f97316":t.accent, borderRadius:"2px 2px 0 0", opacity:0.8 }} />
                          <div style={{ fontSize:7, color:t.textFaint }}>{dayNames[dd.getDay()]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  onClick={()=>setRiskExplain(explainCityRisk(selStation, selData, ensoProbabilityText))}
                  title="Clique para entender a análise de monitoramento"
                  style={{ padding:14, background:getRiskBg(selData.risk), border:`1px solid ${getRiskColor(selData.risk)}44`, borderRadius:5, cursor:"pointer" }}
                >
                  <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:8 }}>ANÁLISE DE MONITORAMENTO — 14 DIAS</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                    {[
                      { l:"Precipitação", v:`${selData.precip?.toFixed(0)} mm`, a:selData.precip>20 },
                      { l:"Temp. mínima", v:`${selData.tempMin?.toFixed(1)}°C`,  a:selData.tempMin<5 },
                      { l:"Vento máx.",   v:`${selData.windMax?.toFixed(0)} km/h`, a:selData.windMax>30 },
                      { l:"Contexto climático",v: ensoObservedAvailable ? `${ensoClass.label} (Niño 3.4 ${formatSignedCelsius(activeENSO.nino34)})` : (ensoDominantProb ? `${ensoDominantProb.label} ${formatProbability(ensoDominantProb.value)}` : "ENSO indisponível"), a:false },
                    ].map(item=>(
                      <div key={item.l} style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:10, color:t.textMuted }}>{item.l}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:item.a?getRiskColor(selData.risk):"#22c55e" }}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : <div style={{ color:"#ef4444", fontSize:11 }}>Dados não disponíveis.</div>}
          </div>
  );
}
