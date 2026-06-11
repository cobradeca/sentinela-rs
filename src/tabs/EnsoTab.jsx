import { DefesaCivilNotice } from "../components/DefesaCivilNotice";
import { NavIcon } from "../components/layout/NavIcons";

export function EnsoTab({ ctx }) {
  const {
    activeENSO,
    dark,
    ensoClass,
    ensoObservedAvailable,
    ensoObservedText,
    ensoProbabilityText,
    formatDateTimeBR,
    formatProbability,
    formatSignedCelsius,
    safeEnsoForecast,
    lastUpdate,
    t,
  } = ctx;

  const forecast = safeEnsoForecast(activeENSO.forecast);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <DefesaCivilNotice t={t} dark={dark} />

      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>{ensoObservedText}. {ensoProbabilityText}.</span>
        </div>
      </div>

      <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          { l: "Fase observada", v: ensoObservedAvailable ? `${ensoClass.icon} ${ensoClass.label}` : "Indisponível", s: ensoObservedAvailable ? `Niño 3.4: ${formatSignedCelsius(activeENSO.nino34)}` : "NOAA/CPC sem leitura", c: ensoClass.color },
          { l: "ONI trimestral", v: formatSignedCelsius(activeENSO.oni3m), s: "NOAA/CPC observado", c: "#f97316" },
          { l: "Prob. El Niño", v: formatProbability(activeENSO.prob?.elNino), s: "IRI/CCSR", c: "#dc2626" },
          { l: "Prob. La Niña", v: formatProbability(activeENSO.prob?.laNina), s: "IRI/CCSR", c: "#2563eb" },
        ].map((item) => (
          <div key={item.l} className="sr-card-v2" style={{ borderTop: `3px solid ${item.c}` }}>
            <div className="sr-kpi-label">{item.l}</div>
            <div className="sr-kpi-value" style={{ color: item.c }}>{item.v}</div>
            <div className="sr-kpi-sublabel">{item.s}</div>
          </div>
        ))}
      </div>

      <div className="sr-card-v2">
        <h3 className="sr-card-title">ENSO - Situação atual e probabilidade</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "La Niña", val: activeENSO.prob?.laNina, color: "#2563eb" },
            { label: "Neutro", val: activeENSO.prob?.neutral, color: "#94a3b8" },
            { label: "El Niño", val: activeENSO.prob?.elNino, color: "#dc2626" },
          ].map((item) => (
            <div key={item.label} style={{ padding: 14, border: "1px solid var(--sr-border)", borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{item.label}</div>
              <div style={{ height: 140, display: "flex", alignItems: "flex-end", background: "linear-gradient(180deg,#f8fbff,#eef4fb)", borderRadius: 10, padding: 10 }}>
                <div style={{ width: "100%", height: `${Math.max(8, Number(item.val || 0) * 100)}%`, background: item.color, borderRadius: 8 }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>{formatProbability(item.val)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sr-grid-2">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Escala Niño 3.4</h3>
          <div style={{ padding: 16, borderRadius: 14, background: "linear-gradient(90deg,#1e3a8a 0%,#3b82f6 20%,#22c55e 38%,#22c55e 62%,#f97316 76%,#ef4444 88%,#dc2626 100%)", color: "#fff", fontWeight: 700 }}>
            {ensoObservedAvailable ? `Atual: ${formatSignedCelsius(activeENSO.nino34)} → ${ensoClass.label}` : "NOAA/CPC indisponível"}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--sr-text-muted)" }}>
            Fonte: NOAA/CPC. Consulta: {activeENSO.probabilityFetchedAt ? formatDateTimeBR(activeENSO.probabilityFetchedAt) : lastUpdate ? formatDateTimeBR(lastUpdate) : "sem horário"}.
          </div>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Previsão probabilística IRI/CCSR</h3>
          {forecast.length >= 2 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {forecast.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "96px 1fr 1fr 1fr", gap: 8, padding: 8, borderBottom: "1px solid var(--sr-border)" }}>
                  <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>{item.p}</div>
                  <div style={{ color: "#dc2626", fontWeight: 700 }}>{formatProbability(item.en)}</div>
                  <div style={{ color: "#16a34a", fontWeight: 700 }}>{formatProbability(item.nu)}</div>
                  <div style={{ color: "#2563eb", fontWeight: 700 }}>{formatProbability(item.ln)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sr-chart-empty">Sem previsão probabilística validada no momento.</div>
          )}
        </div>
      </div>

      <div className="sr-grid-2">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Impactos típicos no Sul do Brasil</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(37,99,235,0.2)", background: "rgba(37,99,235,0.05)" }}>
              <div style={{ fontWeight: 800, color: "#2563eb", marginBottom: 6 }}>La Niña</div>
              <div style={{ fontSize: 13, color: "var(--sr-text-muted)", lineHeight: 1.6 }}>Chuva acima da média, temperaturas mais baixas e maior frequência de frentes frias.</div>
            </div>
            <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)" }}>
              <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 6 }}>El Niño</div>
              <div style={{ fontSize: 13, color: "var(--sr-text-muted)", lineHeight: 1.6 }}>Menor frequência de chuva no Sul, temperaturas acima da média e menor frequência de frentes frias.</div>
            </div>
          </div>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Histórico de eventos</h3>
          <table className="sr-data-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Evento</th>
                <th>Intensidade</th>
                <th>Pico ONI</th>
              </tr>
            </thead>
            <tbody>
              {[
                { period: "2020-2023", evento: "La Niña", intensidade: "Moderada a Forte", pico: "-1,6 °C" },
                { period: "2018-2019", evento: "El Niño", intensidade: "Fraco", pico: "+0,7 °C" },
                { period: "2015-2016", evento: "La Niña", intensidade: "Fraco", pico: "-0,6 °C" },
                { period: "2014-2016", evento: "El Niño", intensidade: "Forte", pico: "+2,6 °C" },
                { period: "2010-2012", evento: "La Niña", intensidade: "Moderada", pico: "-1,4 °C" },
              ].map((item) => (
                <tr key={item.period}>
                  <td>{item.period}</td>
                  <td style={{ fontWeight: 700 }}>{item.evento}</td>
                  <td>{item.intensidade}</td>
                  <td>{item.pico}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
