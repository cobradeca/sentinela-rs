import { NavIcon } from "../components/layout/NavIcons";

const phaseColors = {
  laNina: "#1d4ed8",
  neutral: "#94a3b8",
  elNino: "#dc2626",
};

const historicalEvents = [
  { event: "La Nina", period: "2020-2023", color: phaseColors.laNina },
  { event: "Neutro", period: "2018-2019", color: phaseColors.neutral },
  { event: "El Nino", period: "2015-2016", color: phaseColors.elNino },
  { event: "Neutro", period: "2013-2014", color: phaseColors.neutral },
  { event: "La Nina", period: "2010-2012", color: phaseColors.laNina },
];

function pct(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 100)}%` : "--";
}

function celsius(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(1)} °C` : "--";
}

function currentPhase(nino34) {
  if (typeof nino34 !== "number" || !Number.isFinite(nino34)) return { label: "Indisponivel", key: "neutral", description: "Sem leitura validada" };
  if (nino34 >= 0.5) return { label: "El Nino", key: "elNino", description: "Anomalia quente no Pacifico equatorial" };
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
  const clamped = typeof value === "number" ? Math.max(-2, Math.min(2, value)) : 0;
  const angle = -90 + ((clamped + 2) / 4) * 180;
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 8 }}>
      <div style={{ width: 260, height: 140, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: "0 0 auto", height: 260, borderRadius: "260px 260px 0 0", background: "linear-gradient(90deg,#1d4ed8,#dbeafe,#fef2f2,#dc2626)" }} />
        <div style={{ position: "absolute", left: 35, right: 35, top: 35, height: 190, borderRadius: "190px 190px 0 0", background: "#fff" }} />
        <div style={{ position: "absolute", left: "50%", bottom: 8, width: 4, height: 92, background: "#0c2d4a", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${angle}deg)` }} />
        <div style={{ position: "absolute", left: "50%", bottom: 0, width: 22, height: 22, borderRadius: "50%", background: "#dbeafe", transform: "translateX(-50%)", border: "4px solid #fff" }} />
      </div>
      <div style={{ fontSize: 34, fontWeight: 900, color: phaseColors[phase.key] }}>{celsius(value)}</div>
      <div style={{ color: "var(--sr-text-muted)", fontWeight: 700 }}>Condicao atual</div>
    </div>
  );
}

export function EnsoTab({ ctx }) {
  const {
    activeENSO,
    formatDateTimeBR,
    lastUpdate,
    safeEnsoForecast,
  } = ctx;

  const forecast = safeEnsoForecast(activeENSO.forecast);
  const phase = currentPhase(activeENSO.nino34);
  const firstForecast = forecast[0] || {};
  const fetchedAt = activeENSO.probabilityFetchedAt || activeENSO.observedFetchedAt || lastUpdate;

  return (
    <div style={{ display: "grid", gap: 16 }}>
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
          <div className="sr-btn-outline">
            Fonte: NOAA / CPC <NavIcon name="info" size={16} />
          </div>
        </div>
      </div>

      <div className="sr-card-v2" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr", gap: 0, padding: 0, overflow: "hidden" }}>
        {[
          ["Situacao atual", phase.label.toUpperCase(), phase.description],
          ["Indice Nino 3.4 (°C)", celsius(activeENSO.nino34), "NOAA/CPC observado"],
          ["Tendencia (proximos 3 meses)", trendText(forecast), "IRI/CCSR probabilistico"],
          ["Atualizacao dos dados", fetchedAt ? formatDateTimeBR(fetchedAt).split(",")[0] : "--", activeENSO.probabilityReferenceDate || "consulta atual"],
        ].map(([label, value, sub], index) => (
          <div key={label} style={{ padding: 22, borderLeft: index ? "1px solid var(--sr-border)" : "none" }}>
            <div className="sr-kpi-label">{label}</div>
            <div style={{ fontSize: index === 0 ? 26 : 24, fontWeight: 900, color: index === 0 ? phaseColors[phase.key] : "var(--sr-text)", marginTop: 8 }}>{value}</div>
            <div className="sr-kpi-sublabel">{sub}</div>
          </div>
        ))}
      </div>

      <div className="sr-grid-2">
        <div className="sr-card-v2">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <h3 className="sr-card-title">Probabilidade IRI/CCSR</h3>
              <div style={{ color: "var(--sr-text-muted)", fontSize: 13 }}>Curva derivada do endpoint de previsao trimestral</div>
            </div>
            <button type="button" className="sr-btn-outline">Ver tabela <NavIcon name="dashboard" size={14} /></button>
          </div>
          <MiniLine forecast={forecast} field="en" color={phaseColors.elNino} />
          <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>Fonte: IRI/CCSR ENSO Forecast.</div>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Indice Nino 3.4 (°C) - Atual</h3>
          <Gauge value={activeENSO.nino34} phase={phase} />
        </div>
      </div>

      <div className="sr-grid-2">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Probabilidade por trimestre</h3>
          <table className="sr-data-table">
            <thead>
              <tr>
                <th>Trimestre</th>
                <th>El Nino</th>
                <th>Neutro</th>
                <th>La Nina</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((item, index) => (
                <tr key={`${item.p}-${index}`}>
                  <td><strong>{item.p || "--"}</strong></td>
                  <td style={{ color: phaseColors.elNino, fontWeight: 800 }}>{pct(item.en)}</td>
                  <td style={{ color: "#64748b", fontWeight: 800 }}>{pct(item.nu)}</td>
                  <td style={{ color: phaseColors.laNina, fontWeight: 800 }}>{pct(item.ln)}</td>
                </tr>
              ))}
              {!forecast.length && (
                <tr><td colSpan="4">Sem previsao probabilistica validada no momento.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Classificacao dos indices</h3>
          {[
            ["El Nino", ">= +0.5 °C", phaseColors.elNino],
            ["Neutro", "-0.5 °C a +0.5 °C", "#64748b"],
            ["La Nina", "<= -0.5 °C", phaseColors.laNina],
          ].map(([label, range, color]) => (
            <div key={label} style={{ padding: 14, borderRadius: 10, background: `${color}12`, color, fontWeight: 800, marginBottom: 10 }}>
              {label}<br /><span style={{ color: "var(--sr-text)", fontWeight: 700 }}>{range}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>Anomalia da TSM na regiao Nino 3.4.</div>
        </div>
      </div>

      <div className="sr-grid-3">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Regiao Nino 3.4</h3>
          <div style={{ height: 180, borderRadius: 12, background: "linear-gradient(180deg,#bfdbfe,#eff6ff)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: "24%", right: "18%", top: "45%", height: 34, border: "2px solid #ef4444", background: "rgba(239,68,68,0.08)", display: "grid", placeItems: "center", color: "#ef4444", fontWeight: 800 }}>Nino 3.4</div>
          </div>
          <p style={{ color: "var(--sr-text-muted)", fontSize: 13 }}>Area monitorada no Pacifico Equatorial: 5°N-5°S, 170°W-120°W.</p>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Impactos historicos no RS</h3>
          {[
            ["La Nina", "Maior chance de chuva abaixo da media no RS", phaseColors.laNina],
            ["Neutro", "Comportamento mais proximo da normalidade", "#64748b"],
            ["El Nino", "Maior chance de chuva acima da media no RS", phaseColors.elNino],
          ].map(([label, text, color]) => (
            <div key={label} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--sr-border)" }}>
              <span className="sr-status-dot" style={{ background: color, marginTop: 6 }} />
              <div><strong style={{ color }}>{label}</strong><div style={{ color: "var(--sr-text-muted)", fontSize: 13 }}>{text}</div></div>
            </div>
          ))}
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
