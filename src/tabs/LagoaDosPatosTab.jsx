import { useMemo, useState } from "react";
import { LineChart } from "../components/layout/LineChart";
import { NavIcon } from "../components/layout/NavIcons";

function shortName(point) {
  return (point.displayName || point.name || "").replace(/^Lagoa dos Patos\s*[-—]\s*/, "");
}

function normalizeHistory(lagoaHistory, stationId) {
  return (lagoaHistory?.[stationId] || [])
    .map((point) => ({
      t: point.t || point.at,
      v: Number(point.v),
      samples: Number(point.samples) || null,
    }))
    .filter((point) => point.t && Number.isFinite(point.v))
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
    .slice(-7);
}

function trendFromHistory(history) {
  if (!history || history.length < 2) return null;
  const previous = history[history.length - 2]?.v;
  const current = history[history.length - 1]?.v;
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return null;
  return (current - previous) * 100;
}

function formatTrendCm(value) {
  if (!Number.isFinite(value)) return "sem histórico suficiente";
  if (Math.abs(value) < 0.5) return "estavel";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)} cm`;
}

function trendColor(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.5) return "var(--sr-text-muted)";
  return value > 0 ? "#ea580c" : "#16a34a";
}

function statusRank(status) {
  const text = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (text.includes("ALERTA") || text.includes("CRITICO")) return 3;
  if (text.includes("ATENCAO")) return 2;
  if (text.includes("NORMAL")) return 1;
  return 0;
}

function pickHighlight(points) {
  return (
    points.find(({ point }) => point.id === "lagoa_patos_pelotas") ||
    points.find(({ lagoa }) => lagoa?.isReal && typeof lagoa.atual === "number") ||
    points[0] ||
    null
  );
}


// Posições percentuais extraídas diretamente da imagem Landsat com pontos de referência
const STATION_PCT = {
  lagoa_patos_poa:      { left: 64.47, top: 11.63 },
  lagoa_patos_arambare:       { left: 46.50, top: 37.80 },
  lagoa_sao_lourenco:   { left: 28.11, top: 62.97 },
  lagoa_patos_pelotas:        { left: 19.00, top: 81.80 },
  lagoa_rio_grande:     { left: 30.75, top: 92.24 },
  lagoa_sao_jose_norte: { left: 33.41, top: 91.66 },
  lagoa_patos_porto_alegre:   { left: 55.0, top:  8.0 },
  lagoa_patos_guaiba:         { left: 50.0, top: 10.0 },
};

function getStationPct(point) {
  return STATION_PCT[point.id] ?? null;
}

function LagoaSVGMap({ points, selectedStationId, setSelectedStationId, lagoaStatusColor }) {
  // Salve o arquivo Landsat em: public/landsat_lagoa.webp (ou .jpg)
  const LANDSAT_URL = "/sentinela-rs/landsat_lagoa.webp";

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 8, overflow: "hidden", background: "#0a1628" }}>
      <style>{`
        @keyframes lp-pulse {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.8; }
          50%  { transform: translate(-50%,-50%) scale(2.2); opacity: 0.15; }
          100% { transform: translate(-50%,-50%) scale(1);   opacity: 0.8; }
        }
        .lp-ring { animation: lp-pulse 2.4s ease-in-out infinite; }
        .lp-marker:hover .lp-tooltip { display: block; }
        .lp-tooltip { display: none; }
      `}</style>

      {/* Imagem Landsat de fundo */}
      <img
        src={LANDSAT_URL}
        alt="Lagoa dos Patos — Landsat 8, 24 mai 2018"
        style={{ width: "100%", display: "block", opacity: 0.92 }}
        onError={(e) => { e.target.style.display = "none"; }}
      />

      {/* Crédito */}
      <div style={{
        position: "absolute", bottom: 6, right: 8,
        fontSize: 9, color: "rgba(255,255,255,0.55)", pointerEvents: "none",
      }}>
        Landsat 8 / NASA · 24 mai 2018
      </div>

      {/* Pontos pulsantes */}
      {points.map(({ point, lagoa }, idx) => {
        const pct = getStationPct(point);
        if (!pct) return null;
        const color = lagoa?.isReal ? lagoaStatusColor(lagoa?.levelStatus) : "#94a3b8";
        const sel = point.id === selectedStationId;
        const name = (point.displayName || point.name || "").replace(/^Lagoa dos Patos\s*[-—]\s*/, "");
        const nivel = lagoa?.isReal && typeof lagoa?.atual === "number"
          ? `${lagoa.atual.toFixed(2)} m` : "—";

        return (
          <div
            key={point.id}
            className="lp-marker"
            onClick={() => setSelectedStationId(point.id)}
            style={{
              position: "absolute",
              left: `${pct.left}%`,
              top: `${pct.top}%`,
              cursor: "pointer",
              zIndex: sel ? 10 : 5,
            }}
          >
            {/* Anel pulsante */}
            <div className="lp-ring" style={{
              position: "absolute",
              width: 20, height: 20,
              borderRadius: "50%",
              background: color,
              transform: "translate(-50%,-50%)",
              animationDelay: `${idx * 0.4}s`,
            }} />
            {/* Ponto central */}
            <div style={{
              position: "absolute",
              width: sel ? 14 : 10,
              height: sel ? 14 : 10,
              borderRadius: "50%",
              background: color,
              border: `${sel ? 2.5 : 1.5}px solid ${sel ? "#1e293b" : "white"}`,
              transform: "translate(-50%,-50%)",
              transition: "all 0.2s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
            }} />
            {/* Tooltip sempre visível quando selecionado */}
            {sel && (
              <div style={{
                position: "absolute",
                left: 10, top: -36,
                background: "rgba(15,23,42,0.92)",
                color: "white",
                padding: "4px 8px",
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                borderLeft: `3px solid ${color}`,
                pointerEvents: "none",
              }}>
                {name}
                <span style={{ color, marginLeft: 6 }}>{nivel}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LagoaDosPatosTab({ ctx }) {
  const {
    STATIONS_LAGOA,
    formatDateTimeBR,
    getLagoaMeasuredAt,
    getLagoaPointData,
    getLagoaSourceText,
    lagoaHistory,
    lagoaStatusColor,
    marineWeather,
    selData,
    setActiveTab,
    stationData,
  } = ctx;

  const [selectedStationId, setSelectedStationId] = useState("lagoa_patos_pelotas");

  const points = useMemo(
    () =>
      STATIONS_LAGOA.map((point) => {
        const data = getLagoaPointData(point, stationData);
        const lagoa = data?.lagoa;
        const history = normalizeHistory(lagoaHistory, point.id);
        const trendCm = trendFromHistory(history);
        return { point, data, lagoa, history, trendCm };
      }),
    [STATIONS_LAGOA, getLagoaPointData, lagoaHistory, stationData]
  );

  const highlightPoint = pickHighlight(points);
  const selectedPoint = points.find(({ point }) => point.id === selectedStationId) || highlightPoint || points[0];
  const selectedHistory = selectedPoint?.history?.length >= 2 ? selectedPoint.history : [];
  const highlightTrend = trendFromHistory(highlightPoint?.history || []);
  const validPoints = points.filter(({ lagoa }) => lagoa?.isReal && typeof lagoa.atual === "number");
  const coverage = points.filter(({ history }) => history.length >= 2).length;
  const allHistoryValues = points.flatMap(({ history }) => history.map((item) => item.v));
  const min7d = allHistoryValues.length ? Math.min(...allHistoryValues) : null;
  const max7d = allHistoryValues.length ? Math.max(...allHistoryValues) : null;
  const worstPoint = [...points].sort((a, b) => statusRank(b.lagoa?.levelStatus) - statusRank(a.lagoa?.levelStatus))[0];
  const situation =
    statusRank(worstPoint?.lagoa?.levelStatus) >= 3
      ? "Alerta"
      : statusRank(worstPoint?.lagoa?.levelStatus) >= 2
      ? "Atenção"
      : "Normal";

  const poaWeather = selData?.weather?.current;
  const marineCurrent = marineWeather?.current || null;
  const seaTemperature = typeof marineCurrent?.sea_surface_temperature === "number" ? marineCurrent.sea_surface_temperature : null;
  const marineDirection = typeof marineCurrent?.wave_direction === "number"
    ? marineCurrent.wave_direction
    : typeof poaWeather?.wind_direction_10m === "number"
      ? poaWeather.wind_direction_10m
      : null;
  const marineWindSpeed = typeof poaWeather?.wind_speed_10m === "number" ? poaWeather.wind_speed_10m : null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="sr-kpi-card sr-kpi-blue">
          <div className="sr-kpi-icon">
            <NavIcon name="waves" size={20} />
          </div>
          <div>
            <div className="sr-kpi-label">LEITURA EM DESTAQUE</div>
            <div className="sr-kpi-value">
              {highlightPoint?.lagoa?.isReal && typeof highlightPoint?.lagoa?.atual === "number"
                ? `${highlightPoint.lagoa.atual.toFixed(2).replace(".", ",")} m`
                : "Sem leitura"}
            </div>
            <div className="sr-kpi-sublabel">
              {shortName(highlightPoint?.point || {})} | {highlightPoint?.point?.sourceHint || highlightPoint?.lagoa?.source || "dados reais"}
            </div>
            <div className="sr-kpi-trend" style={{ color: trendColor(highlightTrend) }}>
              {formatTrendCm(highlightTrend)}
            </div>
          </div>
        </div>

        <div className="sr-kpi-card sr-kpi-green">
          <div className="sr-kpi-icon">
            <NavIcon name="info" size={20} />
          </div>
          <div>
            <div className="sr-kpi-label">SITUACAO GERAL</div>
            <div className="sr-kpi-value">{situation}</div>
            <div className="sr-kpi-sublabel">
              {worstPoint ? `${shortName(worstPoint.point)} | pior caso entre as estações` : "Sem leitura consolidada"}
            </div>
          </div>
        </div>

        <div className="sr-kpi-card sr-kpi-green">
          <div className="sr-kpi-icon">
            <NavIcon name="shield" size={20} />
          </div>
          <div>
            <div className="sr-kpi-label">MONITORAMENTO</div>
            <div className="sr-kpi-value">{validPoints.length}/{STATIONS_LAGOA.length}</div>
            <div className="sr-kpi-sublabel">estações com leitura real</div>
          </div>
        </div>

        <div className="sr-kpi-card sr-kpi-blue">
          <div className="sr-kpi-icon">
            <NavIcon name="climate" size={20} />
          </div>
          <div>
            <div className="sr-kpi-label">HISTORICO 7D</div>
            <div className="sr-kpi-value">{coverage >= 1 ? `${coverage}/${points.length}` : "sem dados"}</div>
            <div className="sr-kpi-sublabel">
              {min7d !== null && max7d !== null ? `Min: ${min7d.toFixed(2)} m | Max: ${max7d.toFixed(2)} m` : "historico insuficiente"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
        <div className="sr-card-v2" style={{ alignSelf: "stretch" }}>
          <h3 className="sr-card-title">Mapa da Lagoa dos Patos</h3>
          <LagoaSVGMap
            points={points}
            selectedStationId={selectedStationId}
            setSelectedStationId={setSelectedStationId}
            lagoaStatusColor={lagoaStatusColor}
          />
          <div className="sr-map-legend" style={{ marginTop: 10 }}>
            <span><span className="sr-status-dot green" /> Normal</span>
            <span><span className="sr-status-dot orange" /> Atenção</span>
            <span><span className="sr-status-dot red" /> Alerta</span>
            <span><span className="sr-status-dot" style={{ background: "#94a3b8" }} /> Sem leitura</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sr-card-v2">
            <h3 className="sr-card-title">Estações de monitoramento</h3>
            <table className="sr-data-table">
              <thead>
                <tr>
                  <th>Estação</th>
                  <th>Nível atual (m)</th>
                  <th>Inundação</th>
                  <th>Máx Histórica</th>
                  <th>Tendencia 24h</th>
                  <th>Ultima leitura</th>
                  <th>Fonte</th>
                </tr>
              </thead>
              <tbody>
                {points.map(({ point, lagoa, trendCm, history }) => {
                  const hasLevel = lagoa?.isReal && lagoa?.atual != null;
                  const color = lagoaStatusColor(lagoa?.levelStatus);
                  const measuredAt = getLagoaMeasuredAt(lagoa);
                  return (
                    <tr key={point.id}>
                      <td>
                        <span className="sr-status-dot" style={{ background: hasLevel ? color : "#94a3b8" }} />
                        {shortName(point)}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <strong>{hasLevel ? lagoa.atual.toFixed(2) : "—"}</strong>
                          {hasLevel && typeof point.floodLimitM === "number" && typeof point.historicMaxM === "number" && (
                            <div style={{ position: "relative", width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, (lagoa.atual / point.historicMaxM) * 100))}%`, background: lagoa.atual >= point.floodLimitM ? "#ef4444" : "#3b82f6" }} />
                              <div style={{ position: "absolute", left: `${(point.floodLimitM / point.historicMaxM) * 100}%`, top: 0, bottom: 0, width: 2, background: "#facc15" }} title="Cota de Inundação" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ color: "var(--sr-text-muted)" }}>{typeof point.floodLimitM === "number" ? point.floodLimitM.toFixed(2) : "—"}</td>
                      <td style={{ color: "var(--sr-text-muted)" }}>{typeof point.historicMaxM === "number" ? point.historicMaxM.toFixed(2) : "—"}</td>
                      <td style={{ color: trendColor(trendCm), fontWeight: 700 }}>
                        {history.length >= 2 ? formatTrendCm(trendCm) : "sem histórico suficiente"}
                      </td>
                      <td>{measuredAt ? formatDateTimeBR(measuredAt) : "Sem leitura"}</td>
                      <td>{getLagoaSourceText(lagoa) || point.sourceHint || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="sr-card-v2">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <div>
                <h3 className="sr-card-title" style={{ marginBottom: 4 }}>Historico do nivel</h3>
                <div style={{ color: "var(--sr-text-muted)", fontSize: 12 }}>
                  Médias diárias dos últimos 7 dias por estação. Laranjal/Pelotas usa HidroSens.
                </div>
              </div>
              <select value={selectedStationId} onChange={(event) => setSelectedStationId(event.target.value)} style={{ minHeight: 36 }}>
                {points.map(({ point, history }) => (
                  <option key={point.id} value={point.id}>
                    {shortName(point)}{history.length >= 2 ? "" : " (sem historico)"}
                  </option>
                ))}
              </select>
            </div>
            <LineChart
              points={selectedHistory}
              width={480}
              height={190}
              color="#1a6fd4"
              referenceY={0}
              label={shortName(selectedPoint?.point || {})}
            />
          </div>
        </div>
      </div>

      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>Historico: Monitoramento Lagoa dos Patos + HidroSens/UFPel. Médias diárias calculadas a partir das leituras validas dos últimos 7 dias.</span>
        </div>
        <button type="button" onClick={() => setActiveTab("alertas")}>Defesa Civil RS</button>
      </div>
    </div>
  );
}
