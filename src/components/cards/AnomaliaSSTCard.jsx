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
  const imageUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_SST_Anomalies/default/${selectedDateIso}/GoogleMapsCompatible_Level7/2/1/1.png`;

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
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>🌊</span> Anomalia de TSM <span>• El Niño</span></div>
        <div className="sr-mod-badge">NASA GIBS • {selectedDateIso}</div>
      </header>

      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--sr-border)", background: "#0f172a" }}>
          {!failed ? (
            <img
              src={imageUrl}
              alt={`Anomalias de temperatura da superficie do mar em ${selectedDateIso}`}
              style={{ width: "100%", display: "block", aspectRatio: "16 / 9", objectFit: "cover" }}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <div style={{ aspectRatio: "16 / 9", display: "grid", placeItems: "center", color: "#bfdbfe", padding: 16, textAlign: "center" }}>
              Imagem indisponível para o período selecionado.
            </div>
          )}
        </div>

        <label style={{ display: "grid", gap: 8, fontSize: 13, color: "var(--sr-text-muted)" }}>
          <span>Voltar até 14 dias</span>
          <input
            type="range"
            min="0"
            max={MAX_SLIDER_DAYS}
            value={offsetDays}
            onChange={handleSlider}
            style={{ width: "100%" }}
          />
        </label>

        <div style={{ color: "var(--sr-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
          A faixa quente (laranja/vermelho) ao longo do Pacífico equatorial indica águas mais quentes que a média, características de El Niño. Faixas frias (azul) indicam La Niña.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          {[
            { label: "Frio", color: "#1d4ed8" },
            { label: "Levemente frio", color: "#60a5fa" },
            { label: "Neutro", color: "#94a3b8" },
            { label: "Quente", color: "#f59e0b" },
            { label: "Muito quente", color: "#dc2626" },
          ].map((item) => (
            <div key={item.label} style={{ borderRadius: 10, background: `${item.color}14`, border: `1px solid ${item.color}33`, padding: "10px 12px", color: item.color, fontWeight: 700, fontSize: 12 }}>
              {item.label}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "var(--sr-text-muted)", lineHeight: 1.5 }}>
          Imagem: NASA Global Imagery Browse Services (GIBS) — Sea Surface Temperature Anomalies (GHRSST L4 MUR).
        </div>
      </div>
    </section>
  );
}

export default AnomaliaSSTCard;
