export function QueimadasTab({ ctx }) {
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
    icmbioUcs,
    loadAllData,
    loadQueimadas,
    percentValue,
    qLoading,
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
            <div style={{ padding:"10px 14px", background: dark?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:5, fontSize:10, color: dark?"#fdba74":"#c2410c", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <span>🔥 Focos via <strong>INPE BDQueimadas</strong> (48h). <strong>EFFIS/Copernicus</strong> conectado como WMS complementar; alerta operacional continua dependente de foco real georreferenciado no RS.</span>
              <button onClick={loadQueimadas} disabled={qLoading} style={{ background:"none", border:"1px solid rgba(249,115,22,0.5)", color:"#fdba74", padding:"5px 12px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:9, letterSpacing:1 }}>{qLoading ? "⏳ Consultando..." : "↻ Atualizar"}</button>
            </div>
            {!queimadas && !qLoading && (
              <div style={{ padding:"10px 14px", background: dark?"rgba(0,0,0,0.2)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, fontSize:10, color:t.textMuted }}>
                ℹ️ A API INPE BDQueimadas pode estar temporariamente indisponível. Isso é frequente fora do período de seca (maio/inverno). Clique em <strong>Atualizar</strong> para tentar novamente. Dados históricos de referência: RS registrou focos concentrados em outubro–novembro, com pico em anos de estiagem.
              </div>
            )}

            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>ÁREAS MONITORADAS — PORTO ALEGRE AO CHUÍ</div>
              <div style={{ fontSize:9, color:t.textMuted, marginBottom:12, lineHeight:1.5 }}>
                Corredor costeiro e lagunar para cruzar focos INPE, unidades de conservação, fumaça e camadas complementares EFFIS/GWIS. Estes cards indicam área de monitoramento; só viram alerta quando houver foco real ou endpoint de risco validado.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:8 }}>
                {FIRE_MONITORED_AREAS_RS.map((area, idx)=>(
                  <div key={area.id} style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:8, color:t.textFaint, letterSpacing:1.5 }}>TRECHO {idx+1}</div>
                        <div style={{ fontSize:13, fontWeight:900, color:t.text }}>{area.name}</div>
                      </div>
                      <div style={{ fontSize:8, color:"#eab308", border:"1px solid rgba(234,179,8,0.45)", borderRadius:3, padding:"2px 6px" }}>monitorar</div>
                    </div>
                    <div style={{ fontSize:9, color:t.textMuted, lineHeight:1.45, marginTop:6 }}>{area.focus}</div>
                    <div style={{ fontSize:8, color:t.textFaint, marginTop:7 }}>{area.lat.toFixed(2)}°, {area.lon.toFixed(2)}° · INPE + EFFIS/GWIS complementar</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Focos INPE */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>FOCOS INPE — RS (últimas 48h)</div>
              {qLoading ? (
                <div style={{ textAlign:"center", padding:30, color:"#f97316", fontSize:12 }}>🔥 Consultando INPE...</div>
              ) : queimadas ? (
                <div>
                  <div style={{ fontSize:22, fontWeight:700, color:"#f97316", marginBottom:4 }}>
                    {Array.isArray(queimadas)?queimadas.length:queimadas?.count ?? "–"} focos
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted }}>
                    detectados no RS nas últimas 48h · INPE BDQueimadas
                    {queimadas?.latest ? ` · último foco: ${formatDateTimeBR(queimadas.latest)}` : ""}
                  </div>
                  {/* EFFIS WMS complementar */}
                  {effisHealth?.ok && (
                    <div style={{ marginTop:10, padding:"8px 12px", background: dark?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.22)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                      EFFIS WMS respondeu OK. Uso complementar: perigo meteorológico de fogo, focos ativos e área queimada. Não aciona alerta automático para RS sem cruzamento espacial validado.
                    </div>
                  )}
                  {(Array.isArray(queimadas) ? queimadas : queimadas?.records)?.length > 0 && (
                    <div style={{ marginTop:10, display:"grid", gap:5, maxHeight:200, overflowY:"auto" }}>
                      {(Array.isArray(queimadas) ? queimadas : queimadas.records).slice(0,10).map((f,i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 8px", background: dark?"rgba(0,0,0,0.3)":t.bg, borderRadius:3, fontSize:9, color:t.textMuted }}>
                          <span>🔥 {f.municipio||f.properties?.municipio||"RS"}</span>
                          <span>{f.datahora||f.properties?.datahora||"–"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {queimadas?.ok && queimadas?.count === 0 && (
                    <div style={{ marginTop:10, padding:"8px 12px", background: dark?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.22)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                      Consulta operacional OK. Nenhum foco detectado no RS no período consultado.
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:11, color:t.textMuted, marginBottom:8 }}>
                    API INPE BDQueimadas indisponível no momento. Sem dado operacional de focos nas últimas 48h. Verifique junto ao INPE BDQueimadas.
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                    <div style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:3 }}>
                      <div style={{ fontSize:8, color:t.textMuted }}>Fonte primária</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#eab308" }}>indisponível</div>
                    </div>
                    <div style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:3 }}>
                      <div style={{ fontSize:8, color:t.textMuted }}>Uso operacional</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#eab308" }}>não aciona alerta</div>
                    </div>
                  </div>
                  <div style={{ marginTop:10, padding:"8px 12px", background: dark?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.04)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                    EFFIS WMS será verificado pela função complementar. Sem foco INPE validado, esta aba não aciona alerta operacional.
                  </div>
                  <button onClick={loadQueimadas} style={{ marginTop:10, background: dark?"rgba(249,115,22,0.1)":"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.4)", color:"#fdba74", padding:"7px 14px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:10 }}>
                    ↻ Tentar novamente
                  </button>
                </div>
              )}
            </div>

            {/* APAs */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>UNIDADES DE CONSERVACAO - RS</div>
              <div style={{ fontSize:9, color: dark?"#eab308":"#a16207", marginBottom:12, padding:"6px 10px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.2)", borderRadius:4 }}>
                Cadastro oficial CNUC/MMA conectado. E camada complementar de contexto; risco por UC em tempo real ainda exige cruzar foco INPE com geocerca/poligono validado.
              </div>
              <div style={{ display:"grid", gap:7 }}>
                {(icmbioUcs?.ok ? icmbioUcs.records : APAS_RS).map((apa)=>{
                  const fireRecords = Array.isArray(queimadas) ? queimadas : (queimadas?.records || []);
                  const areaText = `${apa.name || ""} ${apa.municipio || ""} ${apa.municipios || ""}`.toLowerCase();
                  const hasFire = fireRecords.some((focus) => {
                    const city = String(focus.municipio || focus.properties?.municipio || "").toLowerCase();
                    return city && areaText.includes(city);
                  });
                  return (
                  <div key={apa.id || apa.name} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"center", padding:"9px 12px", background: dark?"rgba(0,0,0,0.2)":t.bg, border:`1px solid ${t.border}`, borderRadius:4 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:t.text }}>{apa.name}</div>
                      <div style={{ fontSize:9, color:t.textMuted }}>{apa.municipio || apa.municipios || apa.categoria}</div>
                    </div>
                    <div style={{ fontSize:9, color:t.textFaint }}>{apa.area_ha ? `${Math.round(apa.area_ha).toLocaleString("pt-BR")} ha` : apa.lat ? `${apa.lat.toFixed(2)}S` : "CNUC"}</div>
                    <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${hasFire ? "#f97316" : "#22c55e66"}`, color:hasFire ? "#f97316" : "#22c55e", borderRadius:3 }}>{hasFire ? "Alerta" : "Normal"}</div>
                  </div>
                  );
                })}
              </div>
              <div style={{ marginTop:10, padding:"9px 11px", background: dark?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.04)", border:"1px solid rgba(249,115,22,0.15)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                {icmbioUcs?.ok ? `Fonte: MMA/ICMBio CNUC via CKAN Dados Abertos - ${icmbioUcs.total_rs} UCs no RS - exibindo ${icmbioUcs.count} prioritarias.` : "Cadastro local exibido porque a fonte CNUC/MMA nao respondeu agora."}
              </div>
            </div>
            {/* EFFIS */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>COPERNICUS EFFIS/GWIS — INTEGRAÇÃO COMPLEMENTAR</div>
              <div style={{ fontSize:9, color: dark?"#fef08a":"#854d0e", marginBottom:10, padding:"5px 10px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.2)", borderRadius:4 }}>
                {effisHealth?.ok ? "EFFIS WMS conectado. Uso complementar; não aciona alerta para RS sem geocerca/foco validado." : "EFFIS WMS ainda não respondeu nesta sessão. Para alerta global no RS, próxima etapa é integrar GWIS/FIRMS."}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                {[
                  { l:"Previsão de perigo de fogo",  v:"1 a 10 dias", c:"#f97316", d:"Perigo meteorológico de fogo. É previsão de condição favorável, não confirmação de incêndio." },
                  { l:"Focos ativos",  v:"MODIS/VIIRS", c:"#eab308", d:"Focos ativos detectados por satélite. Complementa o INPE após geocerca validada." },
                  { l:"Áreas queimadas",    v:"Área queimada", c:"#22c55e", d:"Perímetros/áreas queimadas para análise pós-evento." },
                  { l:"Solicitação de dados",       v:"Sob demanda", c:"#8b5cf6", d:"Produtos históricos ou brutos podem exigir solicitação específica ao EFFIS/GWIS." },
                ].map(item=>(
                  <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"10px 12px", borderRadius:4, borderTop:`3px solid ${item.c}` }}>
                    <div style={{ fontSize:9, color:t.textMuted, marginBottom:4 }}>{item.l}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:item.c, marginBottom:3 }}>{item.v}</div>
                    <div style={{ fontSize:8, color:t.textFaint }}>{item.d}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:8, color:t.textFaint, marginTop:8 }}>
                Copernicus EFFIS/GWIS · WMS complementar · endpoint verificado: {effisHealth?.ok ? "OK" : "aguardando resposta"}
              </div>
            </div>
          </div>
  );
}
