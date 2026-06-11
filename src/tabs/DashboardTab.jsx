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

function MiniCard({ icon, label, value, sub, action, tone = "#1a6fd4" }) {
  return (
    <div className="sr-card-v2" style={{ minHeight: 132 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${tone}18`, color: tone, display: "grid", placeItems: "center" }}>
          <NavIcon name={icon} size={18} />
        </div>
        <div style={{ fontSize: 12, color: "var(--sr-text-muted)", fontWeight: 700 }}>{label}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "var(--sr-text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--sr-text-muted)", marginTop: 6 }}>{sub}</div>
      {action && <div style={{ fontSize: 12, color: tone, fontWeight: 700, marginTop: 10 }}>{action}</div>}
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
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

      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>Dados provenientes de fontes oficiais e complementares podem sofrer alteracoes sem aviso previo.</span>
        </div>
        <button type="button" onClick={() => setActiveTab("alertas")}>Ver alertas</button>
      </div>

      <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <MiniCard icon="rain" label="Chuva agora" value={`${fmtNumber(rainNow, 1)} mm`} sub="Open-Meteo observado" tone="#3b82f6" />
        <MiniCard icon="waves" label="Nivel medio" value={avgLevel != null ? `${avgLevel.toFixed(2)} m` : "--"} sub="Lagoa dos Patos" action="Ver detalhes" tone="#06b6d4" />
        <MiniCard icon="fire" label="Focos de calor" value={String(fireCount)} sub="INPE / eventos de fogo" tone="#ef4444" />
        <MiniCard icon="shield" label="Rodovias bloqueadas" value={String(blockedRoads.length)} sub="BR-116, BR-101 e BR-471" action={roadText} tone={blockedRoads.length ? "#dc2626" : "#64748b"} />
        <MiniCard icon="climate" label="Municipios monitorados" value={String(citiesAtRisk)} sub="Com indicador fora do normal" tone="#6b7280" />
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
