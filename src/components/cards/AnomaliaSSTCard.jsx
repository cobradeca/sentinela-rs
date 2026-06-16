import { useMemo, useState } from "react";

const LAYER = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies";
const MAX_LOOKBACK_DAYS = 14;
const MAX_RETRIES = 5;

const GHRSST_GRADIENT = "linear-gradient(to right, #6b00db, #7400d6, #7f00d3, #8900cf, #9600ca, #9109cc, #7f1ad1, #6031dc, #414be6, #2264f1, #087cfb, #0094ff, #00aeff, #00caff, #00e3ff, #03f8fa, #18fce5, #2fffce, #47ffb6, #60ff9e, #76ff8c, #88ff84, #97ff8b, #a4ff91, #b1ff98, #bdfe9e, #bff4a3, #bfe8a9, #bfdbb0, #bfd0b6, #c2cab8, #cacab7, #d5d5ac, #e2e2a2, #eded98, #f9f88d, #fff679, #ffea5e, #ffde43, #ffd025, #ffc209, #ffb601, #ffaa00, #ff9d00, #ff9100, #ff8200, #ff7100, #ff5900, #ff3d00, #ff2100, #fe0900, #f90113, #f3002d, #ec004a, #e60067, #de007d, #d30085, #bf0068, #ab0048, #9a002c, #88000f, #800000)";

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateMinusDays(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function formatBR(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

// Tile estático servido por gibs.earthdata.nasa.gov (servidor de tiles, sem
// restrição de embed via <img>, diferente de worldview.earthdata.nasa.gov).
function tileUrl(iso) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${LAYER}/default/${iso}/GoogleMapsCompatible_Level7/2/1/1.png`;
}

export function AnomaliaSSTCard({ className = "" }) {
  const baseDate = useMemo(() => dateMinusDays(2), []);
  const [offset, setOffset] = useState(0);
  const [retries, setRetries] = useState(0);
  const [failed, setFailed] = useState(false);

  const selectedDate = useMemo(() => {
    const d = dateMinusDays(2 + offset);
    return isoDate(d);
  }, [offset]);

  const handleSliderChange = (event) => {
    setOffset(Number(event.target.value));
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

      <div className="sr-sst-map">
        {!failed ? (
          <img
            key={selectedDate}
            src={tileUrl(selectedDate)}
            alt={`Anomalia de temperatura da superfície do mar em ${formatBR(selectedDate)}`}
            onError={handleImgError}
            className="sr-sst-img"
          />
        ) : (
          <div className="sr-mod-error">
            <span>Imagem indisponível para o período selecionado.</span>
          </div>
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
        <div className="sr-sst-legend-bar" style={{ background: GHRSST_GRADIENT }} />
        <div className="sr-sst-legend-labels">
          <span>-3 °C</span>
          <span>0 °C</span>
          <span>+3 °C</span>
        </div>
      </div>

      <p className="sr-sst-explain">
        A faixa quente (laranja/vermelho) ao longo do Pacífico equatorial indica águas mais quentes que a
        média — característica de El Niño. Faixas frias (azul/roxo) indicam La Niña. Esta imagem é contexto
        global do ENSO, não dado local do RS.
      </p>

      <footer className="sr-mod-footer">
        Imagem: NASA Global Imagery Browse Services (GIBS) — Sea Surface Temperature Anomalies (GHRSST L4 MUR).
      </footer>
    </section>
  );
}

export default AnomaliaSSTCard;
