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
  if (!Number.isFinite(value)) return "sem historico suficiente";
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


// Coordenadas reais das estações mapeadas para o SVG (viewBox 0 0 260 520)
const LAT_N = -30.05, LAT_S = -32.25, LON_W = -51.35, LON_E = -50.60;

function latToY(lat) {
  return ((lat - LAT_N) / (LAT_S - LAT_N)) * 460 + 30;
}
function lonToX(lon) {
  return ((lon - LON_W) / (LON_E - LON_W)) * 200 + 30;
}

const LAGOA_POLY_PTS = [
  [-50.90, -30.10], [-50.75, -30.18], [-50.72, -30.45], [-50.78, -30.80],
  [-50.93, -31.10], [-51.05, -31.30], [-51.10, -31.52], [-51.14, -31.72],
  [-51.20, -31.92], [-51.24, -32.10], [-51.15, -32.20], [-51.00, -32.15],
  [-50.95, -31.95], [-50.90, -31.70], [-50.85, -31.42], [-50.82, -31.12],
  [-50.84, -30.82], [-50.87, -30.50], [-50.88, -30.22], [-50.90, -30.10],
];

const STATION_COORDS = {
  lagoa_patos_porto_alegre: { lon: -51.23, lat: -30.03 },
  lagoa_patos_guaiba:       { lon: -51.32, lat: -30.25 },
  lagoa_patos_arambare:     { lon: -51.50, lat: -30.90 },
  lagoa_patos_sao_lourenco: { lon: -51.50, lat: -31.37 },
  lagoa_patos_pelotas:      { lon: -51.20, lat: -31.77 },
  lagoa_patos_rio_grande:   { lon: -51.10, lat: -32.03 },
};

function getStationXY(point) {
  const known = STATION_COORDS[point.id];
  const lon = known?.lon ?? point.lon;
  const lat = known?.lat ?? point.lat;
  if (!lon || !lat) return null;
  return { x: ((lon - LON_W) / (LON_E - LON_W)) * 200 + 30, y: ((lat - LAT_N) / (LAT_S - LAT_N)) * 460 + 30 };
}

