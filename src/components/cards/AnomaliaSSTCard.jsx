import { useMemo, useState } from "react";

function toUtcDateString(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(base, days) {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function initialDate() {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return addUtcDays(base, -2);
}

const MAX_SLIDER_DAYS = 14;
const MAX_FALLBACKS = 5;

export function AnomaliaSSTCard({ className = "" }) {
  const baseDate = useMemo(() => initialDate(), []);
  const [offsetDays, setOffsetDays] = useState(0);
  const [fallbacks, setFallbacks] = useState(0);
  const [failed, setFailed] = useState(false);

  const selectedDate = useMemo(() => addUtcDays(baseDate, -offsetDays), [baseDate, offsetDays]);
  const selectedDateIso = toUtcDateString(selectedDate);
  const imageUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies/default/${selectedDateIso}/GoogleMapsCompatible_Level7/2/1/1.png`;

  const handleError = () => {
    if (fallbacks < MAX_FALLBACKS && offsetDays < MAX_SLIDER_DAYS) {
      setFallbacks((prev) => prev + 1);
      setOffsetDays((prev) => Math.min(MAX_SLIDER_DAYS, prev + 1));
      setFailed(false);
      return;
    }
    setFailed(true);
  };

  const handleLoad = () => {
    setFailed(false);
    setFallbacks(0);
  };

  const handleSlider = (event) => {
    setOffsetDays(Number(event.target.value));
    setFallbacks(0);
    setFailed(false);
  };

  return (
    <section className={`sr-mod-card sr-sst-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>🌊</span> Anomalia de TSM <span>• El Niño</span></div>
        <div className="sr-mod-badge">NASA GIBS • {selectedDateIso}</div>
      </header>

      <div className="sr-sst-body">
        <div className="sr-sst-frame">
          {!failed ? (
            <img
              className="sr-sst-image"
              src={imageUrl}
              alt={`Anomalias de temperatura da superficie do mar em ${selectedDateIso}`}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <div className="sr-sst-error">Imagem indisponível para o período selecionado.</div>
          )}
        </div>

        <label className="sr-sst-slider">
          <span>Voltar até 14 dias</span>
          <input
            type="range"
            min="0"
            max={MAX_SLIDER_DAYS}
            value={offsetDays}
            onChange={handleSlider}
          />
        </label>

        <div className="sr-sst-copy">
          A faixa quente (laranja/vermelho) ao longo do Pacífico equatorial indica águas mais quentes que a média, características de El Niño. Faixas frias (azul) indicam La Niña.
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
