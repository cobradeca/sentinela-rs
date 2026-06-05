import { DefesaCivilNotice } from "../components/DefesaCivilNotice";
export function LagoaDosPatosTab({ ctx }) {
  const {
    APAS_RS,
    COPERNICUS_REFERENCE,
    FIRE_MONITORED_AREAS_RS,
    FreshnessBadge,
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

          <div>
            <DefesaCivilNotice t={t} dark={dark} />
            <div style={{ ...s.card, marginBottom:12, border:`1px solid ${t.borderActive}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>LAGOA DOS PATOS</div>
                  <div style={{ fontSize:24, fontWeight:900, color:t.text, marginTop:2 }}>Monitoramento em ordem de escoamento</div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(90px, 1fr))", gap:8 }}>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Pontos com leitura</div>
                    <div style={{ fontSize:18, fontWeight:800, color:t.accent }}>{lagoaSummary.monitored}/{lagoaSummary.total}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Acima da cota</div>
                    <div style={{ fontSize:18, fontWeight:800, color:lagoaSummary.above ? "#f97316" : "#22c55e" }}>{lagoaSummary.above}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Atualização</div>
                    <div style={{ fontSize:10, fontWeight:700, color:t.text }}>{lagoaSummary.latest ? formatDateTimeBR(lagoaSummary.latest) : "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sr-lagoa-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(418px,1fr))", gap:11 }}>
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
                  <div className="sr-lagoa-card" key={point.id} style={{ ...s.card, border:`1px solid ${hasLevel ? rColor+"55" : t.border}` }}>
                    <div className="sr-lagoa-card-head" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:10 }}>
                      <div className="sr-lagoa-title">
                        <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>PONTO {point.ordemEscoamento} · ESTAÇÃO</div>
                        <div style={{ fontSize:20, fontWeight:900, color:t.text }}>{point.name}</div>
                        <div style={{ fontSize:8, color:t.textFaint, marginTop:2 }}>{point.displayName}</div>
                      </div>
                      <button
                         onClick={()=>setRiskExplain(explainLagoaRisk(point, lagoa))}
                         title="Clique para entender este status"
                         className="sr-status-button"
                         style={{ background:"none", fontSize:9, fontWeight:800, padding:"3px 7px", border:`1px solid ${rColor}`, color:rColor, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}
                       >
                         {lagoaStatusLabel(lagoa?.levelStatus)} ⓘ
                       </button>
                    </div>

                    {hasLevel ? (
                      <>
                        <div className="sr-lagoa-metrics" style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:10 }}>
                          <div className="sr-lagoa-tile sr-lagoa-current" style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Cota atual</div>
                            <div style={{ fontSize:33, fontWeight:900, color:rColor }}>{(lagoa.atual*100).toFixed(1)} cm</div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{lagoa.atual.toFixed(3)} m</div>
                          </div>
                          <div className="sr-lagoa-tile sr-lagoa-source" style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Fonte</div>
                            <div className="sr-lagoa-source-name" style={{ fontSize:17, fontWeight:900, color:t.text }}>{sourceText}</div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{measuredAt ? formatDateTimeBR(measuredAt) : "horário não informado"}</div>
                            {lagoa?.isFallback && (
                              <div style={{ fontSize:8, color:"#eab308", marginTop:3 }}>
                                {getFallbackWarningText(sourceText, lagoa.fallback_age_minutes)}
                              </div>
                            )}
                            {point.id === "lagoa_patos_pelotas" && (
                              <div style={{ fontSize:8, color:t.textMuted, marginTop:3 }}>
                                Sensor HidroSens UFPel · alerta 1,20 m · crítica 1,40 m · máx. maio/2024 2,40 m
                              </div>
                            )}
                          </div>
                          <div className="sr-lagoa-tile" style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Cota de alerta</div>
                            <div style={{ fontSize:20, fontWeight:900, color:threshold ? "#f97316" : t.textFaint }}>
                              {threshold ? `${(threshold*100).toFixed(0)} cm` : "não validada"}
                            </div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{threshold ? `${threshold.toFixed(2)} m` : "alerta automático conforme limiar"}</div>
                          </div>
                          <div className="sr-lagoa-tile" style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Máx. maio/2024</div>
                            <div style={{ fontSize:20, fontWeight:900, color:max2024 ? "#60a5fa" : t.textFaint }}>
                              {max2024 ? `${(max2024*100).toFixed(0)} cm` : "–"}
                            </div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{max2024 ? `${max2024.toFixed(2)} m` : "sem referência no sensor"}</div>
                          </div>
                        </div>

                        <div style={{ height:5, background:t.barBg, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ width:`${progress}%`, height:"100%", background:rColor, borderRadius:3 }} />
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:8, color:t.textMuted }}>
                          <span>{sourceText}</span>
                          <span>{threshold ? `limiar ${threshold.toFixed(2)} m` : "limiar não validado"}</span>
                        </div>
                        {/* BLOCO C — frescor do dado */}
                        <div style={{ marginTop:6 }}>
                          <FreshnessBadge
                            measuredAt={getLagoaMeasuredAt(lagoa)}
                            fallback={lagoa?.isFallback}
                            fallbackAgeMin={lagoa?.fallback_age_minutes}
                            t={t}
                          />
                        </div>
                        {/* BLOCO B — sparkline histórico */}
                        <HistorySparkline
                          points={lagoaHistory[point.id] || []}
                          color={rColor}
                          t={t}
                          sourceLabel={lagoaHistoryMeta.source}
                        />
                      </>
                    ) : (
                      <div style={{ padding:12, background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:5, color:t.textMuted, fontSize:10 }}>
                        {point.sourceHint === "ANA" ? "Sem leitura ANA operacional validada no período." : "Sem leitura operacional validada no período."}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
  );
}
