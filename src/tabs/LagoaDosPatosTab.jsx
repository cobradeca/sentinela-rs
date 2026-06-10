import { LineChart } from "../components/layout/LineChart";
import { NavIcon } from "../components/layout/NavIcons";

export function LagoaDosPatosTab({ ctx }) {
  const {
    STATIONS_LAGOA,
    formatDateTimeBR,
    getLagoaMeasuredAt,
    getLagoaPointData,
    getLagoaSourceText,
    lagoaHistory,
    lagoaStatusColor,
    lagoaStatusLabel,
    lagoaSummary,
    selData,
    setActiveTab,
    setRiskExplain,
    stationData,
    explainLagoaRisk,
  } = ctx;

  const points = STATIONS_LAGOA.map((p) => ({
    point: p,
    data: getLagoaPointData(p, stationData),
    lagoa: getLagoaPointData(p, stationData)?.lagoa,
  }));

  const withLevel = points.filter(({ lagoa }) => lagoa?.isReal && typeof lagoa.atual === "number");
  const avgLevel = withLevel.length ? withLevel.reduce((s, { lagoa }) => s + lagoa.atual, 0) / withLevel.length : null;

  const historyAll = STATIONS_LAGOA.flatMap((p) => lagoaHistory[p.id] || []);
  const get24hDelta = () => {
    if (historyAll.length < 2 || avgLevel === null) return null;
    const sorted = [...historyAll].sort((a, b) => new Date(a.t || a.at) - new Date(b.t || b.at));
    const now = sorted[sorted.length - 1]?.v;
    const dayAgo = sorted.find((pt) => {
      const age = Date.now() - new Date(pt.t || pt.at).getTime();
      return age >= 20 * 3600000 && age <= 28 * 3600000;
    })?.v ?? sorted[0]?.v;
    if (typeof now === "number" && typeof dayAgo === "number") return (now - dayAgo) * 100;
    return null;
  };

  const delta24h = get24hDelta();
  const minLevel = withLevel.length ? Math.min(...withLevel.map(({ lagoa }) => lagoa.atual)) : null;
  const maxLevel = withLevel.length ? Math.max(...withLevel.map(({ lagoa }) => lagoa.atual)) : null;

  const chart7d = (() => {
    const all = STATIONS_LAGOA.flatMap((p) => (lagoaHistory[p.id] || []).slice(-14));
    const byDay = {};
    all.forEach((pt) => {
      const day = String(pt.t || pt.at || "").slice(0, 10);
      if (!day) return;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(pt.v);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([, vals]) => ({ v: vals.reduce((a, b) => a + b, 0) / vals.length }));
  })();

  const situation = lagoaSummary.above > 0 ? "Alerta" : lagoaSummary.attention > 0 ? "Atenção" : "Normal";
  const situationColor = lagoaSummary.above > 0 ? "var(--sr-orange)" : lagoaSummary.attention > 0 ? "var(--sr-yellow)" : "var(--sr-green)";

  const poaWeather = selData?.weather?.current;

  return (
    <div>
      <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="sr-card-v2">
          <div className="sr-kpi-label">Nível atual da Lagoa</div>
          <div className="sr-kpi-value">{avgLevel !== null ? `${avgLevel.toFixed(2).replace(".", ",")} m` : "—"}</div>
          {delta24h !== null && (
            <div className={`sr-kpi-trend ${delta24h <= 0 ? "is-down" : "is-up"}`}>
              {delta24h <= 0 ? "↓" : "↑"} {Math.abs(delta24h).toFixed(0)} cm (24h)
            </div>
          )}
        </div>
        <div className="sr-card-v2">
          <div className="sr-kpi-label">Nível de referência</div>
          <div className="sr-kpi-value">0,00 m</div>
          <div className="sr-kpi-sublabel">Imbituba (SC)</div>
        </div>
        <div className="sr-card-v2">
          <div className="sr-kpi-label">Situação</div>
          <div className="sr-kpi-value" style={{ color: situationColor }}>{situation}</div>
          <div className="sr-kpi-sublabel">
            {lagoaSummary.above > 0 ? "Estação(es) acima da cota" : "Sem risco de transbordamento"}
          </div>
        </div>
        <div className="sr-card-v2">
          <div className="sr-kpi-label">Variação (24h)</div>
          <div className="sr-kpi-value">{delta24h !== null ? `${delta24h >= 0 ? "+" : ""}${delta24h.toFixed(0)} cm` : "—"}</div>
          {minLevel !== null && maxLevel !== null && (
            <div className="sr-kpi-sublabel">Mín: {minLevel.toFixed(2)} m | Máx: {maxLevel.toFixed(2)} m</div>
          )}
        </div>
      </div>

      <div className="sr-grid-2-1">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Mapa da Lagoa dos Patos</h3>
          <iframe
            className="sr-map-frame"
            title="Mapa Lagoa dos Patos"
            loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-52.45%2C-32.15%2C-50.85%2C-30.25&layer=mapnik&marker=-31.5%2C-51.5"
          />
          <div className="sr-map-legend">
            <span><span className="sr-status-dot" style={{ background: "#16a34a" }} /> Normal</span>
            <span><span className="sr-status-dot" style={{ background: "#ca8a04" }} /> Atenção</span>
            <span><span className="sr-status-dot" style={{ background: "#ea580c" }} /> Alerta</span>
            <span><span className="sr-status-dot" style={{ background: "#94a3b8" }} /> Sem leitura</span>
          </div>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Estações de monitoramento</h3>
          <table className="sr-data-table">
            <thead>
              <tr>
                <th>Estação</th>
                <th>Nível (m)</th>
                <th>Status</th>
                <th>Leitura</th>
              </tr>
            </thead>
            <tbody>
              {points.map(({ point, lagoa }) => {
                const hasLevel = lagoa?.isReal && lagoa?.atual != null;
                const color = lagoaStatusColor(lagoa?.levelStatus);
                const measuredAt = getLagoaMeasuredAt(lagoa);
                return (
                  <tr key={point.id}>
                    <td>
                      <span className="sr-status-dot" style={{ background: hasLevel ? color : "#94a3b8" }} />
                      {point.displayName || point.name}
                    </td>
                    <td><strong>{hasLevel ? lagoa.atual.toFixed(2) : "—"}</strong></td>
                    <td>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}
                        onClick={() => setRiskExplain(explainLagoaRisk(point, lagoa))}
                      >
                        {lagoaStatusLabel(lagoa?.levelStatus)}
                      </button>
                    </td>
                    <td style={{ fontSize: 11, color: "var(--sr-text-muted)" }}>
                      {measuredAt ? formatDateTimeBR(measuredAt) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sr-grid-2">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Variação do nível — últimos 7 dias</h3>
          <LineChart points={chart7d} width={480} height={140} color="#1a6fd4" referenceY={0} />
        </div>
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Histórico por estação</h3>
          <LineChart
            points={(lagoaHistory[STATIONS_LAGOA[0]?.id] || []).slice(-7).map((p) => ({ v: p.v }))}
            width={480}
            height={140}
            color="#1a6fd4"
            dashed
            label={STATIONS_LAGOA[0]?.name || ""}
          />
        </div>
      </div>

      <div className="sr-grid-3">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Condições atuais</h3>
          {[
            { label: "Temperatura da água", value: "—", note: "Fonte em integração" },
            { label: "Velocidade do vento", value: poaWeather?.wind_speed_10m != null ? `${poaWeather.wind_speed_10m.toFixed(0)} km/h` : "—" },
            { label: "Pressão atmosférica", value: poaWeather?.surface_pressure != null ? `${poaWeather.surface_pressure.toFixed(0)} hPa` : "—" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--sr-border)", fontSize: 13 }}>
              <span style={{ color: "var(--sr-text-muted)" }}>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Fontes por estação</h3>
          {points.slice(0, 4).map(({ point, lagoa }) => (
            <div key={point.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--sr-border)" }}>
              <strong>{point.name}</strong>
              <div style={{ color: "var(--sr-text-muted)" }}>{getLagoaSourceText(lagoa, point)}</div>
            </div>
          ))}
        </div>
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Informações</h3>
          <p style={{ fontSize: 13, color: "var(--sr-text-muted)", lineHeight: 1.55, margin: 0 }}>
            Os níveis são medidos por sensores RADAR, HidroSens/UFPel e Sensores de Monitoramento Lagoa dos Patos. O nível zero de referência
            corresponde ao marégrafo de Imbituba (SC). Para decisões de segurança, consulte a Defesa Civil RS.
          </p>
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none" }} onClick={() => setActiveTab("alertas")}>
            Entenda os níveis <NavIcon name="arrow" size={14} />
          </button>
        </div>
      </div>

      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>Este painel apresenta dados de monitoramento. Para alertas oficiais, consulte a Defesa Civil RS (199).</span>
        </div>
      </div>
    </div>
  );
}
