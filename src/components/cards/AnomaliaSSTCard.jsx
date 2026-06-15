import { useMemo } from "react";

const LAYER = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies";
const BBOX = "-274.12120609364206,-64.49634753604705,6.969155970164678,73.28347692462675";

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

function worldviewUrl(currentIso, previousIso) {
  const tCurrent = `${currentIso}-T00:00:00Z`;
  const tPrevious = `${previousIso}-T00:00:00Z`;
  const params = new URLSearchParams({
    v: BBOX,
    l: `${LAYER},BlueMarble_NextGeneration`,
    lg: "true",
    l1: `${LAYER},BlueMarble_NextGeneration`,
    lg1: "true",
    ca: "true",
    cv: "51",
    t: tPrevious,
    t1: tCurrent,
    em: "true",
  });
  return `https://worldview.earthdata.nasa.gov/?${params.toString()}`;
}

export function AnomaliaSSTCard({ className = "" }) {
  const currentIso = useMemo(() => isoDate(dateMinusDays(2)), []);
  const previousIso = useMemo(() => {
    const d = dateMinusDays(2);
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    return isoDate(d);
  }, []);

  const src = useMemo(() => worldviewUrl(currentIso, previousIso), [currentIso, previousIso]);

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>🌡</span> ANOMALIA DE TSM (EL NIÑO)</div>
        <div className="sr-mod-badge">{formatBR(previousIso)} vs {formatBR(currentIso)}</div>
      </header>

      <div className="sr-sst-frame">
        <iframe
          src={src}
          title="NASA Worldview — Anomalias de Temperatura da Superfície do Mar (comparação A/B)"
          loading="lazy"
          allow="fullscreen"
          sandbox="allow-modals allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      <p className="sr-sst-explain">
        Comparação entre o mesmo período do ano anterior (A) e o período mais recente disponível (B).
        A faixa quente (laranja/vermelho) ao longo do Pacífico equatorial indica águas mais quentes que a
        média, característica de El Niño. Faixas frias (azul/roxo) indicam La Niña. Esta imagem é contexto
        global do ENSO, não dado local do RS. Arraste o controle central para comparar os dois períodos.
      </p>

      <footer className="sr-mod-footer">
        Imagem: NASA Worldview / Global Imagery Browse Services (GIBS) — Sea Surface Temperature Anomalies (GHRSST L4 MUR).
      </footer>
    </section>
  );
}

export default AnomaliaSSTCard;