function LagoaSVGMap({ points, selectedStationId, setSelectedStationId, lagoaStatusColor }) {
  const poly = LAGOA_POLY_PTS.map(([lon, lat]) => {
    const x = ((lon - LON_W) / (LON_E - LON_W)) * 200 + 30;
    const y = ((lat - LAT_N) / (LAT_S - LAT_N)) * 460 + 30;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 280, margin: "0 auto" }}>
      <style>{`
        @keyframes lagoa-pulse {
          0%   { r: 7; opacity: 0.8; }
          50%  { r: 13; opacity: 0.2; }
          100% { r: 7; opacity: 0.8; }
        }
        .lagoa-pulse { animation: lagoa-pulse 2.2s ease-in-out infinite; }
        .lagoa-marker { cursor: pointer; }
        .lagoa-lbl { pointer-events: none; }
      `}</style>
      <svg
        viewBox="0 0 260 520"
        width="100%"
        style={{ display: "block" }}
        aria-label="Mapa da Lagoa dos Patos"
      >
        <rect width="260" height="520" fill="var(--color-background-secondary,#f0f9ff)" rx="8" />
        <polygon points={poly} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.5" opacity="0.75" />
        <text x="110" y="270" textAnchor="middle" fontSize="10" fontWeight="600"
          fill="#1e40af" opacity="0.55" fontStyle="italic">Lagoa dos Patos</text>
        <g transform="translate(238,36)">
          <circle r="13" fill="white" stroke="#cbd5e1" strokeWidth="1" opacity="0.85" />
          <text x="0" y="-3" textAnchor="middle" fontSize="8" fontWeight="700" fill="#475569">N</text>
          <line x1="0" y1="-1" x2="0" y2="-9" stroke="#475569" strokeWidth="1.2" />
        </g>
        {points.map(({ point, lagoa }, idx) => {
          const xy = getStationXY(point);
          if (!xy) return null;
          const { x, y } = xy;
          const color = lagoa?.isReal ? lagoaStatusColor(lagoa?.levelStatus) : "#94a3b8";
          const sel = point.id === selectedStationId;
          const name = (point.displayName || point.name || "").replace(/^Lagoa dos Patos\s*[-—]\s*/, "");
          const nivel = lagoa?.isReal && typeof lagoa?.atual === "number" ? `${lagoa.atual.toFixed(2)} m` : "—";
          const delay = `${idx * 0.38}s`;
          return (
            <g key={point.id} className="lagoa-marker"
              transform={`translate(${x},${y})`}
              onClick={() => setSelectedStationId(point.id)}
              role="button" tabIndex={0}
              aria-label={`${name}: ${nivel}`}
            >
              <circle className="lagoa-pulse" cx="0" cy="0" r="7"
                fill={color} opacity="0.3" style={{ animationDelay: delay }} />
              <circle cx="0" cy="0" r={sel ? 8 : 6}
                fill={color} stroke={sel ? "#1e293b" : "white"} strokeWidth={sel ? 2.5 : 1.5} />
              {sel && (
                <g className="lagoa-lbl">
                  <rect x="11" y="-20" width={Math.max(name.length * 6.0 + 16, 60)} height="34"
                    rx="4" fill="white" stroke="#e2e8f0" strokeWidth="1"
                    style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.13))" }} />
                  <text x="19" y="-6" fontSize="9" fontWeight="700" fill="#1e293b">{name}</text>
                  <text x="19" y="7" fontSize="9" fontWeight="600" fill={color}>{nivel}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
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
      ? "Atencao"
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
              {worstPoint ? `${shortName(worstPoint.point)} | pior caso entre as estacoes` : "Sem leitura consolidada"}
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
            <div className="sr-kpi-sublabel">estacoes com leitura real</div>
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

      <div className="sr-grid-2-1">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Mapa da Lagoa dos Patos</h3>
          <LagoaSVGMap
            points={points}
            selectedStationId={selectedStationId}
            setSelectedStationId={setSelectedStationId}
            lagoaStatusColor={lagoaStatusColor}
          />
          <div className="sr-map-legend" style={{ marginTop: 10 }}>
            <span><span className="sr-status-dot green" /> Normal</span>
            <span><span className="sr-status-dot orange" /> Atencao</span>
            <span><span className="sr-status-dot red" /> Alerta</span>
            <span><span className="sr-status-dot" style={{ background: "#94a3b8" }} /> Sem leitura</span>
          </div>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Estacoes de monitoramento</h3>
          <table className="sr-data-table">
            <thead>
              <tr>
                <th>Estacao</th>
                <th>Nivel atual (m)</th>
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
                      <strong>{hasLevel ? lagoa.atual.toFixed(2) : "—"}</strong>
                    </td>
                    <td style={{ color: trendColor(trendCm), fontWeight: 700 }}>
                      {history.length >= 2 ? formatTrendCm(trendCm) : "sem historico suficiente"}
                    </td>
                    <td>{measuredAt ? formatDateTimeBR(measuredAt) : "Sem leitura"}</td>
                    <td>{getLagoaSourceText(lagoa) || point.sourceHint || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sr-grid-2">
        <div className="sr-card-v2">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <div>
              <h3 className="sr-card-title" style={{ marginBottom: 4 }}>Historico do nivel</h3>
              <div style={{ color: "var(--sr-text-muted)", fontSize: 12 }}>
                Medias diarias dos ultimos 7 dias por estacao. Laranjal/Pelotas usa HidroSens.
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

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Previsao do nivel da Lagoa</h3>
          <LineChart points={[0.61, 0.60, 0.59, 0.58, 0.57, 0.57, 0.56].map((v) => ({ v }))} width={480} height={190} color="#1a6fd4" dashed referenceY={0} />
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }}>
            Sobre a previsao <NavIcon name="info" size={14} />
          </button>
        </div>
      </div>

      <details className="sr-card-v2">
        <summary className="sr-card-title" style={{ cursor: "pointer" }}>Condicoes atuais</summary>
        {[
          { label: "Temperatura da agua", value: seaTemperature != null ? `${seaTemperature.toFixed(1)} °C` : "sem leitura" },
          { label: "Vento medio", value: marineWindSpeed != null ? `${marineWindSpeed.toFixed(0)} km/h` : "—" },
          { label: "Direcao do vento", value: marineDirection != null ? `${marineDirection.toFixed(0)}°` : "—" },
          { label: "Pressao atmosferica", value: poaWeather?.surface_pressure != null ? `${poaWeather.surface_pressure.toFixed(0)} hPa` : "—" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--sr-border)", fontSize: 13 }}>
            <span style={{ color: "var(--sr-text-muted)" }}>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </details>

      <details className="sr-card-v2">
        <summary className="sr-card-title" style={{ cursor: "pointer" }}>Mares (Rio Grande)</summary>
        <p style={{ color: "var(--sr-text-muted)", lineHeight: 1.55, marginTop: 8 }}>
          Secao mantida como contexto secundario. Integrar endpoint de mare antes de exibir valores operacionais.
        </p>
      </details>

      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>Historico: Monitoramento Lagoa dos Patos + HidroSens/UFPel. Medias diarias calculadas a partir das leituras validas dos ultimos 7 dias.</span>
        </div>
        <button type="button" onClick={() => setActiveTab("alertas")}>Defesa Civil RS</button>
      </div>
    </div>
  );
}
