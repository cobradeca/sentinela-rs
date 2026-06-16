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

export function EnsoTab({ ctx }) {
  const { activeENSO, formatDateTimeBR, lastUpdate, safeEnsoForecast } = ctx;

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
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#dbeafe,#60a5fa)", display: "grid", placeItems: "center", color: "#1d4ed8" }}>
              <NavIcon name="waves" size={34} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 34, color: "var(--sr-text)" }}>ENSO</h1>
              <div style={{ color: "var(--sr-text-muted)", fontSize: 16 }}>El Niño-Oscilação Sul</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--sr-text-muted)", fontSize: 13 }}>
              <NavIcon name="clock" size={16} />
              <span>Última atualização:<br />{fetchedAt ? formatDateTimeBR(fetchedAt) : "--"}</span>
            </div>
            <div className="sr-btn-outline">Fonte: NOAA / CPC <NavIcon name="info" size={16} /></div>
          </div>
        </div>

        <div className="sr-kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            ["Índice Niño 3.4 (°C)", celsius(activeENSO.nino34), observedReady ? "NOAA/CPC observado" : "Sem leitura validada", phase.key],
            ["Tendência (3 meses)", trendText(forecast), probReady ? "IRI/CCSR probabilístico" : "Sem curva validada", null],
            ["Atualização", fetchedAt ? formatDateTimeBR(fetchedAt).split(",")[0] : "--", "dados oficiais", null],
          ].map(([label, value, sub, colorKey]) => (
            <div key={label} className="sr-card-v2" style={{ margin: 0, padding: 18, borderRadius: 8 }}>
              <div className="sr-kpi-label">{label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: colorKey ? phaseColors[colorKey] : "var(--sr-text)", marginTop: 8 }}>{value}</div>
              <div className="sr-kpi-sublabel">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sr-card-v2">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h3 className="sr-card-title">Previsão 12 meses</h3>
            <div style={{ color: "var(--sr-text-muted)", fontSize: 13 }}>Probabilidade IRI/CCSR para próximos trimestres</div>
          </div>
        </div>
        {probReady ? (
          <>
            <MiniLine forecast={forecast} field="en" color={phaseColors.elNino} />
            <div style={{ marginTop: 12, padding: "12px 14px", background: "#f0f9ff", borderRadius: 8, borderLeft: "3px solid #1d4ed8" }}>
              <div style={{ fontSize: 12, color: "#0c2d4a", fontWeight: 700 }}>Próximo trimestre: <span style={{ color: phaseColors[forecast[0]?.en > 0.5 ? "elNino" : forecast[0]?.en < -0.5 ? "laNina" : "neutral"] }}>
                {forecast[0]?.en > 0.5 ? "El Niño" : forecast[0]?.en < -0.5 ? "La Niña" : "Neutro"} ({pct(Math.max(forecast[0]?.en, forecast[0]?.nu, forecast[0]?.ln))})
              </span></div>
            </div>
          </>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--sr-text-muted)" }}>Sem previsão probabilística validada no momento.</div>
        )}
        <div style={{ fontSize: 12, color: "var(--sr-text-muted)", marginTop: 12 }}>Fonte: IRI/CCSR ENSO Forecast.</div>
      </div>

      

<div className="sr-grid-3">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Região Niño 3.4 — Monitoramento real</h3>
          <div style={{ borderRadius: 12, overflow: "hidden", background: "#0c2d4a" }}>
            <img
              src="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/lanina/sstanim.gif"
              alt="Anomalia de TSM no Pacífico Equatorial (NOAA CPC)"
              style={{ width: "100%", display: "block" }}
              onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
            />
            <div style={{ display: "none", height: 180, alignItems: "center", justifyContent: "center", color: "#bfdbfe", fontSize: 13, textAlign: "center", padding: 16 }}>
              Imagem indisponível no momento — ver fonte oficial abaixo.
            </div>
          </div>
          <p style={{ color: "var(--sr-text-muted)", fontSize: 13 }}>
            Área monitorada no Pacífico Equatorial: 5°N-5°S, 170°W-120°W. Fonte: NOAA CPC (atualização periódica).
          </p>
          <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/lanina/enso_evolution-status-fcsts-web.pdf" target="_blank" rel="noreferrer" className="sr-btn-outline" style={{ display: "inline-flex", textDecoration: "none" }}>
            Ver boletim oficial NOAA <NavIcon name="arrow" size={14} />
          </a>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Impactos históricos no RS</h3>
          {[
            ["La Niña", "Maior chance de chuvas abaixo da média no RS", phaseColors.laNina],
            ["Neutro", "Comportamento mais próximo da normalidade", "#64748b"],
            ["El Niño", "Maior chance de chuvas acima da média no RS", phaseColors.elNino],
          ].map(([label, text, color]) => (
            <div key={label} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--sr-border)" }}>
              <span className="sr-status-dot" style={{ background: color, marginTop: 6 }} />
              <div><strong style={{ color }}>{label}</strong><div style={{ color: "var(--sr-text-muted)", fontSize: 13 }}>{text}</div></div>
            </div>
          ))}
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Últimos eventos</h3>
          {historicalEvents.map((item) => (
            <div key={`${item.event}-${item.period}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--sr-border)" }}>
              <span><span className="sr-status-dot" style={{ background: item.color }} /> {item.event}</span>
              <strong>{item.period}</strong>
            </div>
          ))}
        </div>
      </div>

      <AnomaliaSSTCard />

      <div className="sr-info-banner">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <NavIcon name="info" size={20} />
          <span>ENSO é um fenômeno natural do Pacífico Equatorial. No Sentinela-RS ele é contexto climático, não alerta local.</span>
        </div>
      </div>
    </div>
  );
}
