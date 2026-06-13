import { NavIcon } from "../components/layout/NavIcons";
import { WeatherIcon } from "../components/layout/WeatherIcon";
import { STATIONS_CIDADES } from "../config/stations";

export function PrevisaoTab({ ctx }) {
  const {
    RISK_LEVELS,
    activeENSO,
    dayNames,
    ensoClass,
    ensoDominantProb,
    ensoObservedAvailable,
    explainCityRisk,
    explainDailyRisk,
    formatProbability,
    formatSignedCelsius,
    getRiskBg,
    getRiskColor,
    selData,
    selStation,
    setActiveTab,
    setRiskExplain,
    setSelStation,
    wmoDesc,
  } = ctx;

  const forecastDayIndexes = selData?.weather?.forecastDayIndexes
    || selData?.weather?.daily?.time?.slice(0, 14).map((_, index) => index)
    || [];

  const daily = selData?.weather?.daily;
  const precipValues = forecastDayIndexes.map((index) => daily?.precipitation_sum?.[index] || 0);
  const tempMaxValues = forecastDayIndexes.map((index) => daily?.temperature_2m_max?.[index] || 0);
  const tempMinValues = forecastDayIndexes.map((index) => daily?.temperature_2m_min?.[index] || 0);
  const windValues = forecastDayIndexes.map((index) => daily?.windspeed_10m_max?.[index] || 0);

  const avgMax = tempMaxValues.length ? tempMaxValues.reduce((a, b) => a + b, 0) / tempMaxValues.length : null;
  const avgMin = tempMinValues.length ? tempMinValues.reduce((a, b) => a + b, 0) / tempMinValues.length : null;
  const totalPrecip = precipValues.reduce((a, b) => a + b, 0);
  const avgWind = windValues.length ? windValues.reduce((a, b) => a + b, 0) / windValues.length : null;
  const windCurrentDirection = selData?.windCurrentDirection;

  const maxPrecip = Math.max(...precipValues, 1);

  return (
    <div>
      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>Previsão de 14 dias fornecida por Open-Meteo. Não substitui avisos oficiais do INMET ou Defesa Civil.</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--sr-text-muted)" }}>
          <NavIcon name="forecast" size={18} />
          <strong style={{ color: "var(--sr-navy)" }}>{selStation.name} — RS</strong>
        </div>
        <div style={{ position: "relative" }}>
          <select
            value={selStation.id}
            onChange={(e) => setSelStation(STATIONS_CIDADES.find((st) => st.id === e.target.value) || STATIONS_CIDADES[0])}
            style={{
              appearance: "none",
              padding: "10px 36px 10px 14px",
              border: "1px solid var(--sr-border)",
              borderRadius: 8,
              background: "var(--sr-card)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--sr-navy)",
              cursor: "pointer",
            }}
          >
            {STATIONS_CIDADES.map((st) => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--sr-blue)" }}>▼</span>
        </div>
      </div>

      {daily ? (
        <>
          <div className="sr-card-v2" style={{ marginBottom: 18 }}>
            <h3 className="sr-card-title">Visão geral dos próximos 14 dias</h3>
            <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12, color: "var(--sr-text-muted)" }}>
              <span><span style={{ color: "#dc2626", fontWeight: 700 }}>—</span> Temp. máx.</span>
              <span><span style={{ color: "#2563eb", fontWeight: 700 }}>—</span> Temp. mín.</span>
              <span><span style={{ color: "#93c5fd", fontWeight: 700 }}>■</span> Precipitação (mm)</span>
            </div>
            <div className="sr-combo-chart">
              {forecastDayIndexes.map((dayIndex, i) => {
                const date = daily.time[dayIndex];
                const dd = new Date(`${date}T12:00:00`);
                const p = precipValues[i];
                const tx = tempMaxValues[i];
                const tn = tempMinValues[i];
                return (
                  <div key={date} className="sr-combo-bar">
                    <div style={{ fontSize: 9, color: "var(--sr-text-muted)", textAlign: "center" }}>
                      {dayNames[dd.getDay()]}
                      <br />
                      {dd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626" }}>{tx.toFixed(0)}°</div>
                    <div style={{ fontSize: 9, color: "#2563eb" }}>{tn.toFixed(0)}°</div>
                    <div className="sr-combo-bar-fill" style={{ height: `${(p / maxPrecip) * 80}px` }} title={`${p.toFixed(1)} mm`} />
                    <div style={{ fontSize: 9, color: "var(--sr-blue)", fontWeight: 600 }}>{p.toFixed(1)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sr-card-v2" style={{ marginBottom: 18 }}>
            <h3 className="sr-card-title">Previsão diária detalhada</h3>
            <div className="sr-forecast-carousel">
              {forecastDayIndexes.map((dayIndex, i) => {
                const date = daily.time[dayIndex];
                const dd = new Date(`${date}T12:00:00`);
                const p = precipValues[i];
                const tx = tempMaxValues[i];
                const tn = tempMinValues[i];
                const w = windValues[i];
                const c = daily.weathercode?.[dayIndex] || 0;
                const dr = p > 20 || w > 40 || tn < 5 ? "MONITORAR" : "NORMAL";
                return (
                  <div key={date} className={`sr-forecast-day-card${i === 0 ? " is-today" : ""}`}>
                    <div className="sr-day-name">{i === 0 ? "Hoje" : dayNames[dd.getDay()]}</div>
                    <div className="sr-day-date">{dd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
                    <div className="sr-emoji"><WeatherIcon code={c} size={32} /></div>
                    <div className="sr-tmax">{tx.toFixed(0)}°</div>
                    <div className="sr-tmin">{tn.toFixed(0)}°</div>
                    <div className="sr-detail">🌧 {p.toFixed(1)} mm</div>
                    <div className="sr-detail">💨 {w.toFixed(0)} km/h</div>
                    <button
                      type="button"
                      onClick={() => setRiskExplain(explainDailyRisk(selStation, date, p, tn, w, dr))}
                      style={{ marginTop: 6, background: "none", border: `1px solid ${getRiskColor(dr)}`, color: getRiskColor(dr), borderRadius: 4, fontSize: 10, padding: "2px 6px", cursor: "pointer" }}
                    >
                      {RISK_LEVELS[dr].label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <div className="sr-card-v2">
              <div className="sr-kpi-label">Temp. máx. média</div>
              <div className="sr-kpi-value" style={{ color: "#dc2626" }}>{avgMax != null ? `${avgMax.toFixed(1)} °C` : "—"}</div>
            </div>
            <div className="sr-card-v2">
              <div className="sr-kpi-label">Temp. mín. média</div>
              <div className="sr-kpi-value" style={{ color: "#2563eb" }}>{avgMin != null ? `${avgMin.toFixed(1)} °C` : "—"}</div>
            </div>
            <div className="sr-card-v2">
              <div className="sr-kpi-label">Precipitação total</div>
              <div className="sr-kpi-value">{totalPrecip.toFixed(1)} mm</div>
            </div>
            <div className="sr-card-v2">
              <div className="sr-kpi-label">Vento médio máx.</div>
              <div className="sr-kpi-value">{avgWind != null ? `${avgWind.toFixed(0)} km/h` : "—"}</div>
            </div>
          </div>

          <div
            className="sr-card-v2"
            role="button"
            tabIndex={0}
            onClick={() => setRiskExplain(explainCityRisk(selStation, selData))}
            style={{ marginTop: 18, cursor: "pointer", background: getRiskBg(selData.risk), borderColor: `${getRiskColor(selData.risk)}44` }}
          >
            <h3 className="sr-card-title">Análise de monitoramento — 14 dias</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, fontSize: 13 }}>
              {[
                { l: "Precipitação", v: `${selData.precip?.toFixed(0)} mm`, alert: selData.precip > 50 },
                { l: "Temp. mínima", v: `${selData.tempMin?.toFixed(1)}°C`, alert: selData.tempMin < 5 },
                { l: "Vento máx.", v: `${selData.windMax?.toFixed(0)} km/h`, alert: selData.windMax > 40 },
                { l: "Direção atual", v: windCurrentDirection != null ? `${windCurrentDirection.toFixed(0)}°` : "Indisponível", alert: false },
                {
                  l: "Contexto ENSO",
                  v: ensoObservedAvailable
                    ? `${ensoClass.label} (${formatSignedCelsius(activeENSO.nino34)})`
                    : ensoDominantProb
                      ? `${ensoDominantProb.label} ${formatProbability(ensoDominantProb.value)}`
                      : "Indisponível",
                  alert: false,
                },
              ].map((item) => (
                <div key={item.l} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--sr-text-muted)" }}>{item.l}</span>
                  <strong style={{ color: item.alert ? getRiskColor(selData.risk) : "var(--sr-green)" }}>{item.v}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="sr-info-banner" style={{ marginTop: 18 }}>
            <span><strong>Importante:</strong> previsão numérica de apoio. Para alertas oficiais, consulte a Defesa Civil RS.</span>
            <button type="button" onClick={() => setActiveTab("alertas")}>
              Ver alertas da Defesa Civil <NavIcon name="shield" size={14} />
            </button>
          </div>
        </>
      ) : (
        <div className="sr-chart-empty">Dados de previsão não disponíveis para esta cidade.</div>
      )}
    </div>
  );
}
