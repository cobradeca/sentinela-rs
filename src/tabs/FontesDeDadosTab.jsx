export function FontesDeDadosTab({ ctx }) {
  const {
    anaComplementar,
    copernicusEms,
    copernicusNdvi,
    copernicusS1,
    copernicusWater,
    dark,
    formatDateTimeBR,
    getValidatedSourceHealth,
    s,
    t,
  } = ctx;

  const groups = [
    {
      title: "Política operacional",
      body: "O Sentinela-RS organiza dados públicos e indicadores ambientais para acompanhamento. Os avisos oficiais são os da Defesa Civil RS. Em situação de risco, ligue 199.",
    },
    {
      title: "Leituras reais",
      body: "Leituras reais, locais e indicadores derivados aparecem rotulados separadamente. Esta ferramenta não dispara novo alerta automático.",
    },
    {
      title: "Camadas complementares",
      body: "EFFIS WMS, Copernicus, NOAA e IRI entram como contexto técnico ou histórico, não como alerta operacional sozinho.",
    },
  ];

  const sourceNames = [
    "Open-Meteo", "INMET", "RADAR Lagoa", "HidroSens", "Sensores Monitoramento", "Defesa Civil RS",
    "NOAA/CPC ENSO", "IRI/CCSR ENSO", "CPTEC/INPE", "ANA Telemetria Rios", "Rodovias RS",
    "INPE BDQueimadas", "INPE Eventos de Fogo", "CENSIPAM Painel do Fogo", "Copernicus EFFIS",
    "Copernicus Water", "Copernicus Sentinel-1", "Copernicus NDVI", "Copernicus EMS", "ANA Vulnerabilidade Inundacoes",
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 8 }}>
        {groups.map((item) => (
          <div key={item.title} style={{ ...s.card, border: `1px solid ${t.borderActive}` }}>
            <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 2, marginBottom: 8 }}>{item.title.toUpperCase()}</div>
            <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.7 }}>{item.body}</div>
          </div>
        ))}
      </div>

      <div style={{ ...s.card, border: `1px solid ${t.borderActive}` }}>
        <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 2, marginBottom: 10 }}>SAÚDE DAS FONTES — ÚLTIMA VERIFICAÇÃO</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
          {sourceNames.map((name) => {
            const h = getValidatedSourceHealth(name);
            const ok = h?.ok;
            const never = !h;
            const pending = h?.pending;
            const color = never || pending ? "#64748b" : ok ? "#22c55e" : "#ef4444";
            const label = never || pending ? "Aguardando" : ok ? "OK" : "Falhou";

            return (
              <div key={name} style={{ padding: "10px 12px", background: dark ? "rgba(0,0,0,0.25)" : t.bg, borderRadius: 8, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: t.text }}>{name}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color }}>{label}</span>
                </div>
                {h && (
                  <>
                    <div style={{ fontSize: 8, color: t.textMuted }}>Latência: {pending ? "sem consulta recente" : (typeof h.latencyMs === "number" ? `${h.latencyMs}ms` : "OK")}</div>
                    {h.lastOk && <div style={{ fontSize: 8, color: t.textFaint }}>Último OK: {formatDateTimeBR(h.lastOk)}</div>}
                    {h.error && !ok && !pending && (
                      <div style={{ fontSize: 8, color: anaComplementar ? "#eab308" : "#ef4444", marginTop: 2 }}>
                        {anaComplementar ? h.error || "sem leitura operacional validada da ANA" : h.error}
                      </div>
                    )}
                    {h.error && pending && !anaComplementar && (
                      <div style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>{h.error}</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 8, fontSize: 8, color: t.textFaint }}>
          Atualizado junto com os dados de cada fonte. Latência medida no navegador. Fontes complementares ou sem leitura validada não reprovam o SITREP operacional.
        </div>
      </div>

      <div style={{ ...s.card, border: `1px solid ${t.borderActive}` }}>
        <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 2, marginBottom: 10 }}>COPERNICUS E CONTEXTO COMPLEMENTAR</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            ["Copernicus Water", copernicusWater?.ok ? `Água superficial ${copernicusWater.water_percent}%` : "Aguardando leitura"],
            ["Copernicus Sentinel-1", copernicusS1?.water_like_percent !== undefined ? `Indicador SAR ${copernicusS1.water_like_percent}%` : "Aguardando leitura"],
            ["Copernicus NDVI", copernicusNdvi?.ndvi_mean !== undefined ? `NDVI ${copernicusNdvi.ndvi_mean.toFixed(3)}` : "Aguardando leitura"],
            ["Copernicus EMS", copernicusEms?.ok ? "Produtos ativos" : "Aguardando leitura"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", background: dark ? "rgba(0,0,0,0.22)" : t.bg, borderRadius: 8, border: `1px solid ${t.border}` }}>
              <strong style={{ color: t.text }}>{label}</strong>
              <span style={{ color: t.textMuted }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

