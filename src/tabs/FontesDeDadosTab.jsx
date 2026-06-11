export function FontesDeDadosTab({ ctx }) {
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
            <div style={{ ...s.card, border:`1px solid ${t.borderActive}` }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:8 }}>POLÍTICA OPERACIONAL — FONTE REAL</div>
              <div style={{ fontSize:11, color:t.textMuted, lineHeight:1.65 }}>
                O Sentinela-RS organiza dados públicos e indicadores ambientais para acompanhamento. Os avisos oficiais são os da Defesa Civil RS. Em situação de risco, ligue 199.
                Leituras reais, locais e indicadores derivados aparecem rotulados separadamente. Esta ferramenta não dispara novo alerta automático; verifique a informação junto ao órgão responsável.
                EFFIS WMS conectado é camada complementar e não aciona alerta para Sentinela-RS sem geocerca/foco validado.
              </div>
            </div>

            {/* BLOCO D — Saúde das fontes em tempo real */}
            <div style={{ ...s.card, border:`1px solid ${t.borderActive}` }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:10 }}>SAÚDE DAS FONTES — ÚLTIMA VERIFICAÇÃO</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
                {[
                  "Open-Meteo","INMET","RADAR Lagoa","HidroSens","Sensores Monitoramento","Defesa Civil RS",
                  "NOAA/CPC ENSO","IRI/CCSR ENSO","CPTEC/INPE","ANA Telemetria Rios","Rodovias RS","INPE BDQueimadas","INPE Eventos de Fogo","CENSIPAM Painel do Fogo","Copernicus EFFIS","Copernicus Water","Copernicus Sentinel-1","Copernicus NDVI","Copernicus EMS","ANA Vulnerabilidade Inundacoes",
                ].map(name => {
                  const h = getValidatedSourceHealth(name);
                  const ok   = h?.ok;
                  const never = !h;
                  const pending = h?.pending;
                  const color = never || pending ? "#64748b" : ok ? "#22c55e" : "#ef4444";
                  const label = never || pending ? "Aguardando" : ok ? "OK" : "Falhou";
                  return (
                    <div key={name} style={{ padding:"9px 12px", background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:5, border:`1px solid ${color}33`, borderLeft:`3px solid ${color}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:10, fontWeight:600, color:t.text }}>{name}</span>
                        <span style={{ fontSize:8, fontWeight:700, color }}>{label}</span>
                      </div>
                      {h && (
                        <>
                          <div style={{ fontSize:8, color:t.textMuted }}>Latência: {pending ? "sem consulta recente" : (typeof h.latencyMs === "number" ? h.latencyMs + "ms" : "OK")}</div>
                          {h.lastOk && <div style={{ fontSize:8, color:t.textFaint }}>Último OK: {formatDateTimeBR(h.lastOk)}</div>}
                          {h.error && !ok && !pending && (
                            <div style={{ fontSize:8, color:anaComplementar ? "#eab308" : "#ef4444", marginTop:2 }}>
                              {anaComplementar ? h.error || "sem leitura operacional validada da ANA" : h.error}
                            </div>
                          )}
                          {h.error && pending && !anaComplementar && (
                            <div style={{ fontSize:8, color:"#64748b", marginTop:2 }}>
                              {h.error}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:8, fontSize:8, color:t.textFaint }}>
                Atualizado junto com os dados de cada fonte. Latência medida no navegador. Fontes complementares ou sem leitura validada não reprovam o SITREP operacional.
              </div>
            </div>

          </div>
  );
}
