import { NavIcon } from "../components/layout/NavIcons";

const phaseColors = {
  superLaNina: "#1e40af",
  laNina: "#2563eb",
  neutral: "#94a3b8",
  elNino: "#dc2626",
  superElNino: "#991b1b",
};

const historicalEvents = [
  { event: "La Nina", period: "2020-2023", color: phaseColors.laNina },
  { event: "Neutro", period: "2018-2019", color: phaseColors.neutral },
  { event: "El Nino", period: "2015-2016", color: phaseColors.elNino },
  { event: "Neutro", period: "2013-2014", color: phaseColors.neutral },
  { event: "La Nina", period: "2010-2012", color: phaseColors.laNina },
];

const NOAA_PROB_IMAGE = "https://www.cpc.ncep.noaa.gov/archives/enso/roni/images/2026/enso-probs-current.png";

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
  if (nino34 >= 1.5) return { label: "Super El Nino", key: "superElNino", description: "Anomalia muito quente no Pacifico equatorial" };
  if (nino34 >= 0.5) return { label: "El Nino", key: "elNino", description: "Anomalia quente no Pacifico equatorial" };
  if (nino34 <= -1.5) return { label: "Super La Nina", key: "superLaNina", description: "Anomalia muito fria no Pacifico equatorial" };
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
          <text x={x} y={h - 6} textAnchor="middle" fontSize="10" fill="#64748b">{(forecast[index]?.p || "").replace(" ", "\n")}</text>
        </g>
      ))}
    </svg>
  );
}

