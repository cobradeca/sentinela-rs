import { useMemo, useState } from "react";

const LAYER = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies";
const ZOOM = 2;

// Grade 4×2 cobrindo o Pacífico equatorial completo + Américas.
// Coordenadas extraídas do print: lon ~145°E → ~33°W, lat ~47°S → ~37°N.
// Cruza o antimeridiano: ordem de coluna é x=2, x=3, x=0, x=1.
const TILES = [
  { x: 2, y: 1, col: 0, row: 0 }, // Pacífico W norte  (0→90E,  0→67N)
  { x: 3, y: 1, col: 1, row: 0 }, // Pacífico CW norte (90→180E, 0→67N)
  { x: 0, y: 1, col: 2, row: 0 }, // Pacífico CE norte (-180→-90, 0→67N)
  { x: 1, y: 1, col: 3, row: 0 }, // Américas norte    (-90→0,  0→67N)
  { x: 2, y: 2, col: 0, row: 1 }, // Pacífico W sul    (0→90E, -67→0)
  { x: 3, y: 2, col: 1, row: 1 }, // Pacífico CW sul   (90→180E,-67→0)
  { x: 0, y: 2, col: 2, row: 1 }, // Pacífico CE sul   (-180→-90,-67→0)
  { x: 1, y: 2, col: 3, row: 1 }, // Américas sul      (-90→0, -67→0)
];

const MAX_LOOKBACK_DAYS = 14;
const MAX_RETRIES = 5;

const GRADIENT = "linear-gradient(to right,#6b00db,#7400d6,#7f00d3,#8900cf,#9600ca,#9109cc,#7f1ad1,#6031dc,#414be6,#2264f1,#087cfb,#0094ff,#00aeff,#00caff,#00e3ff,#03f8fa,#18fce5,#2fffce,#47ffb6,#60ff9e,#76ff8c,#88ff84,#97ff8b,#a4ff91,#b1ff98,#bdfe9e,#bff4a3,#bfe8a9,#bfdbb0,#bfd0b6,#c2cab8,#cacab7,#d5d5ac,#e2e2a2,#eded98,#f9f88d,#fff679,#ffea5e,#ffde43,#ffd025,#ffc209,#ffb601,#ffaa00,#ff9d00,#ff9100,#ff8200,#ff7100,#ff5900,#ff3d00,#ff2100,#fe0900,#f90113,#f3002d,#ec004a,#e60067,#de007d,#d30085,#bf0068,#ab0048,#9a002c,#88000f,#800000)";

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateMinusDays(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function formatBR(iso) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

// GIBS WMTS URL: nível de zoom, depois row (y) depois col (x)
function tileUrl(iso, x, y) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${LAYER}/default/${iso}/GoogleMapsCompatible_Level${ZOOM}/${y}/${x}.png`;
}

export function AnomaliaSSTCard({ className = "" }) {
  const [offset, setOffset] = useState(0);
  const [retries, setRetries] = useState(0);
  const [failed, setFailed] = useState(false);

  const selectedDate = useMemo(() => isoDate(dateMinusDays(2 + offset)), [offset]);

  const handleSliderChange = (e) => {
    setOffset(Number(e.target.value));
    setRetries(0);
    setFailed(false);
  };

  const handleImgError = () => {
    if (retries < MAX_RETRIES && offset + 1 <= MAX_LOOKBACK_DAYS) {
      setRetries((r) => r + 1);
      setOffset((o) => o + 1);
    } else {
      setFailed(true);
    }
  };

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>🌡</span> ANOMALIA DE TSM (EL NIÑO)</div>
        <div className="sr-mod-badge">{formatBR(selectedDate)}</div>
      </header>

      <div className="sr-sst-mosaic">
        {failed ? (
          <div className="sr-sst-error">
            <span>Imagem indisponível para o período selecionado.</span>
          </div>
        ) : (
          TILES.map(({ x, y, col, row }) => (
            <img
              key={`${selectedDate}-${x}-${y}`}
              src={tileUrl(selectedDate, x, y)}
              alt=""
              onError={handleImgError}
              style={{ gridColumn: col + 1, gridRow: row + 1 }}
            />
          ))
        )}
      </div>

      <div className="sr-sst-slider">
        <input
          type="range"
          min={0}
          max={MAX_LOOKBACK_DAYS}
          step={1}
          value={offset}
          onChange={handleSliderChange}
          aria-label="Selecionar data da imagem de anomalia de TSM"
        />
        <div className="sr-sst-slider-labels">
          <span>Hoje - {2 + offset} dia(s)</span>
          <span>Hoje - {2 + MAX_LOOKBACK_DAYS} dias</span>
        </div>
      </div>

      <div className="sr-sst-legend">
        <div className="sr-sst-legend-bar" style={{ background: GRADIENT }} />
        <div className="sr-sst-legend-labels">
          <span>-3 °C</span><span>0 °C</span><span>+3 °C</span>
        </div>
      </div>

      <p className="sr-sst-explain">
        A faixa quente (laranja/vermelho) ao longo do Pacífico equatorial indica
        águas mais quentes que a média — característica de El Niño. Faixas frias
        (azul/roxo) indicam La Niña. Cobertura: ~145°E até ~33°W, incluindo
        todo o Pacífico tropical. Contexto global do ENSO, não dado local do RS.
      </p>

      <footer className="sr-mod-footer">
        Imagem: NASA Global Imagery Browse Services (GIBS) — Sea Surface
        Temperature Anomalies (GHRSST L4 MUR).
      </footer>
    </section>
  );
}

export default AnomaliaSSTCard;
