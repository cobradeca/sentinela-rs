export function FontesDeDadosTab({ ctx }) {
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

          <div style={{ display:"grid", gap:12 }}>

            {/* BLOCO D — Saúde das fontes em tempo real */}
            <div style={{ ...s.card, border:`1px solid ${t.borderActive}` }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:10 }}>SAÚDE DAS FONTES — ÚLTIMA VERIFICAÇÃO</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
                {[
                  "Open-Meteo","INMET","CEMADEN","RADAR Lagoa","HidroSens","Defesa Civil RS",
                  "NOAA/CPC ENSO","IRI/CCSR ENSO","CPTEC/INPE","INPE BDQueimadas","Copernicus EFFIS","Copernicus Water","Copernicus Sentinel-1","Copernicus NDVI","Copernicus EMS","ANA HidroWeb",
                ].map(name => {
                  const h = getValidatedSourceHealth(name);
                  const ok   = h?.ok;
                  const never = !h;
                  const anaComplementar = name === "ANA HidroWeb" && (!h || !ok);
                  const color = never ? (anaComplementar ? "#eab308" : "#64748b") : anaComplementar ? "#eab308" : ok ? "#22c55e" : "#ef4444";
                  const label = anaComplementar ? "Configurar/sem leitura" : never ? "Carregando" : ok ? "OK" : "Falhou";
                  return (
                    <div key={name} style={{ padding:"9px 12px", background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:5, border:`1px solid ${color}33`, borderLeft:`3px solid ${color}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:10, fontWeight:600, color:t.text }}>{name}</span>
                        <span style={{ fontSize:8, fontWeight:700, color }}>{label}</span>
                      </div>
                      {h && (
                        <>
                          <div style={{ fontSize:8, color:t.textMuted }}>Latência: {typeof h.latencyMs === "number" ? h.latencyMs + "ms" : "OK"}</div>
                          {h.lastOk && <div style={{ fontSize:8, color:t.textFaint }}>Último OK: {formatDateTimeBR(h.lastOk)}</div>}
                          {h.error && !ok && (
                            <div style={{ fontSize:8, color:anaComplementar ? "#eab308" : "#ef4444", marginTop:2 }}>
                              {anaComplementar ? "sem leitura operacional validada da ANA" : h.error}
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

            {/* Detalhes estáticos por fonte */}
            <div style={{ display:"grid", gap:8 }}>
            {[
              { n:"Open-Meteo",               st:"ATIVO",     c:"#22c55e", d:"Previsão meteorológica 14 dias — temperatura, precipitação, vento. Atualização automática.", a:"Gratuita, sem chave", h:null },
              (() => {
                const hAna = getValidatedSourceHealth("ANA HidroWeb");
                const anaOk = Boolean(hAna?.ok);
                return {
                  n:"ANA HidroWeb (Telemetria)",
                  st: anaOk ? "ATIVO" : "AGUARDANDO CONFIGURACAO",
                  c: anaOk ? "#22c55e" : "#eab308",
                  d:"API oficial Hidro Webservice REST da ANA para série telemétrica adotada de nível, chuva e vazão. Uso complementar quando houver estação validada; não aciona alerta automático sozinho.",
                  a:"Requer secrets ANA_HIDROWEB_IDENTIFICADOR e ANA_HIDROWEB_SENHA no Supabase",
                  h:"Endpoint: ana-rs. A função autentica no Hidro Webservice, consulta HidroinfoanaSerieTelemetricaAdotada e considera operacional apenas leitura real com horário, fonte e menos de 24h."
                };
              })(),
              { n:"NOAA/CPC + IRI — ENSO",   st:"ATIVO",  c:"#22c55e", d:"ENSO: Niño 3.4, ONI e cenário probabilístico dominante. Índices observados e probabilidades atualizados via Edge Functions.", a:"Dados públicos, atualização mensal", h:"NOAA/CPC fornece índices observados. IRI/CCSR fornece probabilidade mensal. O app não usa valor fixo: se a Edge Function não retornar dado validado, o ENSO fica indisponível." },
              { n:"INPE BDQueimadas",          st:"ATIVO",     c:"#22c55e", d:"Focos de fogo ativo no RS via dados abertos CSV do INPE. Consulta últimos 2 dias, filtra RS no Supabase e aceita retorno vazio como operação normal.", a:"Sem chave", h:"Endpoint: inpe-queimadas-rs. Fonte pública: dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil. Vazio significa sem foco no período, não falha." },
              { n:"Copernicus EFFIS",          st:effisHealth?.ok ? "ATIVO" : "AGUARDANDO", c:effisHealth?.ok ? "#22c55e" : "#eab308", d:"WMS público EFFIS conectado como camada complementar de perigo/focos/área queimada. Para alerta no RS, exige cruzamento espacial validado e/ou integração global GWIS/FIRMS.", a:"WMS público; GWIS/FIRMS pode exigir chave", h:"Endpoint: effis-wms-health. Verifica GetCapabilities do WMS EFFIS. Não aciona alerta automático sozinho." },
              { n:"Copernicus Water / Sentinel-2", st:"ATIVO", c:"#22c55e", d:"Indicador real de água superficial por Sentinel-2 L2A/NDWI para a Lagoa dos Patos. Contexto hidrológico por satélite; não aciona alerta sozinho.", a:"Copernicus Data Space / Sentinel Hub", h:"Endpoint: copernicus-water. Produto óptico: depende de baixa nebulosidade. Usar como contexto junto com Defesa Civil, CEMADEN, RADAR Lagoa e HidroSens." },
              { n:"Copernicus Sentinel-1 SAR", st:"ATIVO", c:"#22c55e", d:"Indicador real SAR de água/alagamento sob nuvens/noite. Contexto remoto por radar; não é alerta oficial nem máscara validada de inundação.", a:"Copernicus Data Space / Sentinel Hub", h:"Endpoint: copernicus-sentinel1-water. Método: Sentinel-1 GRD IW/DV. Pode falhar em áreas urbanas, vegetação inundada, vento forte sobre água e sombras de relevo. Confirmar com órgãos responsáveis." },
              { n:"Copernicus NDVI / Vegetação", st:"ATIVO", c:"#22c55e", d:"Indicador real de vegetação/estiagem por Sentinel-2 L2A/NDVI. Contexto ambiental; não aciona alerta sozinho.", a:"Copernicus Data Space / Sentinel Hub", h:"Endpoint: copernicus-ndvi. Produto óptico: depende de baixa nebulosidade. Usar como contexto, não como alerta automático." },
              { n:"INMET",                     st:"ATIVO",     c:"#22c55e", d:"Previsão oficial por município via proxy Supabase da API apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Complementa a previsão 14 dias; se falhar, verificar junto ao INMET.", a:"API pública, sem chave", h:"Endpoint validado: https://apiprevmet3.inmet.gov.br/previsao/4315602" },
              { n:"CPTEC/INPE",                st:"ATIVO", c:"#22c55e", d:"Produtos sazonais/subsazonais oficiais por imagem via Edge Function. Uso: contexto climático, não alerta local imediato.", a:"API pública via Supabase Edge Function", h:"Endpoint: cptec-inpe-produtos. Produtos gráficos oficiais sazonais/subsazonais. Não são série numérica JSON e não disparam alerta local sozinhos." },
              { n:"Defesa Civil RS",           st:"ATIVO",     c:"#22c55e", d:"Avisos oficiais via RSS da Defesa Civil do Rio Grande do Sul, consumidos por Supabase Edge Function para evitar bloqueio CORS.", a:"RSS oficial via proxy", h:"Endpoint ativo: https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs" },
              { n:"CEMADEN",                   st:"ATIVO",     c:"#22c55e", d:"Chuva observada por acumulados recentes das PCDs CEMADEN. Fonte obrigatória: DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC.", a:"Token PED via Supabase Secret", h:"Endpoint: cemaden-rs. Cache: 10 min. Limite PED para usuário externo: até 12 requisições/minuto." },
              { n:"RADAR Lagoa dos Patos",     st:"ATIVO",     c:"#22c55e", d:"Sensores RADAR em 5 pontos da Lagoa (Itapuã, Arambaré, São Lourenço, São José do Norte, Rio Grande).", a:"API pública via proxy Supabase", h:"Endpoint: lagoa-patos-radar. Fallback local só entra após falha da fonte primária real, exibido como última leitura salva, com orientação de verificar junto à Rede RADAR Lagoa dos Patos. Fallback vencido não dispara novo alerta automático." },
              { n:"HidroSens / UFPel",         st:"ATIVO",     c:"#22c55e", d:"Sensor ultrassônico em Laranjal (Pelotas). Limiares: ALERTA 1,20m · CRÍTICO 1,40m · máx mai/2024: 2,40m.", a:"ThingsBoard público via Supabase", h:"Endpoint: hidrosens-laranjal. Altura do sensor: 5,06m. Fallback local só entra após falha da fonte primária real, exibido como última leitura salva, com orientação de verificar junto ao HidroSens/UFPel. Fallback vencido não dispara novo alerta automático." },
              { n:"Copernicus Emergency / Produtos avançados", st:copernicusEms?.ok ? "ATIVO" : "AGUARDANDO DEPLOY", c:copernicusEms?.ok ? "#22c55e" : "#eab308", d:"Copernicus EMS por API pública: Rapid Mapping EMSR720 e Risk and Recovery EMSN194 para o RS 2024, além de ativações recentes de Flood/Brazil. Camada oficial pós-evento; não aciona alerta automático sozinha.", a:"API pública CEMS / ArcGIS REST layers", h:null },
            ].map(api=>(
              <div key={api.n} style={{ background:t.cardBg, border:`1px solid ${t.border}`, borderRadius:5, overflow:"hidden", boxShadow:t.shadowCard }}>
                <div style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:11 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:t.text }}>{api.n}</div>
                    </div>
                    <div style={{ fontSize:10, color:t.textMuted, marginBottom:3 }}>{api.d}</div>
                    <div style={{ fontSize:9, color:t.textFaint }}>🔑 {api.a}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                    <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${api.c}`, color:api.c, borderRadius:3, letterSpacing:2 }}>{api.st}</div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
  );
}