function Gauge({ value, phase }) {
  const clamped = typeof value === "number" ? Math.max(-2.5, Math.min(2.5, value)) : 0;
  const angle = -90 + ((clamped + 2.5) / 5) * 180;
  const bands = [
    { label: "Super La Nina", color: phaseColors.superLaNina },
    { label: "La Nina", color: phaseColors.laNina },
    { label: "Neutro", color: phaseColors.neutral },
    { label: "El Nino", color: phaseColors.elNino },
    { label: "Super El Nino", color: phaseColors.superElNino },
  ];

  return (
    <div className="sr-enso-gauge-wrap">
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, marginBottom: 16 }}>
          {bands.map((band) => (
            <div
              key={band.label}
              style={{
                height: 42,
                borderRadius: 12,
                background: band.color,
                opacity: band.label === phase.label ? 1 : 0.48,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: "6px 8px",
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1.15,
                boxShadow: band.label === phase.label ? "0 10px 18px rgba(12,45,74,0.16)" : "none",
              }}
            >
              {band.label}
            </div>
          ))}
        </div>
        <div style={{ width: 320, height: 180, margin: "0 auto", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "0 0 auto", height: 320, borderRadius: "320px 320px 0 0", background: "linear-gradient(90deg,#1e40af,#2563eb,#cbd5e1,#dc2626,#991b1b)" }} />
          <div style={{ position: "absolute", left: 28, right: 28, top: 28, height: 250, borderRadius: "250px 250px 0 0", background: "var(--sr-card)" }} />
          <div style={{ position: "absolute", left: "50%", bottom: 16, width: 4, height: 118, background: "#0c2d4a", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${angle}deg)` }} />
          <div style={{ position: "absolute", left: "50%", bottom: 8, width: 24, height: 24, borderRadius: "50%", background: "#dbeafe", transform: "translateX(-50%)", border: "4px solid #fff" }} />
        </div>
      </div>
      <div className="sr-enso-current">
        <small>Condição atual</small>
        <strong>{phase.label.toUpperCase()}</strong>
        <span>{celsius(value)}</span>
      </div>
    </div>
  );
}

export function EnsoTab({ ctx }) {
  const { activeENSO, formatDateTimeBR, lastUpdate, safeEnsoForecast } = ctx;

  const forecast = safeEnsoForecast(activeENSO.forecast);
  const phase = currentPhase(activeENSO.nino34);
  const fetchedAt = activeENSO.probabilityFetchedAt || activeENSO.observedFetchedAt || lastUpdate;
  const observedReady = typeof activeENSO.nino34 === "number" && Number.isFinite(activeENSO.nino34);
  const probReady = forecast.length > 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="sr-card-v2" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#dbeafe,#60a5fa)", display: "grid", placeItems: "center", color: "#1d4ed8" }}>
              <NavIcon name="waves" size={34} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 34, color: "var(--sr-text)" }}>ENSO</h1>
              <div style={{ color: "var(--sr-text-muted)", fontSize: 16 }}>El Nino-Oscilacao Sul</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--sr-text-muted)", fontSize: 13 }}>
              <NavIcon name="clock" size={16} />
              <span>Ultima atualizacao:<br />{fetchedAt ? formatDateTimeBR(fetchedAt) : "--"}</span>
            </div>
            <div className="sr-btn-outline">Fonte: NOAA / CPC <NavIcon name="info" size={16} /></div>
          </div>
        </div>

        <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            ["Situacao atual", phase.label.toUpperCase(), phase.description],
            ["Indice Nino 3.4 (°C)", celsius(activeENSO.nino34), observedReady ? "NOAA/CPC observado" : "Sem leitura validada"],
            ["Tendencia (3 meses)", trendText(forecast), probReady ? "IRI/CCSR probabilistico" : "Sem curva validada"],
            ["Dados da probabilidade", fetchedAt ? formatDateTimeBR(fetchedAt).split(",")[0] : "--", activeENSO.probabilityReferenceDate || "consulta atual"],
          ].map(([label, value, sub]) => (
            <div key={label} className="sr-card-v2" style={{ margin: 0, padding: 18, borderRadius: 8 }}>
              <div className="sr-kpi-label">{label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: label === "Situacao atual" ? phaseColors[phase.key] : "var(--sr-text)", marginTop: 8 }}>{value}</div>
              <div className="sr-kpi-sublabel">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sr-card-v2">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 className="sr-card-title">Indice Nino 3.4 (°C)</h3>
            <div style={{ color: "var(--sr-text-muted)", fontSize: 13 }}>Probabilidade IRI/CCSR e classificacao oficial em um unico bloco</div>
          </div>
          <div style={{ color: "var(--sr-text-muted)", fontSize: 12 }}>Fonte: NOAA / CPC + IRI / CCSR</div>
        </div>
        <div className="sr-grid-2" style={{ marginTop: 10 }}>
          <div>
            <MiniLine forecast={forecast} field="en" color={phaseColors.elNino} />
            <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>Curva derivada do endpoint de previsao trimestral.</div>
          </div>
          <div>
            <Gauge value={activeENSO.nino34} phase={phase} />
          </div>
        </div>
        <div style={{ color: "var(--sr-text-muted)", fontSize: 12, marginTop: 14 }}>A classificação já aparece no velocímetro acima; abaixo fica apenas o resumo do trimestre.</div>
      </div>

      <div className="sr-grid-2">
        <div className="sr-card-v2">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <div>
              <h3 className="sr-card-title" style={{ marginBottom: 4 }}>Probabilidade por trimestre</h3>
              <div style={{ color: "var(--sr-text-muted)", fontSize: 12 }}>Os dados ja aparecem na curva e no resumo.</div>
            </div>
          </div>
          <table className="sr-data-table">
            <thead>
              <tr>
                <th>Trimestre</th>
                <th>La Nina</th>
                <th>Neutro</th>
                <th>El Nino</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((item, index) => (
                <tr key={`${item.p}-${index}`}>
                  <td><strong>{item.p || "--"}</strong></td>
                  <td style={{ color: phaseColors.laNina, fontWeight: 800 }}>{pct(item.ln)}</td>
                  <td style={{ color: "#64748b", fontWeight: 800 }}>{pct(item.nu)}</td>
                  <td style={{ color: phaseColors.elNino, fontWeight: 800 }}>{pct(item.en)}</td>
                </tr>
              ))}
              {!forecast.length && (
                <tr><td colSpan="4">Sem previsao probabilistica validada no momento.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Regiao Nino 3.4</h3>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--sr-border)", background: "#fff" }}>
            <img
              src={NOAA_PROB_IMAGE}
              alt="Imagem oficial NOAA CPC com probabilidades ENSO"
              style={{ display: "block", width: "100%", height: "auto" }}
              onError={(event) => {
                event.currentTarget.src = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/images/2026/enso-probs-current.png";
              }}
            />
          </div>
          <p style={{ color: "var(--sr-text-muted)", fontSize: 13 }}>Fonte oficial NOAA CPC. Probabilidades por trimestre com consulta atual.</p>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Ultimos eventos</h3>
          {historicalEvents.map((item) => (
            <div key={`${item.event}-${item.period}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--sr-border)" }}>
              <span><span className="sr-status-dot" style={{ background: item.color }} /> {item.event}</span>
              <strong>{item.period}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="sr-info-banner">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <NavIcon name="info" size={20} />
          <span>ENSO e um fenomeno natural do Pacifico Equatorial. No Sentinela-RS ele e contexto climatico, nao alerta local.</span>
        </div>
      </div>
    </div>
  );
}
