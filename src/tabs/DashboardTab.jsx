import { NavIcon } from "../components/layout/NavIcons";

function weatherLabel(code) {
  if (code === 0) return "Ceu limpo";
  if (code <= 3) return "Parcialmente nublado";
  if (code < 60) return "Nublado";
  if (code < 70) return "Chuva fraca";
  if (code < 90) return "Chuva";
  return "Temporal";
}

function weatherIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code < 60) return "☁️";
  return "🌧️";
}

function fmtNumber(value, decimals = 1, fallback = "--") {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(decimals) : fallback;
}

function MiniCard({ icon, label, value, sub, action, detail, tone = "#1a6fd4", onClick, loading }) {
  return (
    <div className="sr-card-v2" style={{ minHeight: 188, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 18 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 54, height: 54, borderRadius: 12, background: `${tone}14`, color: tone, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
            <NavIcon name={icon} size={32} />
          </div>
          <div style={{ fontSize: 13, color: "var(--sr-text)", fontWeight: 800, lineHeight: 1.25 }}>{label}</div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: "var(--sr-text)", lineHeight: 1 }}>{loading ? "..." : value}</div>
        <div style={{ fontSize: 13, color: "var(--sr-text-muted)", marginTop: 8, lineHeight: 1.35 }}>
          {loading ? "Carregando dado real..." : sub}
        </div>
        {detail && <div style={{ fontSize: 12, color: "var(--sr-text-muted)", marginTop: 10, lineHeight: 1.35 }}>{detail}</div>}
      </div>
      {action && (
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          style={{
            marginTop: 14,
            padding: 0,
            border: 0,
            background: "transparent",
            color: tone,
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            cursor: onClick ? "pointer" : "default",
            alignSelf: "flex-start",
          }}
        >
          {action} <NavIcon name="arrow" size={14} />
        </button>
      )}
    </div>
  );
}

