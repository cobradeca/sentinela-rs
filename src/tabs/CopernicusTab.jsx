import { DefesaCivilNotice } from "../components/DefesaCivilNotice";
export function CopernicusTab({ ctx }) {
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

          <div style={{ display:"grid", gap:12 }}>
            <DefesaCivilNotice t={t} dark={dark} />
            <div style={{ padding:"10px 14px", background: dark?"rgba(139,92,246,0.08)":"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.3)", borderRadius:5, fontSize:10, color: dark?"#c4b5fd":"#7c3aed" }}>
              🛰️ <strong>Copernicus — produtos reais ativos.</strong> Sentinel-2 observa água e vegetação quando há céu útil. Sentinel-1 usa radar e ajuda mesmo com nuvens ou à noite. As cores dos números destacam o tipo do indicador e a qualidade da leitura; não são alerta oficial. A decisão operacional continua dependendo de Defesa Civil, CEMADEN, RADAR Lagoa, HidroSens e demais fontes responsáveis.
            </div>

            <div style={{ ...s.card, border:`1px solid ${copernicusEms?.ok ? "#22c55e55" : "#eab30855"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS EMS / CEMS</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>Rapid Mapping + Risk and Recovery</div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    API pública oficial. Uso no Sentinela-RS: resposta pós-evento e referência histórica validada; não aciona alerta automático sozinho.
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:`1px solid ${copernicusEms?.ok ? "#22c55e" : "#eab308"}`, color:copernicusEms?.ok ? "#22c55e" : "#eab308" }}>
                  {copernicusEms?.ok ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusEms?.ok ? (
                <div style={{ display:"grid", gap:10 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:8 }}>
                    <div style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                      <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>ATIVAÇÕES BRASIL/FLOOD</div>
                      <div style={{ fontSize:22, fontWeight:900, color:"#22c55e" }}>{copernicusEms.rapid_mapping?.recent_brazil_floods?.length ?? 0}</div>
                      <div style={{ fontSize:8, color:t.textMuted }}>consulta pública Rapid Mapping</div>
                    </div>
                    <div style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                      <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>EMSR720</div>
                      <div style={{ fontSize:15, fontWeight:900, color:t.text }}>{copernicusEms.rapid_mapping?.rs_2024?.aois?.length ?? 0} áreas</div>
                      <div style={{ fontSize:8, color:t.textMuted }}>RS 2024 · Rapid Mapping</div>
                    </div>
                    <div style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                      <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>EMSN194</div>
                      <div style={{ fontSize:15, fontWeight:900, color:t.text }}>{copernicusEms.risk_recovery?.rs_2024?.products?.length ?? 0} produtos</div>
                      <div style={{ fontSize:8, color:t.textMuted }}>Porto Alegre · Risk and Recovery</div>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:8 }}>
                    {(copernicusEms.risk_recovery?.rs_2024?.products || []).map((p) => (
                      <div key={p.productName} style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:14, fontWeight:900, color:t.text }}>{p.productName} · {p.productAcronym}</div>
                        <div style={{ fontSize:10, color:t.textMuted, marginTop:3 }}>{p.analysisName}</div>
                        <div style={{ fontSize:8, color:t.textFaint, marginTop:5 }}>
                          AOIs: {(p.aois || []).map(a=>a.aoiName).join(", ") || "não informado"} · Camadas ArcGIS: {p.arcgisLayers?.length || 0}
                        </div>
                        {p.arcgisLayers?.[0]?.[1] && (
                          <a href={p.arcgisLayers[0][1]} target="_blank" rel="noreferrer" style={{ display:"inline-block", marginTop:7, fontSize:9, color:t.accent }}>
                            abrir camada ArcGIS →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize:9, color:t.textMuted, lineHeight:1.55 }}>
                    EMSR720 cobre áreas mapeadas no evento de maio/2024 como Guaporé, Encantado, Das Antas Dam e Santa Tereza. EMSN194 cobre Porto Alegre, Canoas, Porto Alegre North e Porto Alegre South em produtos de delineação, análise temporal, danos e exposição.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted }}>Copernicus EMS ainda não carregado nesta sessão.</div>
              )}
            </div>

            <div style={{ ...s.card, border:`1px solid ${copernicusWater?.ok ? "#22c55e55" : "#eab30855"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS WATER</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>
                    {copernicusWater?.aoi || "Lagoa dos Patos"}
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    {copernicusWater?.product || "Sentinel-2 L2A NDWI water indicator"}
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:`1px solid ${copernicusWater?.ok ? "#22c55e" : "#eab308"}`, color:copernicusWater?.ok ? "#22c55e" : "#eab308" }}>
                  {copernicusWater?.ok ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusWater?.ok ? (
                <>
                  {/* BLOCO: aviso de cobertura insuficiente */}
                  {typeof copernicusWater.valid_coverage_percent === "number" && copernicusWater.valid_coverage_percent < 30 && (
                    <div style={{ marginBottom:10, padding:"8px 10px", background: dark?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:4, fontSize:9, color:dark?"#fca5a5":"#b91c1c", lineHeight:1.5 }}>
                      ⛅ <strong>Cobertura válida insuficiente: {copernicusWater.valid_coverage_percent}%</strong> — alta nebulosidade no período. O indicador de água superficial ({copernicusWater.water_percent}%) pode não ser representativo. Use Sentinel-1 SAR como referência complementar e confirme com Defesa Civil, CEMADEN e RADAR Lagoa.
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
                    {[
                      { l:"Água superficial", v:`${copernicusWater.water_percent}%`, c: typeof copernicusWater.valid_coverage_percent === "number" && copernicusWater.valid_coverage_percent < 30 ? "#64748b" : "#22d3ee" },
                      { l:"NDWI médio", v: typeof copernicusWater.ndwi_mean === "number" ? copernicusWater.ndwi_mean.toFixed(3) : "–", c:"#60a5fa" },
                      { l:"Cobertura válida", v: typeof copernicusWater.valid_coverage_percent === "number" ? `${copernicusWater.valid_coverage_percent}%` : "–", c:"#22c55e" },
                      { l:"Amostras", v: copernicusWater.sample_count?.toLocaleString("pt-BR") || "–", c:t.text },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>{item.l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:item.c, marginTop:3 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
                    Período: {copernicusWater.period?.from ? formatDateTimeBR(copernicusWater.period.from) : "–"} → {copernicusWater.period?.to ? formatDateTimeBR(copernicusWater.period.to) : "–"} · Consulta: {copernicusWater.fetched_at ? formatDateTimeBR(copernicusWater.fetched_at) : "sem horário"}
                  </div>

                  {/* Explicação em linguagem clara */}
                  <div style={{ marginTop:10, padding:"9px 12px", background: dark?"rgba(34,211,238,0.05)":"rgba(8,145,178,0.04)", border:`1px solid ${t.border}`, borderRadius:4, fontSize:9, color:t.textMuted, lineHeight:1.65 }}>
                    <strong style={{ color:t.text, display:"block", marginBottom:4 }}>Como interpretar:</strong>
                    O app compara os pixels válidos da imagem com um índice de água. Se a cobertura válida for baixa, havia nuvem, sombra ou outro bloqueio e o resultado fica menos confiável. Água superficial e NDWI ajudam a ver a presença de água na imagem, mas não confirmam inundação sozinhos.
                  </div>
                  <div style={{ marginTop:8, padding:"8px 10px", background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color:dark?"#fef08a":"#854d0e", lineHeight:1.5 }}>
                    ⚠ Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, o Sentinel-1 SAR abaixo funciona mesmo à noite e com céu fechado.
                  </div>
                  <div style={{ marginTop:6, fontSize:8, color:t.textFaint }}>
                    Fonte: {copernicusWater.source} · Regra: {copernicusWater.threshold}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  Produto real ainda não carregado nesta sessão. A função Copernicus Water já existe; se persistir, verificar a aba Fontes de Dados ou rodar o auditor.
                </div>
              )}
            </div>

            <div style={{ ...s.card, border:`1px solid ${copernicusS1?.water_like_percent !== undefined ? "#8b5cf655" : "#eab30855"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS SENTINEL-1</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>
                    {copernicusS1?.aoi || "Lagoa dos Patos"}
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    Radar SAR · água/alagamento sob nuvens/noite
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:`1px solid ${copernicusS1?.water_like_percent !== undefined ? "#8b5cf6" : "#eab308"}`, color:copernicusS1?.water_like_percent !== undefined ? "#8b5cf6" : "#eab308" }}>
                  {copernicusS1?.water_like_percent !== undefined ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusS1?.water_like_percent !== undefined ? (
                <>
                  {/* BLOCO: aviso cobertura SAR insuficiente */}
                  {typeof copernicusS1.valid_coverage_percent === "number" && copernicusS1.valid_coverage_percent < 30 && (
                    <div style={{ marginBottom:10, padding:"8px 10px", background: dark?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:4, fontSize:9, color:dark?"#fca5a5":"#b91c1c", lineHeight:1.5 }}>
                      📡 <strong>Cobertura SAR válida: {copernicusS1.valid_coverage_percent}%</strong> — dados insuficientes para o período. O Sentinel-1 é radar (funciona com nuvens), mas baixa cobertura indica ausência de passagens no intervalo. Interprete com cautela.
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
                    {[
                      { l:"Indicador SAR água", v:`${copernicusS1.water_like_percent}%`, c: typeof copernicusS1.valid_coverage_percent === "number" && copernicusS1.valid_coverage_percent < 30 ? "#64748b" : "#8b5cf6" },
                      { l:"VV médio", v: typeof copernicusS1.vv_db_mean === "number" ? `${copernicusS1.vv_db_mean.toFixed(2)} dB` : "–", c:"#60a5fa" },
                      { l:"VH médio", v: typeof copernicusS1.vh_db_mean === "number" ? `${copernicusS1.vh_db_mean.toFixed(2)} dB` : "–", c:"#22d3ee" },
                      { l:"Cobertura válida", v: typeof copernicusS1.valid_coverage_percent === "number" ? `${copernicusS1.valid_coverage_percent}%` : "–", c:"#22c55e" },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>{item.l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:item.c, marginTop:3 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
                    Período: {copernicusS1.period?.from ? formatDateTimeBR(copernicusS1.period.from) : "–"} → {copernicusS1.period?.to ? formatDateTimeBR(copernicusS1.period.to) : "–"} · Consulta: {copernicusS1.fetched_at ? formatDateTimeBR(copernicusS1.fetched_at) : "sem horário"}
                  </div>

                  {/* Explicação em linguagem clara */}
                  <div style={{ marginTop:10, padding:"9px 12px", background: dark?"rgba(139,92,246,0.05)":"rgba(139,92,246,0.04)", border:`1px solid ${t.border}`, borderRadius:4, fontSize:9, color:t.textMuted, lineHeight:1.65 }}>
                    <strong style={{ color:t.text, display:"block", marginBottom:4 }}>Como interpretar:</strong>
                    O Sentinel-1 mede o retorno do sinal de radar. Superfícies de água costumam devolver pouco sinal, por isso aparecem como “compatíveis com água”. Esse é um bom apoio quando há nuvens, mas pode confundir áreas urbanas, vegetação inundada, vento sobre a água e sombras de relevo.
                  </div>
                  <div style={{ marginTop:8, padding:"8px 10px", background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color:dark?"#fef08a":"#854d0e", lineHeight:1.5 }}>
                    ⚠ {copernicusS1.limitation || "Indicador SAR de baixa retroespalhamento compatível com água. Pode falhar em áreas urbanas, vegetação inundada, vento forte sobre água e sombras de relevo. Confirmar com Defesa Civil, CEMADEN, RADAR Lagoa e HidroSens."}
                  </div>
                  <div style={{ marginTop:6, fontSize:8, color:t.textFaint }}>
                    Fonte: {copernicusS1.source} · Método: {copernicusS1.method}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  Sentinel-1 ainda não carregado nesta sessão.
                </div>
              )}
            </div>

            <div style={{ ...s.card, border:`1px solid ${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e55" : "#eab30855"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS NDVI</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>
                    {copernicusNdvi?.aoi || "Entorno terrestre da Lagoa dos Patos"}
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    Vegetação/estiagem · Sentinel-2 L2A
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:`1px solid ${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308"}`, color:copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308" }}>
                  {copernicusNdvi?.ndvi_mean !== undefined ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusNdvi?.ndvi_mean !== undefined ? (
                <>
                  {/* BLOCO: aviso cobertura NDVI insuficiente */}
                  {typeof copernicusNdvi.valid_coverage_percent === "number" && copernicusNdvi.valid_coverage_percent < 30 && (
                    <div style={{ marginBottom:10, padding:"8px 10px", background: dark?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:4, fontSize:9, color:dark?"#fca5a5":"#b91c1c", lineHeight:1.5 }}>
                      🌿 <strong>Cobertura válida insuficiente: {copernicusNdvi.valid_coverage_percent}%</strong> — alta nebulosidade no período. O NDVI ({copernicusNdvi.ndvi_mean.toFixed(3)}) pode não ser representativo do estado atual da vegetação.
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
                    {[
                      { l:"NDVI médio", v:copernicusNdvi.ndvi_mean.toFixed(3), c: typeof copernicusNdvi.valid_coverage_percent === "number" && copernicusNdvi.valid_coverage_percent < 30 ? "#64748b" : "#22c55e" },
                      { l:"Vegetação saudável", v: typeof copernicusNdvi.vegetation_percent === "number" ? `${copernicusNdvi.vegetation_percent}%` : "–", c:"#16a34a" },
                      { l:"Vegetação baixa", v: typeof copernicusNdvi.low_vegetation_percent === "number" ? `${copernicusNdvi.low_vegetation_percent}%` : "–", c:"#eab308" },
                      { l:"Cobertura válida", v: typeof copernicusNdvi.valid_coverage_percent === "number" ? `${copernicusNdvi.valid_coverage_percent}%` : "–", c:"#22d3ee" },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>{item.l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:item.c, marginTop:3 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
                    Período: {copernicusNdvi.period?.from ? formatDateTimeBR(copernicusNdvi.period.from) : "–"} → {copernicusNdvi.period?.to ? formatDateTimeBR(copernicusNdvi.period.to) : "–"} · Consulta: {copernicusNdvi.fetched_at ? formatDateTimeBR(copernicusNdvi.fetched_at) : "sem horário"}
                  </div>

                  <div style={{ marginTop:8, padding:"8px 10px", background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color:dark?"#fef08a":"#854d0e", lineHeight:1.5 }}>
                    ⚠ {copernicusNdvi.limitation || "NDVI ajuda a acompanhar vigor da vegetação e sinais de estiagem. É contexto ambiental e não gera alerta automático sozinho."}
                  </div>

                  <div style={{ marginTop:6, fontSize:8, color:t.textFaint }}>
                    Fonte: {copernicusNdvi.source} · Método: {copernicusNdvi.method}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  Produto NDVI ainda não carregado nesta sessão. Se persistir, rode o diagnóstico do endpoint.
                </div>
              )}
            </div>

            {COPERNICUS_REFERENCE.themes.length > 0 && (
              <>
              <div style={{ padding:"8px 14px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color: dark?"#fef08a":"#854d0e" }}>
                🗓 <strong>Referências históricas:</strong> os cartões abaixo não são SITREP operacional. São contexto técnico/histórico separado da leitura Copernicus Water acima.
              </div>

              <div style={{ display:"grid", gap:8 }}>
                {COPERNICUS_REFERENCE.themes.map(theme=>(
                <div key={theme.id} style={{ background:t.cardBg, border:`1px solid ${theme.color}44`, borderLeft:`4px solid ${theme.color}`, borderRadius:5, overflow:"hidden", boxShadow:t.shadowCard }}>
                  <div style={{ padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:11 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:20 }}>{theme.icon}</span>
                        <div style={{ fontSize:13, fontWeight:600, color:t.text }}>{theme.name}</div>
                        <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${theme.color}`, color:theme.color, borderRadius:3, letterSpacing:2 }}>REFERÊNCIA</div>
                      </div>
                      <div style={{ fontSize:10, color:t.textMuted, marginBottom:4, lineHeight:1.5 }}><strong style={{ color:t.text }}>Histórico RS:</strong> {theme.rsHistory}</div>
                      <div style={{ fontSize:9, color:t.textFaint }}>📡 {theme.copSource}</div>
                    </div>
                    <div style={{ flexShrink:0, textAlign:"right", maxWidth:170 }}>
                      <div style={{ fontSize:8, color:"#eab308", marginBottom:4 }}>○ NÃO OPERACIONAL</div>
                      <div style={{ fontSize:9, color:theme.color, fontWeight:600, textAlign:"right", lineHeight:1.4 }}>{theme.indicator}</div>
                    </div>
                  </div>
                </div>
                ))}
              </div>
              </>
            )}
          </div>
  );
}
