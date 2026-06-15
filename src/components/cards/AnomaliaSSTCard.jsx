import { useMemo } from "react";

function toUtcDateString(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(base, days) {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function initialDates() {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const recent = addUtcDays(base, -2);
  const priorYear = addUtcDays(recent, -365);
  return { recent, priorYear };
}

function buildWorldviewUrl({ recent, priorYear }) {
  const current = toUtcDateString(recent);
  const previous = toUtcDateString(priorYear);
  const layer = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies";
  return [
    "https://worldview.earthdata.nasa.gov/",
    "?p=geographic",
    `l=${encodeURIComponent(layer)}`,
    `t=${encodeURIComponent(previous)}`,
    `l1=${encodeURIComponent(layer)}`,
    `t1=${encodeURIComponent(current)}`,
    "ca=true",
    "cm=swipe",
    "cv=50",
    "a=true",
    "b=true",
  ].join("&");
}

export function AnomaliaSSTCard({ className = "" }) {
  const dates = useMemo(() => initialDates(), []);
  const worldviewUrl = useMemo(() => buildWorldviewUrl(dates), [dates]);

  return (
    <section className={`sr-mod-card sr-sst-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>🌊</span> Anomalia de TSM <span>• El Niño</span></div>
        <div className="sr-mod-badge">NASA Worldview • B = {toUtcDateString(dates.recent)}</div>
      </header>

      <div className="sr-sst-body">
        <div className="sr-sst-frame">
          <iframe
            className="sr-sst-iframe"
            title="NASA Worldview - anomalia de temperatura da superfície do mar"
            src={worldviewUrl}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-modals allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>

        <div className="sr-sst-copy">
          O painel compara o período mais recente disponível com o mesmo período do ano anterior. A faixa quente ao longo do Pacífico equatorial indica águas mais quentes que a média, características de El Niño. Faixas frias indicam La Niña.
        </div>

        <div className="sr-sst-legend">
          {[
            { label: "Frio intenso", color: "#1e3a8a" },
            { label: "Frio", color: "#60a5fa" },
            { label: "Neutro", color: "#94a3b8" },
            { label: "Quente", color: "#f59e0b" },
            { label: "Muito quente", color: "#dc2626" },
          ].map((item) => (
            <div key={item.label} className="sr-sst-legend-item" style={{ "--sst-color": item.color }}>
              {item.label}
            </div>
          ))}
        </div>

        <div className="sr-sst-credit">
          Imagem: NASA Global Imagery Browse Services (GIBS) — Sea Surface Temperature Anomalies (GHRSST L4 MUR).
        </div>
      </div>
    </section>
  );
}

export default AnomaliaSSTCard;