export function DashboardTab({ ctx }) {
  const {
    STATIONS,
    STATIONS_LAGOA,
    alerts,
    formatDateTimeBR,
    getLagoaPointData,
    lastUpdate,
    loadAllData,
    loading,
    qLoading,
    queimadas,
    riverLevels,
    roadBlocks,
    setActiveTab,
    stationData,
  } = ctx;

  const poaData = stationData?.rs_porto_alegre || {};
  const poaWeather = poaData.weather?.current || {};
  const tempNow = poaData.tempCurrent ?? poaWeather.temperature_2m;
  const rainNow = poaData.precipCurrent ?? poaWeather.precipitation;
  const windNow = poaWeather.wind_speed_10m ?? poaData.windCurrent;
  const humidity = poaWeather.relative_humidity_2m;
  const code = poaData.weatherCurrentCode ?? poaWeather.weather_code ?? 0;

  const lagoaLevels = STATIONS_LAGOA
    .map((point) => getLagoaPointData(point, stationData)?.lagoa)
    .filter((lagoa) => lagoa?.isReal && typeof lagoa.atual === "number");
  const avgLevel = lagoaLevels.length ? lagoaLevels.reduce((sum, item) => sum + item.atual, 0) / lagoaLevels.length : null;

  const roadBRS = Array.isArray(roadBlocks?.brs) ? roadBlocks.brs : [];
  const blockedRoads = roadBRS.filter((road) => road?.status === "bloqueado");
  const attentionRoads = roadBRS.filter((road) => road?.status === "incidente");
  const roadIncidents = roadBRS.reduce((sum, road) => sum + (Array.isArray(road?.incidents) ? road.incidents.length : 0), 0);
  const roadText = roadBlocks?.ok
    ? blockedRoads.length
      ? blockedRoads.map((road) => road.id).join(", ")
      : roadIncidents
        ? `${roadIncidents} incidente(s)`
        : "Sem bloqueio informado"
    : "Fonte indisponivel";

  const fireCount = queimadas?.foci?.length ?? queimadas?.count ?? 0;
  const citiesAtRisk = (STATIONS || []).filter((station) => {
    const status = stationData?.[station.id]?.risk;
    return status && status !== "NORMAL";
  }).length;
  const riversWithReading = (riverLevels?.stations || []).filter((station) => station?.ok && typeof station?.level_cm === "number");
  const blockedRoadDetails = blockedRoads.length
    ? blockedRoads.map((road) => `${road.id}: ${road.trecho}`).join(" | ")
    : attentionRoads.length
      ? attentionRoads.map((road) => `${road.id}: ponto de atencao, sem km confirmado`).join(" | ")
      : "Sem trecho bloqueado nas rotas monitoradas";
  const routeCities = [
    "Porto Alegre",
    "Guaiba",
    "Pelotas",
    "Rio Grande",
    "Sao Jose do Norte",
    "Arroio Grande",
    "Santa Vitoria do Palmar",
  ].join(", ");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1, color: "var(--sr-text)" }}>Dashboard</h1>
          <div style={{ fontSize: 15, color: "var(--sr-text-muted)", marginTop: 4 }}>Visao geral das condicoes no Rio Grande do Sul</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--sr-border)", borderRadius: 12, padding: "12px 16px", minWidth: 320, boxShadow: "var(--sr-shadow)" }}>
          <div style={{ fontSize: 13, color: "var(--sr-text)", marginBottom: 8 }}>Porto Alegre, RS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 36 }}>{weatherIcon(code)}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--sr-text)", lineHeight: 1 }}>
                {fmtNumber(tempNow, 1)} °C
              </div>
              <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>{weatherLabel(code)}</div>
            </div>
            <div style={{ borderLeft: "1px solid var(--sr-border)", paddingLeft: 16, fontSize: 12 }}>
              <div style={{ color: "var(--sr-text-muted)" }}>Umidade</div>
              <strong>{humidity != null ? `${fmtNumber(humidity, 0)}%` : "--"}</strong>
              <div style={{ color: "var(--sr-text-muted)", marginTop: 4 }}>Vento {fmtNumber(windNow, 0)} km/h NE</div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="sr-loading" style={{ margin: 0 }}>
          <div className="sr-loading-spinner" />
          <div>Carregando dados reais das fontes...</div>
        </div>
      )}

      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>Dados provenientes de fontes oficiais e complementares podem sofrer alteracoes sem aviso previo.</span>
        </div>
        <button type="button" onClick={() => setActiveTab("alertas")}>Ver alertas</button>
      </div>

      <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))", alignItems: "stretch" }}>
        <MiniCard
          icon="rain"
          label="Chuvas (24h)"
          value={`${fmtNumber(rainNow, 1)} mm`}
          sub="Open-Meteo observado"
          action="Ver detalhes"
          tone="#3b82f6"
          onClick={() => setActiveTab("previsao")}
          loading={loading && rainNow == null}
        />
        <MiniCard
          icon="waves"
          label="Niveis (medio)"
          value={avgLevel != null ? `${avgLevel.toFixed(2)} m` : "--"}
          sub="Lagoa dos Patos"
          action="Ver detalhes"
          tone="#06b6d4"
          onClick={() => setActiveTab("lagoa")}
          loading={loading && avgLevel == null}
        />
        <MiniCard
          icon="fire"
          label="Focos de calor (24h)"
          value={String(fireCount)}
          sub="INPE / eventos de fogo"
          action="Ver detalhes"
          tone="#ef4444"
          onClick={() => setActiveTab("queimadas")}
          loading={loading && fireCount === 0 && !queimadas?.ok}
        />
        <MiniCard
          icon="shield"
          label="Rodovias bloqueadas"
          value={String(blockedRoads.length)}
          sub={attentionRoads.length ? `${attentionRoads.length} ponto(s) de atencao` : "BR-116, BR-101 e BR-471"}
          detail={blockedRoadDetails}
          tone={blockedRoads.length ? "#dc2626" : "#64748b"}
          loading={loading && !roadBlocks?.ok}
        />
        <MiniCard
          icon="climate"
          label="Municipios afetados"
          value={String(citiesAtRisk)}
          sub="Cidades nas rotas monitoradas"
          detail={routeCities}
          tone="#6b7280"
        />
      </div>

      <div className="sr-grid-2">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Lagoa dos Patos</h3>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 18, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>Nivel medio atual</div>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{avgLevel != null ? `${avgLevel.toFixed(2)} m` : "--"}</div>
              <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>{lagoaLevels.length} ponto(s) com leitura real</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {STATIONS_LAGOA.slice(0, 6).map((point) => {
                const lagoa = getLagoaPointData(point, stationData)?.lagoa;
                const hasLevel = lagoa?.isReal && typeof lagoa.atual === "number";
                return (
                  <div key={point.id} style={{ padding: 10, border: "1px solid var(--sr-border)", borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>{point.displayName || point.name}</div>
                    <strong>{hasLevel ? `${lagoa.atual.toFixed(2)} m` : "Sem leitura"}</strong>
                  </div>
                );
              })}
            </div>
          </div>
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={() => setActiveTab("lagoa")}>
            Ver detalhes da Lagoa <NavIcon name="arrow" size={14} />
          </button>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Informacoes rapidas</h3>
          {[
            ["Defesa Civil RS", alerts?.length ? `${alerts.length} aviso(s) no RSS` : "Sem aviso oficial ativo"],
            ["Niveis dos rios", riversWithReading.length ? `${riversWithReading.length} ponto(s) com leitura` : "Sem leitura confirmada"],
            ["Rodovias", roadText],
            ["Ultima atualizacao", lastUpdate ? formatDateTimeBR(lastUpdate) : "--"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--sr-border)" }}>
              <span style={{ color: "var(--sr-text-muted)" }}>{label}</span>
              <strong style={{ textAlign: "right" }}>{value}</strong>
            </div>
          ))}
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={loadAllData} disabled={qLoading}>
            Atualizar dados <NavIcon name="refresh" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
