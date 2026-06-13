import { useMemo } from "react";

export const MOCK_ENSO = {
  oni: 0.1,
  condicao: "Neutro",
  probIRI: 60,
  probCCSR: 55,
  atualizadoEm: "Mai/2025",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angle = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function arcPath(startAngle, endAngle, r = 86) {
  const start = polarToCartesian(110, 110, r, endAngle);
  const end = polarToCartesian(110, 110, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function phaseFromOni(oni) {
  if (oni <= -1.5) return "Super La Niña";
  if (oni <= -0.5) return "La Niña";
  if (oni < 0.5) return "Neutro";
  if (oni < 1.5) return "El Niño";
  return "Super El Niño";
}

export function ENSOCard({ className = "", data = MOCK_ENSO, loading = false, error = null, onRetry }) {
  const oni = Number(data?.oni ?? 0);
  const angle = useMemo(() => (clamp(oni, -2, 2) + 2) * 45, [oni]);
  const condicao = data?.condicao || phaseFromOni(oni);

  if (loading) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-skeleton h-5 w-1-2" />
        <div className="sr-mod-skeleton h-44 w-full mt-4" />
      </section>
    );
  }

  if (error) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-error">
          <span>{error}</span>
          {onRetry && <button type="button" onClick={onRetry}>Tentar novamente</button>}
        </div>
      </section>
    );
  }

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>🌐</span> ENSO <span>• Contexto climático ⓘ</span></div>
      </header>

      <div className="sr-enso-gauge-wrap">
        <svg viewBox="0 0 220 132" className="sr-enso-gauge" aria-label={`Condição ENSO ${condicao}`}>
          <path d={arcPath(0, 36)} stroke="#1e3a8a" />
          <path d={arcPath(36, 72)} stroke="#60a5fa" />
          <path d={arcPath(72, 108)} stroke="#94a3b8" />
          <path d={arcPath(108, 144)} stroke="#fb923c" />
          <path d={arcPath(144, 180)} stroke="#7f1d1d" />
          <text x="14" y="116" className="sr-enso-label">Super La Niña</text>
          <text x="60" y="100" className="sr-enso-label">La Niña</text>
          <text x="110" y="76" className="sr-enso-label">Neutro</text>
          <text x="158" y="100" className="sr-enso-label">El Niño</text>
          <text x="206" y="116" className="sr-enso-label" textAnchor="end">Super El Niño</text>
          <g className="sr-enso-needle" style={{ transform: `rotate(${angle - 90}deg)` }}>
            <line x1="110" y1="110" x2="110" y2="42" />
          </g>
          <circle cx="110" cy="110" r="8" className="sr-enso-pin" />
        </svg>
        <div className="sr-enso-current">
          <small>Condição atual</small>
          <strong>{condicao}</strong>
          <span>ONI {oni >= 0 ? "+" : ""}{oni.toFixed(1)} °C</span>
        </div>
      </div>

      <div className="sr-enso-probs">
        <span>Probabilidade (%)</span>
        <strong>IRI: {data.probIRI}%</strong>
        <strong>CCSR: {data.probCCSR}%</strong>
      </div>

      <footer className="sr-mod-footer">Atualizado: {data.atualizadoEm} • Fonte: IRI / Columbia</footer>
    </section>
  );
}

export default ENSOCard;
