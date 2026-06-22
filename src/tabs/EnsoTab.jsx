import React from "react";
import { NavIcon } from "../components/layout/NavIcons";
import { AnomaliaSSTCard } from "../components/cards/AnomaliaSSTCard";

const phaseColors = {
  superLaNina: "#1e3a8a",
  laNina: "#1d4ed8",
  neutral: "#94a3b8",
  elNino: "#dc2626",
  superElNino: "#7f1d1d",
};

const historicalEvents = [
  { 
    event: "La Nina", 
    period: "2020-2023", 
    color: phaseColors.laNina,
    specificImpacts: "Redução de precipitação no RS. Período marcado por secas moderadas, com desafios na agricultura e abastecimento de água. Temperaturas próximas ou abaixo da média."
  },
  { 
    event: "Neutro", 
    period: "2018-2019", 
    color: phaseColors.neutral,
    specificImpacts: "Padrão de chuva próximo à normalidade. Variabilidade sazonal típica sem extremos marcantes. Condições favoráveis para agricultura."
  },
  { 
    event: "El Nino", 
    period: "2015-2016", 
    color: phaseColors.elNino,
    specificImpacts: "Intenso: Chuvas acima da média no RS, com eventos de precipitação extrema. Aumento de enchentes e deslizamentos. Temperaturas elevadas registradas."
  },
  { 
    event: "Neutro", 
    period: "2013-2014", 
    color: phaseColors.neutral,
    specificImpacts: "Condições próximas da normalidade. Distribuição de chuvas regular ao longo do período. Sem extremos climáticos significativos."
  },
  { 
    event: "La Nina", 
    period: "2010-2012", 
    color: phaseColors.laNina,
    specificImpacts: "Chuvas abaixo da média. Período de estiagem com impactos na agricultura. Déficit hídrico em diversas regiões do RS."
  },
];

function pct(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 100)}%` : "--";
}

function celsius(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(1)} °C` : "--";
}

function currentPhase(nino34) {
  if (typeof nino34 !== "number" || !Number.isFinite(nino34)) {
    return { label: "Indisponivel", key: "neutral", description: "Sem leitura validada" };
  }
  if (nino34 >= 1.5) return { label: "Super El Nino", key: "superElNino", description: "Anomalia quente extrema no Pacifico equatorial" };
  if (nino34 >= 0.5) return { label: "El Nino", key: "elNino", description: "Anomalia quente no Pacifico equatorial" };
  if (nino34 <= -1.5) return { label: "Super La Nina", key: "superLaNina", description: "Anomalia fria extrema no Pacifico equatorial" };
  if (nino34 <= -0.5) return { label: "La Nina", key: "laNina", description: "Anomalia fria no Pacifico equatorial" };
  return { label: "Neutra", key: "neutral", description: "Sem anomalia significativa" };
}

function trendText(forecast) {
  const first = Array.isArray(forecast) ? forecast[0] : null;
  if (!first) return "Tendencia indisponivel";
  const values = [
    { label: "El Nino", value: first.en },
    { label: "Neutro", value: first.nu },
    { label: "La Nina", value: first.ln },
  ].filter((item) => typeof item.value === "number");
  if (!values.length) return "Tendencia indisponivel";
  const dominant = values.sort((a, b) => b.value - a.value)[0];
  return `Persistencia de ${dominant.label} (${pct(dominant.value)})`;
}

