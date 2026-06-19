import { useState } from "react";

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
    loadAllData,
    refreshAll,
    loadQueimadas,
    loadCptecProducts,
    loadCopernicusWater,
    loadCopernicusSentinel1,
    loadCopernicusEms,
    loadCopernicusNdvi,
    loadIriProbabilities,
    loadEnsoLive,
  } = ctx;

  const [reloading, setReloading] = useState({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  // Mapa: nome da fonte exibido -> função de reload específica.
  // Fontes sem handler próprio caem no loadAllData (consulta geral).
  const RELOAD_HANDLERS = {
    "Open-Meteo": loadAllData,
    "INMET": loadAllData,
    "RADAR Lagoa": loadAllData,
    "HidroSens": loadAllData,
    "Sensores Monitoramento": loadAllData,
    "Defesa Civil RS": loadAllData,
    "ANA Telemetria Rios": loadAllData,
    "Rodovias RS": loadAllData,
    "ANA Vulnerabilidade Inundacoes": loadAllData,
    "NOAA/CPC ENSO": loadEnsoLive,
    "IRI/CCSR ENSO": loadIriProbabilities,
    "CPTEC/INPE": loadCptecProducts,
    "INPE BDQueimadas": loadQueimadas,
    "INPE Eventos de Fogo": loadQueimadas,
    "CENSIPAM Painel do Fogo": loadQueimadas,
    "Copernicus EFFIS": loadQueimadas,
    "Copernicus Water": loadCopernicusWater,
    "Copernicus Sentinel-1": loadCopernicusSentinel1,
    "Copernicus NDVI": loadCopernicusNdvi,
    "Copernicus EMS": loadCopernicusEms,
  };

  async function handleReload(name) {
    const fn = RELOAD_HANDLERS[name];
    if (!fn || reloading[name]) return;
    setReloading((r) => ({ ...r, [name]: true }));
    try {
      await fn();
    } finally {
      setReloading((r) => ({ ...r, [name]: false }));
    }
  }

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 2 }}>SAÚDE DAS FONTES — ÚLTIMA VERIFICAÇÃO</div>
          <button
            type="button"
            onClick={async () => {
              setIsRefreshingAll(true);
              try {
                await refreshAll();
              } finally {
                setIsRefreshingAll(false);
              }
            }}
            disabled={isRefreshingAll}
            className="sr-btn-outline"
            style={{ fontSize: 10, padding: "4px 10px", opacity: isRefreshingAll ? 0.6 : 1 }}
          >
            {isRefreshingAll ? "↻ Atualizando..." : "↻ Atualizar tudo"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 8 }}>
          {sourceNames.map((name) => {
            const h = getValidatedSourceHealth(name);
            const ok = h?.ok;
            const never = !h;
            const pending = h?.pending;
            const color = never || pending ? "#64748b" : ok ? "#22c55e" : "#ef4444";
            const label = never || pending ? "Aguardando" : ok ? "OK" : "Falhou";
            const isReloading = Boolean(reloading[name]);
            const canReload = Boolean(RELOAD_HANDLERS[name]);

            return (
              <div key={name} style={{ padding: "10px 12px", background: dark ? "rgba(0,0,0,0.25)" : t.bg, borderRadius: 8, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: t.text }}>{name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color }}>{label}</span>
                    {canReload && (
                      <button
                        type="button"
                        onClick={() => handleReload(name)}
                        disabled={isReloading}
                        aria-label={`Atualizar ${name}`}
                        title={`Atualizar ${name}`}
                        style={{
                          border: "none", background: "transparent", cursor: isReloading ? "default" : "pointer",
                          fontSize: 11, lineHeight: 1, padding: 2, color: t.textMuted,
                          opacity: isReloading ? 0.5 : 1,
                          animation: isReloading ? "sr-spin 0.8s linear infinite" : "none",
                        }}
                      >
                        ↻
                      </button>
                    )}
                  </span>
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
          Atualizado junto com os dados de cada fonte. Latência medida no navegador. Fontes complementares ou sem leitura validada não reprovam o SITREP operacional. Use o ↻ em cada card para recarregar só aquele endpoint.
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
          ].map(([label, value]) => {
            const isReloading = Boolean(reloading[label]);
            return (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", background: dark ? "rgba(0,0,0,0.22)" : t.bg, borderRadius: 8, border: `1px solid ${t.border}` }}>
                <strong style={{ color: t.text }}>{label}</strong>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: t.textMuted }}>{value}</span>
                  <button
                    type="button"
                    onClick={() => handleReload(label)}
                    disabled={isReloading}
                    aria-label={`Atualizar ${label}`}
                    title={`Atualizar ${label}`}
                    style={{
                      border: "none", background: "transparent", cursor: isReloading ? "default" : "pointer",
                      fontSize: 12, lineHeight: 1, padding: 2, color: t.textMuted,
                      opacity: isReloading ? 0.5 : 1,
                      animation: isReloading ? "sr-spin 0.8s linear infinite" : "none",
                    }}
                  >
                    ↻
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
