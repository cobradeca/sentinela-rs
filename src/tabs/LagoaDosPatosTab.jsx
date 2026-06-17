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


// Bounding box da imagem Landsat 8 (24 mai 2018)
const LANDSAT_BOUNDS = { latN: -30.05, latS: -32.20, lonW: -52.50, lonE: -50.50 };

// Coordenadas calibradas contra imagem Landsat de referência (pontos vermelhos)
const STATION_COORDS = {
  lagoa_patos_itapua:         { lat: -30.3856, lon: -51.0596 },
  lagoa_patos_arambare:       { lat: -30.9067, lon: -51.4917 },
  lagoa_patos_sao_lourenco:   { lat: -31.3781, lon: -51.9654 },
  lagoa_patos_pelotas:        { lat: -31.7715, lon: -52.2215 },
  lagoa_patos_sao_jose_norte: { lat: -32.0151, lon: -52.0448 },
  lagoa_patos_rio_grande:     { lat: -32.0257, lon: -52.1057 },
};

function getStationPct(point, coords = STATION_COORDS) {
  const known = coords[point.id];
  const lat = known?.lat ?? point.lat;
  const lon = known?.lon ?? point.lon;
  if (!lat || !lon) return null;
  const { latN, latS, lonW, lonE } = LANDSAT_BOUNDS;
  return {
    left: ((lon - lonW) / (lonE - lonW)) * 100,
    top:  ((lat - latN) / (latS - latN)) * 100,
  };
}

function pctToStationCoord(leftPct, topPct) {
  const { latN, latS, lonW, lonE } = LANDSAT_BOUNDS;
  return {
    lat: Number((latN + (topPct / 100) * (latS - latN)).toFixed(4)),
    lon: Number((lonW + (leftPct / 100) * (lonE - lonW)).toFixed(4)),
  };
}

function LagoaSVGMap({ points, selectedStationId, setSelectedStationId, lagoaStatusColor }) {
  const LANDSAT_URL = "/sentinela-rs/landsat_lagoa.webp";
  const editMode = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("editPontos") === "1";
  const [dragCoords, setDragCoords] = useState(STATION_COORDS);
  const [draggingId, setDraggingId] = useState(null);
  const activeCoords = editMode ? dragCoords : STATION_COORDS;

  function moveDraggingPoint(event) {
    if (!editMode || !draggingId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const leftPct = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const topPct = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    setDragCoords((prev) => ({
      ...prev,
      [draggingId]: pctToStationCoord(leftPct, topPct),
    }));
  }

  const editableCoords = Object.entries(dragCoords)
    .filter(([id]) => points.some(({ point }) => point.id === id))
    .map(([id, coord]) => `${id}: { lat: ${coord.lat.toFixed(4)}, lon: ${coord.lon.toFixed(4)} }`)
    .join("\n");

  return (
    <div
      data-lagoa-map
      onPointerMove={moveDraggingPoint}
      onPointerUp={() => setDraggingId(null)}
      onPointerLeave={() => setDraggingId(null)}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 8,
        overflow: "hidden",
        background: "#0a1628",
        touchAction: editMode ? "none" : "auto",
      }}
    >
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

      <img
        src={LANDSAT_URL}
        alt="Lagoa dos Patos - Landsat 8, 24 mai 2018"
        style={{ width: "100%", display: "block", opacity: 0.92 }}
        onError={(event) => { event.target.style.display = "none"; }}
      />

      <div style={{
        position: "absolute", bottom: 6, right: 8,
        fontSize: 9, color: "rgba(255,255,255,0.55)", pointerEvents: "none",
      }}>
        Landsat 8 / NASA - 24 mai 2018
      </div>

      {points.map(({ point, lagoa }, idx) => {
        const pct = getStationPct(point, activeCoords);
        if (!pct) return null;
        const color = lagoa?.isReal ? lagoaStatusColor(lagoa?.levelStatus) : "#94a3b8";
        const sel = point.id === selectedStationId;
        const name = (point.displayName || point.name || "").replace(/^Lagoa dos Patos\s*[-?]\s*/, "");
        const nivel = lagoa?.isReal && typeof lagoa?.atual === "number"
          ? `${lagoa.atual.toFixed(2)} m` : "-";

        return (
          <div
            key={point.id}
            className="lp-marker"
            onClick={() => setSelectedStationId(point.id)}
            onPointerDown={(event) => {
              if (!editMode) return;
              event.preventDefault();
              event.stopPropagation();
              setSelectedStationId(point.id);
              setDraggingId(point.id);
            }}
            style={{
              position: "absolute",
              left: `${pct.left}%`,
              top: `${pct.top}%`,
              cursor: editMode ? "grab" : "pointer",
              zIndex: sel ? 10 : 5,
            }}
          >
            <div className="lp-ring" style={{
              position: "absolute",
              width: 20, height: 20,
              borderRadius: "50%",
              background: color,
              transform: "translate(-50%,-50%)",
              animationDelay: `${idx * 0.4}s`,
            }} />
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

      {editMode && (
        <div style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          maxWidth: "calc(100% - 20px)",
          padding: "8px 10px",
          borderRadius: 6,
          background: "rgba(15,23,42,0.88)",
          color: "white",
          fontSize: 11,
          lineHeight: 1.4,
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        }}>
          <strong>Modo ajuste:</strong> arraste os pontos verdes.
          <pre style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", fontSize: 10 }}>{editableCoords}</pre>
        </div>
      )}
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
