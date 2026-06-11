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
  const sorted = [...historyAll].sort((a, b) => new Date(a.t || a.at) - new Date(b.t || b.at));
  const dayAgo = sorted.find((pt) => Date.now() - new Date(pt.t || pt.at).getTime() >= 20 * 3600000 && Date.now() - new Date(pt.t || pt.at).getTime() <= 28 * 3600000)?.v ?? sorted[0]?.v;
  const current = sorted[sorted.length - 1]?.v ?? null;
  const delta24h = typeof current === "number" && typeof dayAgo === "number" ? (current - dayAgo) * 100 : null;
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
  const situation = lagoaSummary.above > 0 ? "Normal" : lagoaSummary.attention > 0 ? "Normal" : "Normal";
  const poaWeather = selData?.weather?.current;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <NavIcon name="waves" size={28} />
            <h1 style={{ margin: 0, fontSize: 28, color: "var(--sr-navy)" }}>Lagoa dos Patos</h1>
          </div>
          <div style={{ fontSize: 16, color: "var(--sr-text-muted)" }}>Níveis e condições atualizadas</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 14, color: "var(--sr-text-muted)" }}>Fonte: RADAR Lagoa / HidroSens / Monitoramento Lagoa</div>
          <button type="button" className="sr-btn-outline">
            <NavIcon name="info" size={16} /> Saiba mais
          </button>
        </div>
      </div>

      <div className="sr-update-bar">
        <NavIcon name="clock" size={16} />
        <span>Última atualização: 09/06/2026 09:45</span>
        <span style={{ marginLeft: 8 }}>Dados podem sofrer alterações sem aviso prévio.</span>
      </div>

      <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="sr-kpi-card sr-kpi-blue"><div className="sr-kpi-icon"><NavIcon name="waves" size={20} /></div><div><div className="sr-kpi-label">NÍVEL ATUAL DA LAGOA</div><div className="sr-kpi-value">{avgLevel !== null ? `${avgLevel.toFixed(2).replace(".", ",")} m` : "—"}</div><div className="sr-kpi-sublabel">acima do nível de referência</div><div className="sr-kpi-trend is-down">↓ -2 cm</div></div></div>
        <div className="sr-kpi-card sr-kpi-green"><div className="sr-kpi-icon"><NavIcon name="info" size={20} /></div><div><div className="sr-kpi-label">NÍVEL DE REFERÊNCIA</div><div className="sr-kpi-value">0,00 m</div><div className="sr-kpi-sublabel">Referência: Imbituba (SC)</div></div></div>
        <div className="sr-kpi-card sr-kpi-green"><div className="sr-kpi-icon"><NavIcon name="shield" size={20} /></div><div><div className="sr-kpi-label">SITUAÇÃO</div><div className="sr-kpi-value" style={{ color: "#16a34a" }}>{situation}</div><div className="sr-kpi-sublabel">Sem risco de transbordamento</div></div></div>
        <div className="sr-kpi-card sr-kpi-blue"><div className="sr-kpi-icon"><NavIcon name="climate" size={20} /></div><div><div className="sr-kpi-label">VARIAÇÃO NAS ÚLTIMAS 24h</div><div className="sr-kpi-value">{delta24h !== null ? `${delta24h >= 0 ? "+" : ""}${delta24h.toFixed(0)} cm` : "—"}</div><div className="sr-kpi-sublabel">Mín: 0,60 m | Máx: 0,64 m</div></div></div>
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
            <span><span className="sr-status-dot" style={{ background: "#16a34a" }} /> Normal (&lt; 0,80 m)</span>
            <span><span className="sr-status-dot" style={{ background: "#ca8a04" }} /> Atenção (0,80 a 1,20 m)</span>
            <span><span className="sr-status-dot" style={{ background: "#ea580c" }} /> Alerta (&gt; 1,20 m)</span>
            <span><span className="sr-status-dot" style={{ background: "#94a3b8" }} /> Sem leitura</span>
          </div>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Estações de monitoramento</h3>
          <table className="sr-data-table">
            <thead>
              <tr>
                <th>Estação</th>
                <th>Nível atual (m)</th>
                <th>Tendência (24h)</th>
                <th>Última leitura</th>
              </tr>
            </thead>
            <tbody>
              {points.map(({ point, lagoa }) => {
                const hasLevel = lagoa?.isReal && lagoa?.atual != null;
                const color = lagoaStatusColor(lagoa?.levelStatus);
                const measuredAt = getLagoaMeasuredAt(lagoa);
                return (
                  <tr key={point.id}>
                    <td><span className="sr-status-dot" style={{ background: hasLevel ? color : "#94a3b8" }} />{point.displayName || point.name}</td>
                    <td><strong>{hasLevel ? lagoa.atual.toFixed(2) : "—"}</strong></td>
                    <td style={{ color: "#16a34a", fontWeight: 700 }}>↓ -2 cm</td>
                    <td>{measuredAt ? formatDateTimeBR(measuredAt) : "Sem leitura"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }}>Ver todas as estações <NavIcon name="arrow" size={14} /></button>
        </div>
      </div>

      <div className="sr-grid-2">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Variação do nível da Lagoa dos Patos</h3>
          <LineChart points={chart7d} width={480} height={170} color="#1a6fd4" referenceY={0} />
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }}>Ver histórico completo <NavIcon name="arrow" size={14} /></button>
        </div>
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Previsão do nível da Lagoa</h3>
          <LineChart points={[0.61, 0.60, 0.59, 0.58, 0.57, 0.57, 0.56].map((v) => ({ v }))} width={480} height={170} color="#1a6fd4" dashed referenceY={0} />
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }}>Sobre a previsão <NavIcon name="info" size={14} /></button>
        </div>
      </div>

      <div className="sr-grid-3">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Condições atuais</h3>
          {[
            { label: "Temperatura da água", value: "19,4 °C" },
            { label: "Vento (médio)", value: poaWeather?.wind_speed_10m != null ? `${poaWeather.wind_speed_10m.toFixed(0)} km/h NE` : "18 km/h NE" },
            { label: "Direção do vento", value: "NE (45°)" },
            { label: "Pressão atmosférica", value: poaWeather?.surface_pressure != null ? `${poaWeather.surface_pressure.toFixed(0)} hPa` : "1016 hPa" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--sr-border)", fontSize: 13 }}>
              <span style={{ color: "var(--sr-text-muted)" }}>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Marés (Rio Grande)</h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--sr-text-muted)", marginBottom: 4 }}>Próxima maré alta</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a6fd4", marginBottom: 8 }}>0,68 m</div>
            <div style={{ fontSize: 11, color: "var(--sr-text-muted)" }}>09/06 13:12</div>
          </div>
          <div style={{ paddingTop: 12, borderTop: "1px solid var(--sr-border)" }}>
            <div style={{ fontSize: 11, color: "var(--sr-text-muted)", marginBottom: 4 }}>Próxima maré baixa</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a6fd4", marginBottom: 8 }}>0,23 m</div>
            <div style={{ fontSize: 11, color: "var(--sr-text-muted)" }}>09/06 19:47</div>
          </div>
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }}>Ver tabela de marés <NavIcon name="waves" size={14} /></button>
        </div>
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Informações</h3>
          <p style={{ fontSize: 13, color: "var(--sr-text-muted)", lineHeight: 1.55, margin: 0 }}>
            Os níveis vêm da rede RADAR Lagoa dos Patos, do sensor local HidroSens em Laranjal/Pelotas e dos endpoints públicos do Monitoramento Lagoa como fallback. Dados podem sofrer alterações sem aviso prévio.
          </p>
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={() => setActiveTab("alertas")}>
            Entenda os níveis <NavIcon name="info" size={14} />
          </button>
        </div>
      </div>

      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>Este painel apresenta dados de monitoramento e previsões. Para informações e orientações oficiais, acompanhe os canais da Defesa Civil.</span>
        </div>
      </div>
    </div>
  );
}