function ForecastTable({ forecast }) {
  if (!Array.isArray(forecast) || forecast.length < 1) {
    return <div className="sr-chart-empty">Sem série validada.</div>;
  }
  return (
    <div style={{ overflowX: "auto", marginBottom: 12 }}>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--sr-border)" }}>
            <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 800, color: "var(--sr-text-muted)", textTransform: "uppercase", fontSize: 11 }}>Trimestre</th>
            <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: 800, color: phaseColors.elNino, textTransform: "uppercase", fontSize: 11 }}>El Niño</th>
            <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: 800, color: "#64748b", textTransform: "uppercase", fontSize: 11 }}>Neutro</th>
            <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: 800, color: phaseColors.laNina, textTransform: "uppercase", fontSize: 11 }}>La Niña</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid var(--sr-border)", background: idx === 0 ? "rgba(30, 58, 138, 0.04)" : "transparent" }}>
              <td style={{ padding: "12px 8px", fontWeight: 700 }}>{item.p || "--"}</td>
              <td style={{ padding: "12px 8px", textAlign: "center", color: phaseColors.elNino, fontWeight: 800 }}>{pct(item.en)}</td>
              <td style={{ padding: "12px 8px", textAlign: "center", color: "#64748b", fontWeight: 800 }}>{pct(item.nu)}</td>
              <td style={{ padding: "12px 8px", textAlign: "center", color: phaseColors.laNina, fontWeight: 800 }}>{pct(item.ln)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventModal({ event, onClose }) {
  const genericDetails = {
    "La Nina": {
      desc: "Anomalia fria no Pacífico Equatorial",
      color: phaseColors.laNina
    },
    "El Nino": {
      desc: "Anomalia quente no Pacífico Equatorial",
      color: phaseColors.elNino
    },
    "Neutro": {
      desc: "Sem anomalia significativa",
      color: "#64748b"
    }
  };
  const details = genericDetails[event.event] || {};
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="sr-card-v2" style={{ maxWidth: 420, padding: 24, borderRadius: 12, borderTop: `4px solid ${details.color}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: details.color }} />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: details.color }}>{event.event}</h2>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--sr-text-muted)", fontWeight: 600, marginBottom: 4 }}>PERÍODO</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--sr-text)" }}>{event.period}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--sr-text-muted)", fontWeight: 600, marginBottom: 4 }}>CARACTERÍSTICAS</div>
          <div style={{ fontSize: 14, color: "var(--sr-text)" }}>{details.desc}</div>
        </div>
        <div style={{ padding: "12px 14px", background: `${details.color}12`, borderRadius: 8, borderLeft: `3px solid ${details.color}`, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--sr-text)", lineHeight: 1.6 }}>
            <strong>Impactos observados no RS:</strong><br/>{event.specificImpacts}
          </div>
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "10px 14px", background: "var(--sr-border)", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Fechar</button>
      </div>
    </div>
  );
}

function MiniLine({ forecast, field, color }) {
  const values = (forecast || []).map((item) => item[field]).filter((value) => typeof value === "number");
  if (values.length < 2) return <div className="sr-chart-empty">Sem serie validada.</div>;
  const w = 560;
  const h = 230;
  const padX = 36;
  const padY = 28;
  const points = values.map((value, index) => {
    const x = padX + (index / (values.length - 1)) * (w - padX * 2);
    const y = h - padY - value * (h - padY * 2);
    return [x, y, value];
  });
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Curva de probabilidade ENSO" style={{ width: "100%", height: 260 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const y = h - padY - tick * (h - padY * 2);
        return (
          <g key={tick}>
            <line x1={padX} x2={w - padX} y1={y} y2={y} stroke="#e5e7eb" />
            <text x={4} y={y + 4} fontSize="11" fill="#64748b">{Math.round(tick * 100)}%</text>
          </g>
        );
      })}
      <path d={path} fill="none" stroke={color} strokeWidth="3" />
      {points.map(([x, y, value], index) => (
        <g key={index}>
          <circle cx={x} cy={y} r="4" fill={color} />
          <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{pct(value)}</text>
          {index % 2 === 0 && (
            <text
              x={x}
              y={h - 2}
              textAnchor="end"
              fontSize="9"
              fill="#64748b"
              transform={`rotate(-45 ${x} ${h - 2})`}
              style={{ transformOrigin: `${x}px ${h - 2}px` }}
            >
              {(forecast[index]?.p || "").replace(" ", "-")}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function EnsoTab({ ctx }) {
  const { activeENSO, formatDateTimeBR, lastUpdate, safeEnsoForecast } = ctx;
  const [selectedEvent, setSelectedEvent] = React.useState(null);

  const forecast = safeEnsoForecast(activeENSO.forecast);
  const phase = currentPhase(activeENSO.nino34);
  const fetchedAt = activeENSO.probabilityFetchedAt || activeENSO.observedFetchedAt || lastUpdate;
  const observedReady = typeof activeENSO.nino34 === "number" && Number.isFinite(activeENSO.nino34);
  const probReady = forecast.length > 0;
  const topProb = forecast[0] || {};

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="sr-card-v2" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: "clamp(48px, 8vw, 64px)", height: "clamp(48px, 8vw, 64px)", borderRadius: "50%", background: "linear-gradient(135deg,#dbeafe,#60a5fa)", display: "grid", placeItems: "center", color: "#1d4ed8" }}>
              <NavIcon name="waves" size={26} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 900, color: "var(--sr-text)", letterSpacing: "-0.5px" }}>ENSO</h1>
              <div style={{ color: "var(--sr-text-muted)", fontSize: "clamp(12px, 3vw, 15px)", fontWeight: 500 }}>El Niño-Oscilação Sul</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--sr-text-muted)", fontSize: 13, fontWeight: 500 }}>
              <NavIcon name="clock" size={16} />
              <span>Última atualização:<br />{fetchedAt ? formatDateTimeBR(fetchedAt) : "--"}</span>
            </div>
            <div className="sr-btn-outline" style={{ fontSize: 13, fontWeight: 600, borderRadius: 20, padding: "8px 14px", border: "1px solid var(--sr-border)", background: "var(--sr-bg)" }}>Fonte: NOAA / CPC <NavIcon name="info" size={14} /></div>
          </div>
        </div>
 
        <div className="sr-kpi-row">
          {[
            ["Índice Niño 3.4 (°C)", celsius(activeENSO.nino34), observedReady ? "NOAA/CPC observado" : "Sem leitura validada", phase.key, phaseColors[phase.key]],
            ["Tendência (3 meses)", trendText(forecast), probReady ? "IRI/CCSR probabilístico" : "Sem curva validada", "elNino", phaseColors.elNino],
            ["Atualização", fetchedAt ? formatDateTimeBR(fetchedAt).split(",")[0] : "--", "dados oficiais", "neutral", phaseColors.neutral],
          ].map(([label, value, sub, colorKey, borderColor]) => (
            <div key={label} className="sr-card-v2" style={{ margin: 0, padding: "clamp(12px, 3vw, 18px)", borderRadius: 8, borderLeft: `4px solid ${borderColor}`, background: "var(--sr-card)" }}>
              <div className="sr-kpi-label" style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--sr-text-muted)" }}>{label}</div>
              <div style={{ fontSize: "clamp(20px, 4.5vw, 28px)", fontWeight: 900, color: borderColor, marginTop: 10, marginBottom: 8 }}>{value}</div>
              <div className="sr-kpi-sublabel" style={{ fontSize: 12, color: "var(--sr-text-muted)", fontWeight: 600 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sr-enso-two-col">
        <div className="sr-card-v2" style={{ background: "var(--sr-card)", borderTop: `3px solid ${phaseColors.elNino}`, gridColumn: 1 }}>
          <header style={{ marginBottom: 16 }}>
            <h3 className="sr-card-title" style={{ fontSize: 18, fontWeight: 800, color: "var(--sr-text)", margin: "0 0 4px" }}>Previsão 12 meses</h3>
            <div style={{ color: "var(--sr-text-muted)", fontSize: 13, fontWeight: 500 }}>Probabilidade IRI/CCSR para próximos trimestres</div>
          </header>
          {probReady ? (
            <>
              <ForecastTable forecast={forecast} />
              <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(220, 38, 38, 0.08)", borderLeft: `3px solid ${phaseColors.elNino}`, borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7f1d1d", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Próximo trimestre</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: phaseColors[forecast[0]?.en > 0.5 ? "elNino" : forecast[0]?.en < -0.5 ? "laNina" : "neutral"] }}>
                  {forecast[0]?.en > 0.5 ? "El Niño" : forecast[0]?.en < -0.5 ? "La Niña" : "Neutro"} <span style={{ fontSize: 16 }}>({pct(Math.max(forecast[0]?.en, forecast[0]?.nu, forecast[0]?.ln))})</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--sr-text-muted)", fontSize: 14 }}>Sem previsão probabilística validada no momento.</div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--sr-border)" }}>
            <div style={{ fontSize: 11, color: "var(--sr-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>Fonte: IRI/CCSR ENSO Forecast</div>
            <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/lanina/enso_evolution-status-fcsts-web.pdf" target="_blank" rel="noreferrer" style={{ display: "inline-flex", textDecoration: "none", background: "#1d4ed8", color: "white", padding: "6px 12px", borderRadius: 6, fontWeight: 700, fontSize: 12, gap: 6, alignItems: "center" }}>
              Boletim NOAA <NavIcon name="arrow" size={12} />
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateRows: "1fr 1fr" }}>
          <div className="sr-card-v2" style={{ borderTop: `3px solid #94a3b8` }}>
            <h3 className="sr-card-title" style={{ fontSize: 18, fontWeight: 800, color: "var(--sr-text)", marginBottom: 14 }}>Impactos históricos no RS</h3>
            {[
              ["La Niña", "Maior chance de chuvas abaixo da média no RS", phaseColors.laNina],
              ["Neutro", "Comportamento mais próximo da normalidade", "#64748b"],
              ["El Niño", "Maior chance de chuvas acima da média no RS", phaseColors.elNino],
            ].map(([label, text, color]) => (
              <div key={label} style={{ display: "flex", gap: 12, padding: "12px 14px", marginBottom: 8, borderRadius: 8, background: `${color}08`, borderLeft: `3px solid ${color}` }}>
                <div style={{ minWidth: 16, height: 16, borderRadius: "50%", background: color, marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 800, color, marginBottom: 2 }}>{label}</div>
                  <div style={{ color: "var(--sr-text-muted)", fontSize: 13, fontWeight: 500 }}>{text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="sr-card-v2" style={{ borderTop: `3px solid #dc2626` }}>
            <h3 className="sr-card-title" style={{ fontSize: 18, fontWeight: 800, color: "var(--sr-text)", marginBottom: 14 }}>Últimos eventos</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {historicalEvents.map((item, idx) => (
                <button
                  key={`${item.event}-${item.period}`}
                  onClick={() => setSelectedEvent(item)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: `${item.color}08`, borderRadius: 8, borderLeft: `3px solid ${item.color}`, border: "none", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = `${item.color}16`}
                  onMouseLeave={(e) => e.currentTarget.style.background = `${item.color}08`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: item.color }} />
                    <span style={{ fontWeight: 700, color: item.color }}>{item.event}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: "var(--sr-text-muted)", fontSize: 13 }}>{item.period}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnomaliaSSTCard />

      <div className="sr-info-banner">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <NavIcon name="info" size={20} />
          <span>ENSO é um fenômeno natural do Pacífico Equatorial. No Sentinela-RS ele é contexto climático, não alerta local.</span>
        </div>
      </div>

      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
