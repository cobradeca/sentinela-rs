import { useMemo, useState } from "react";
import { LineChart } from "../components/layout/LineChart";
import { NavIcon } from "../components/layout/NavIcons";

function shortName(point) {
  return (point.displayName || point.name || "").replace("Lagoa dos Patos — ", "").replace("Lagoa dos Patos - ", "");
}

function historyForStation(lagoaHistory, stationId) {
  return (lagoaHistory?.[stationId] || [])
    .map((point) => ({
      t: point.t || point.at,
      v: Number(point.v),
      samples: point.samples,
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
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.5) return "estavel";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)} cm`;
}

function trendColor(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.5) return "var(--sr-text-muted)";
  return value > 0 ? "#ea580c" : "#16a34a";
}

function statusRank(status) {
  const text = String(status || "").toUpperCase();
  if (text.includes("ALERTA") || text.includes("CRITICO")) return 3;
  if (text.includes("ATENCAO") || text.includes("ATENÇÃO")) return 2;
  if (text.includes("NORMAL")) return 1;
  return 0;
}

function chartAverageByDay(STATIONS_LAGOA, lagoaHistory) {
  const byDay = {};
  STATIONS_LAGOA.forEach((station) => {
    historyForStation(lagoaHistory, station.id).forEach((point) => {
      const day = String(point.t).slice(0, 10);
      if (!day) return;
      byDay[day] ||= [];
      byDay[day].push(point.v);
    });
  });

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, values]) => ({
      t: `${date}T12:00:00.000Z`,
      v: values.reduce((sum, value) => sum + value, 0) / values.length,
    }));
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
    selData,
    setActiveTab,
    stationData,
  } = ctx;

  const [selectedStationId, setSelectedStationId] = useState("lagoa_patos_pelotas");

  const points = STATIONS_LAGOA.map((point) => {
    const data = getLagoaPointData(point, stationData);
    const lagoa = data?.lagoa;
    const history = historyForStation(lagoaHistory, point.id);
    const trendCm = trendFromHistory(history);
    return { point, data, lagoa, history, trendCm };
  });

  const withLevel = points.filter(({ lagoa }) => lagoa?.isReal && typeof lagoa.atual === "number");
  const avgLevel = withLevel.length ? withLevel.reduce((sum, { lagoa }) => sum + lagoa.atual, 0) / withLevel.length : null;
  const avgChart = chartAverageByDay(STATIONS_LAGOA, lagoaHistory);
  const avgTrend = trendFromHistory(avgChart);
  const allHistoryValues = points.flatMap(({ history }) => history.map((point) => point.v));
  const min7d = allHistoryValues.length ? Math.min(...allHistoryValues) : null;
  const max7d = allHistoryValues.length ? Math.max(...allHistoryValues) : null;

  const worstPoint = [...points].sort((a, b) => statusRank(b.lagoa?.levelStatus) - statusRank(a.lagoa?.levelStatus))[0];
  const situation = statusRank(worstPoint?.lagoa?.levelStatus) >= 3
    ? "Alerta"
    : statusRank(worstPoint?.lagoa?.levelStatus) >= 2
    ? "Atencao"
    : "Normal";

  const selectedPoint = points.find(({ point }) => point.id === selectedStationId) || points.find(({ point }) => point.id === "lagoa_patos_pelotas") || points[0];
  const selectedHistory = selectedPoint?.history?.length >= 2 ? selectedPoint.history : avgChart;
  const poaWeather = selData?.weather?.current;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="sr-kpi-card sr-kpi-blue">
          <div className="sr-kpi-icon"><NavIcon name="waves" size={20} /></div>
          <div>
            <div className="sr-kpi-label">NIVEL ATUAL DA LAGOA</div>
            <div className="sr-kpi-value">{avgLevel !== null ? `${avgLevel.toFixed(2).replace(".", ",")} m` : "—"}</div>
            <div className="sr-kpi-sublabel">{withLevel.length} estacoes com leitura real</div>
            <div className="sr-kpi-trend" style={{ color: trendColor(avgTrend) }}>{formatTrendCm(avgTrend)}</div>
          </div>
        </div>
        <div className="sr-kpi-card sr-kpi-green">
          <div className="sr-kpi-icon"><NavIcon name="info" size={20} /></div>
          <div>
            <div className="sr-kpi-label">NIVEL DE REFERENCIA</div>
            <div className="sr-kpi-value">0,00 m</div>
            <div className="sr-kpi-sublabel">Referencia operacional do painel</div>
          </div>
        </div>
        <div className="sr-kpi-card sr-kpi-green">
          <div className="sr-kpi-icon"><NavIcon name="shield" size={20} /></div>
          <div>
            <div className="sr-kpi-label">SITUACAO</div>
            <div className="sr-kpi-value" style={{ color: situation === "Normal" ? "#16a34a" : "#ca8a04" }}>{situation}</div>
            <div className="sr-kpi-sublabel">pior caso entre estacoes</div>
          </div>
        </div>
        <div className="sr-kpi-card sr-kpi-blue">
          <div className="sr-kpi-icon"><NavIcon name="climate" size={20} /></div>
          <div>
            <div className="sr-kpi-label">VARIACAO 24H</div>
            <div className="sr-kpi-value">{formatTrendCm(avgTrend)}</div>
            <div className="sr-kpi-sublabel">
              {min7d !== null && max7d !== null ? `Min: ${min7d.toFixed(2)} m | Max: ${max7d.toFixed(2)} m` : "historico insuficiente"}
            </div>
          </div>
        </div>
      </div>

      <div className="sr-grid-2-1">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Mapa da Lagoa dos Patos</h3>
          <div className="sr-lagoa-map-panel" aria-label="Mapa esquematico da Lagoa dos Patos">
            <div className="sr-lagoa-map-water">Lagoa dos Patos</div>
            {points.map(({ point, lagoa }) => (
              <button
                key={point.id}
                type="button"
                className="sr-lagoa-map-marker"
                style={{
                  left: `${18 + ((Math.abs(point.lon) - 50.9) / 1.8) * 62}%`,
                  top: `${18 + ((Math.abs(point.lat) - 30.1) / 2.3) * 68}%`,
                  textAlign: "left",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedStationId(point.id)}
              >
                <span className="sr-status-dot" style={{ background: lagoa?.isReal ? lagoaStatusColor(lagoa?.levelStatus) : "#94a3b8" }} />
                <strong>{shortName(point)}</strong>
                <small>{lagoa?.isReal && typeof lagoa.atual === "number" ? `${lagoa.atual.toFixed(2)} m` : "Sem leitura"}</small>
              </button>
            ))}
          </div>
          <div className="sr-map-legend">
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
                    <td><span className="sr-status-dot" style={{ background: hasLevel ? color : "#94a3b8" }} />{shortName(point)}</td>
                    <td><strong>{hasLevel ? lagoa.atual.toFixed(2) : "—"}</strong></td>
                    <td style={{ color: trendColor(trendCm), fontWeight: 700 }}>{history.length >= 2 ? formatTrendCm(trendCm) : "—"}</td>
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
                Medias diarias dos ultimos 7 dias. Laranjal/Pelotas usa HidroSens.
              </div>
            </div>
            <select value={selectedStationId} onChange={(event) => setSelectedStationId(event.target.value)} style={{ minHeight: 36 }}>
              {points.map(({ point, history }) => (
                <option key={point.id} value={point.id}>
                  {shortName(point)}{history.length >= 2 ? "" : " (sem historico)"}
                </option>
              ))}
              <option value="media_geral">Media geral</option>
            </select>
          </div>
          <LineChart
            points={selectedStationId === "media_geral" ? avgChart : selectedHistory}
            width={480}
            height={190}
            color="#1a6fd4"
            referenceY={0}
            label={selectedStationId === "media_geral" ? "Media geral da Lagoa" : shortName(selectedPoint?.point || {})}
          />
        </div>
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Previsao do nivel da Lagoa</h3>
          <LineChart points={[0.61, 0.60, 0.59, 0.58, 0.57, 0.57, 0.56].map((v) => ({ v }))} width={480} height={190} color="#1a6fd4" dashed referenceY={0} />
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }}>Sobre a previsao <NavIcon name="info" size={14} /></button>
        </div>
      </div>

      <details className="sr-card-v2">
        <summary className="sr-card-title" style={{ cursor: "pointer" }}>Condicoes atuais</summary>
        {[
          { label: "Temperatura da agua", value: "19,4 °C" },
          { label: "Vento medio", value: poaWeather?.wind_speed_10m != null ? `${poaWeather.wind_speed_10m.toFixed(0)} km/h` : "—" },
          { label: "Direcao do vento", value: "NE (45°)" },
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
