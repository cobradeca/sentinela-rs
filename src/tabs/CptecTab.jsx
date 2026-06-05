import { DefesaCivilNotice } from "../components/DefesaCivilNotice";
export function CptecTab({ ctx }) {
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
    cptecProducts,
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
              <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>CPTEC/INPE</div>
              <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>Produtos sazonais e subsazonais oficiais</div>
              <div style={{ fontSize:10, color:t.textMuted, marginTop:5 }}>
                Mapas oficiais do CPTEC/INPE para tendência climática. Eles ajudam a entender o cenário das próximas semanas ou meses, mas não substituem alerta local da Defesa Civil, INMET, Open-Meteo observado ou sensores de nível.
              </div>
              <div style={{ marginTop:8, display:"flex", gap:8, flexWrap:"wrap", fontSize:9 }}>
                <span style={{ padding:"4px 8px", border:`1px solid ${cptecProducts?.ok ? "#22c55e" : "#64748b"}`, color:cptecProducts?.ok ? "#22c55e" : t.textMuted, borderRadius:4 }}>
                  {cptecProducts?.ok ? "ATIVO" : "CARREGANDO"}
                </span>
                <span style={{ padding:"4px 8px", border:`1px solid ${t.border}`, color:t.textMuted, borderRadius:4 }}>
                  Produtos válidos: {cptecProducts?.available ?? 0}/{cptecProducts?.total ?? 0}
                </span>
                <span style={{ padding:"4px 8px", border:`1px solid ${t.border}`, color:t.textMuted, borderRadius:4 }}>
                  Última consulta: {cptecProducts?.fetched_at ? formatDateTimeBR(cptecProducts.fetched_at) : "—"}
                </span>
              </div>
            </div>

            <div style={{ padding:"10px 14px", background: dark?"rgba(34,211,238,0.05)":"rgba(8,145,178,0.04)", border:`1px solid ${t.border}`, borderRadius:5, fontSize:10, color:t.textMuted, lineHeight:1.6, marginBottom:12 }}>
              <strong style={{ color:t.text }}>Como ler estes mapas:</strong> todos mostram tendência, não previsão exata para um dia específico. Precipitação indica tendência de chuva acumulada; temperatura compara frio/calor com o padrão histórico; ENSO mostra influência oceânica; produtos sazonais olham cerca de 3 meses; subsazonais olham algumas semanas.
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:12 }}>
              {(cptecProducts?.products || []).filter((p) => p.ok).map((p) => (
                <div key={p.id} style={{ ...s.card, overflow:"hidden" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:8, color:t.textMuted, letterSpacing:2 }}>{p.group?.toUpperCase()} · {p.period}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:t.text }}>{p.title}</div>
                    </div>
                    <div style={{ fontSize:8, color:"#22c55e", border:"1px solid #22c55e55", borderRadius:4, padding:"3px 6px" }}>OK</div>
                  </div>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt={p.title} style={{ width:"100%", borderRadius:6, border:`1px solid ${t.border}`, background:"#fff" }} />
                  </a>
                  <div style={{ marginTop:7, fontSize:8, color:t.textMuted }}>
                    Fonte: CPTEC/INPE · produto gráfico oficial · {p.contentLength ? `${Math.round(p.contentLength/1024)} KB` : "tamanho não informado"}
                  </div>
                  {/* Rodapé explicativo por tipo de produto */}
                  <div style={{ marginTop:6, padding:"7px 10px", background: dark?"rgba(34,211,238,0.04)":"rgba(8,145,178,0.03)", border:`1px solid ${t.border}`, borderRadius:4, fontSize:8, color:t.textMuted, lineHeight:1.6 }}>
                    {p.group?.toLowerCase().includes("subsaz") || p.title?.toLowerCase().includes("semana") || p.id?.toLowerCase().includes("week") ? (
                      <span>📆 <strong style={{color:t.text}}>Subsazonal semanal:</strong> mostra tendência para a semana indicada, geralmente de 1 a 4 semanas à frente. Não é previsão diária por município.</span>
                    ) : p.group?.toLowerCase().includes("saz") || p.title?.toLowerCase().includes("sazonal") || p.id?.toLowerCase().includes("seas") ? (
                      <span>📅 <strong style={{color:t.text}}>Sazonal:</strong> resume a tendência provável para cerca de 3 meses, usando modelos climáticos e condições dos oceanos. Não informa o tempo de um dia específico.</span>
                    ) : p.group?.toLowerCase().includes("precipitacao") || p.group?.toLowerCase().includes("chuva") ? (
                      <span>🌧 <strong style={{color:t.text}}>Chuva:</strong> indica onde o modelo espera mais ou menos chuva no período do mapa. Serve para tendência regional, não para decidir chuva diária por município.</span>
                    ) : p.group?.toLowerCase().includes("temperatura") || p.group?.toLowerCase().includes("temp") ? (
                      <span>🌡 <strong style={{color:t.text}}>Temperatura:</strong> compara a temperatura esperada com o padrão histórico. Vermelho costuma indicar mais quente que o normal; azul, mais frio que o normal.</span>
                    ) : p.group?.toLowerCase().includes("enso") || p.group?.toLowerCase().includes("el ni") ? (
                      <span>🌊 <strong style={{color:t.text}}>ENSO:</strong> mostra como El Niño, La Niña ou neutralidade podem influenciar chuva e temperatura. É contexto climático, não alerta local.</span>
                    ) : (
                      <span>🛰 <strong style={{color:t.text}}>Produto CPTEC/INPE:</strong> imagem oficial de previsão ou monitoramento climático. Clique para ampliar. Use como contexto regional, sem acionar alerta sozinho.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {cptecProducts && !cptecProducts.ok && (
              <div style={{ ...s.card, color:t.textMuted, fontSize:11 }}>
                Nenhum produto CPTEC/INPE validado no momento.
              </div>
            )}
          </div>
  );
}
