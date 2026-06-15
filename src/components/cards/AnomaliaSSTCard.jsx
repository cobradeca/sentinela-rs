import { useState, useMemo, useCallback } from "react";

// Região Niño 3.4: 5°N-5°S, 170°W-120°W
// GIBS WMS usa CRS:84 (lon,lat) — bbox: minLon,minLat,maxLon,maxLat
const BBOX_NINO34 = "-170,-5,-120,5";
const LAYER = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies";
const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const DAYS_BACK = 14;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function dateMinusDays(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function formatBR(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(d);
}

// Gera URL da imagem WMS do GIBS para uma data específica
function gibsUrl(isoDate) {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: LAYER,
    CRS: "CRS:84",
    BBOX: BBOX_NINO34,
    WIDTH: "800",
    HEIGHT: "267",
    FORMAT: "image/png",
    TRANSPARENT: "false",
    TIME: isoDate,
  });
  return `${GIBS_WMS}?${params}`;
}

// URL do Worldview recortado na região certa para abrir externamente
function worldviewUrl(isoDate) {
  return `https://worldview.earthdata.nasa.gov/?v=-170,-5,-120,5&l=${LAYER}&t=${isoDate}-T00:00:00Z`;
}

export function AnomaliaSSTCard({ className = "" }) {
  // slider: 0 = hoje-14d, DAYS_BACK = hoje-2d (dados mais recentes do GIBS)
  const [offset, setOffset] = useState(DAYS_BACK);

  const dates = useMemo(() =>
    Array.from({ length: DAYS_BACK + 1 }, (_, i) => isoDate(dateMinusDays(DAYS_BACK - i + 2)))
  , []);

  const currentIso = dates[offset] || dates[dates.length - 1];
  const imgUrl = useMemo(() => gibsUrl(currentIso), [currentIso]);

  const handleSlider = useCallback((e) => setOffset(Number(e.target.value)), []);

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>🌡</span> Anomalia de TSM <span>• El Niño</span></div>
        <span className="sr-mod-badge">NASA GIBS • {currentIso}</span>
      </header>

      <div className="sr-sst-img-wrap">
        <img
          key={imgUrl}
          src={imgUrl}
          alt={`Anomalia TSM Pacífico equatorial ${currentIso}`}
          className="sr-sst-img"
          onError={(e) => { e.currentTarget.src = ""; e.currentTarget.alt = "Imagem indisponível para esta data."; }}
        />
      </div>

      <div className="sr-sst-slider-wrap">
        <span>{formatBR(dates[0])}</span>
        <input
          type="range"
          min={0}
          max={DAYS_BACK}
          step={1}
          value={offset}
          onChange={handleSlider}
          className="sr-sst-slider"
          aria-label="Selecionar data da imagem"
        />
        <span>{formatBR(dates[DAYS_BACK])}</span>
      </div>
      <div className="sr-sst-date-label">Voltar até {DAYS_BACK} dias</div>

      <p className="sr-sst-explain">
        A faixa quente (laranja/vermelho) ao longo do Pacífico equatorial indica águas mais quentes que a média, características de El Niño. Faixas frias (azul) indicam La Niña.
      </p>

      <div style={{ display: "flex", gap: 4 }}>
        {["Frio intenso","Frio","Neutro","Quente","Muito quente"].map((label, i) => {
          const colors = ["#3b0764","#1d4ed8","#e5e7eb","#f97316","#7f1d1d"];
          const text = i < 2 ? "#fff" : i === 2 ? "#111" : "#fff";
          return (
            <div key={label} style={{ flex: 1, background: colors[i], color: text, fontSize: 11, fontWeight: 700, textAlign: "center", padding: "6px 4px", borderRadius: 6 }}>
              {label}
            </div>
          );
        })}
      </div>

      <footer className="sr-mod-footer">
        Imagem: NASA Global Imagery Browse Services (GIBS) — Sea Surface Temperature Anomalies (GHRSST L4 MUR).
        <a href={worldviewUrl(currentIso)} target="_blank" rel="noreferrer" className="sr-btn-link" style={{ marginLeft: 8 }}>
          Ver no Worldview ↗
        </a>
      </footer>
    </section>
  );
}

export default AnomaliaSSTCard;
