import { useMemo, useRef, useState } from "react";

// Nome correto da camada (confirmado via gitc.earthdata.nasa.gov)
const LAYER = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies_v4.1_STD";
const ZOOM = 2;
const MAX_LOOKBACK_DAYS = 14;

// Grade 4×2 cruzando o antimeridiano: lon ~145°E→33°W, lat ~67°S→67°N
// Ordem de colunas: x=2(0→90E), x=3(90→180E), x=0(-180→-90), x=1(-90→0)
const TILES = [
  { x: 2, y: 1, col: 1, row: 1 },
  { x: 3, y: 1, col: 2, row: 1 },
  { x: 0, y: 1, col: 3, row: 1 },
  { x: 1, y: 1, col: 4, row: 1 },
  { x: 2, y: 2, col: 1, row: 2 },
  { x: 3, y: 2, col: 2, row: 2 },
  { x: 0, y: 2, col: 3, row: 2 },
  { x: 1, y: 2, col: 4, row: 2 },
];

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

function tileUrl(iso, x, y) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${LAYER}/default/${iso}/GoogleMapsCompatible_Level${ZOOM}/${y}/${x}.png`;
}

export function AnomaliaSSTCard({ className = "" }) {
  const [offset, setOffset] = useState(0);
  const [failed, setFailed] = useState(false);
  // Controle de fallback por data — não por tile individual
  const fallbackRef = useRef({ offset: 0, attempts: 0 });

  const selectedDate = useMemo(() => isoDate(dateMinusDays(2 + offset)), [offset]);

  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setOffset(val);
    setFailed(false);
    fallbackRef.current = { offset: val, attempts: 0 };
  };

  // Um tile falhando dispara tentativa na próxima data —
  // mas só uma vez por "rodada" de datas, usando ref como guard.
  const handleImgError = () => {
    const ref = fallbackRef.current;
    if (ref.attempts >= 1) return; // já agendou fallback para essa data
    ref.attempts += 1;

    const nextOffset = ref.offset + 1;
    if (nextOffset <= MAX_LOOKBACK_DAYS) {
      fallbackRef.current = { offset: nextOffset, attempts: 0 };
      setOffset(nextOffset);
      setFailed(false);
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
              style={{ gridColumn: col, gridRow: row }}
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
          aria-label="Selecionar data"
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
        Temperature Anomalies (GHRSST L4 MUR v4.1 STD).
      </footer>
    </section>
  );
}

export default AnomaliaSSTCard;
