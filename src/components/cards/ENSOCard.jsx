import { useMemo } from "react";
import { NavIcon } from "../layout/NavIcons";

export const MOCK_ENSO = {
  oni: 0.1,
  condicao: "Neutro",
  probIRI: 60,
  probCCSR: 55,
  atualizadoEm: "Mai/2025",
};

function phaseFromOni(oni) {
  if (oni <= -1.5) return "Super La Niña";
  if (oni <= -0.5) return "La Niña";
  if (oni < 0.5) return "Neutro";
  if (oni < 1.5) return "El Niño";
  return "Super El Niño";
}

// Converte ONI (-2 a +2) para ângulo da agulha (-90° a +90° a partir do centro do semicírculo)
// O SVG original tem agulha apontando para cima = 0°, girando -90 (esq) a +90 (dir)
// Converte ONI (-2 a +2) para ângulo da agulha do SVG.
// A agulha (polígono) tem orientação base apontando ~38° para o lado El Niño
// (em relação ao topo do mostrador). Subtraímos esse offset para que oni=0
// (Neutro) deixe a agulha apontando para o topo (label NEUTRO).
const NEEDLE_BASE_OFFSET_DEG = 38;

function oniToAngle(oni) {
  const clamped = Math.max(-2, Math.min(2, oni));
  return (clamped / 2) * 90 - NEEDLE_BASE_OFFSET_DEG; // -90 a +90 graus, ajustado pelo offset da agulha
}

export function ENSOCard({ className = "", data = MOCK_ENSO, loading = false, error = null, onRetry, onNavigate }) {
  const oni = Number(data?.oni ?? 0);
  const angle = useMemo(() => oniToAngle(oni), [oni]);
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

  // Agulha: pivô em (800,800) do viewBox original 1600x1000, apontando para cima
  // Reduzimos o viewBox para mostrar só a parte útil (gauge) — crop do SVG original
  const needlePoints = "764.54,772.30 1138.61,366.59 835.46,827.70";

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>🌐</span> ENSO <span>• Contexto climático ⓘ</span></div>
      </header>

      <div className="sr-enso-gauge-wrap">
        <svg
          viewBox="100 130 1400 720"
          className="sr-enso-gauge"
          aria-label={`Condição ENSO ${condicao}`}
          style={{ width: "100%", maxWidth: 420, display: "block", margin: "0 auto" }}
        >
          <defs>
            <filter id="enso-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000000" floodOpacity="0.28"/>
            </filter>
            <linearGradient id="enso-needleGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5B6168"/>
              <stop offset="55%" stopColor="#25292E"/>
              <stop offset="100%" stopColor="#0D0F12"/>
            </linearGradient>
            <linearGradient id="enso-g0" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0A2F8F"/>
              <stop offset="100%" stopColor="#48B9F2"/>
            </linearGradient>
            <linearGradient id="enso-g1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#48B9F2"/>
              <stop offset="100%" stopColor="#D9DDE2"/>
            </linearGradient>
            <linearGradient id="enso-g2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#D9DDE2"/>
              <stop offset="100%" stopColor="#F59A23"/>
            </linearGradient>
            <linearGradient id="enso-g3" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F59A23"/>
              <stop offset="100%" stopColor="#E31B23"/>
            </linearGradient>
            <linearGradient id="enso-g4" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E31B23"/>
              <stop offset="100%" stopColor="#8B0000"/>
            </linearGradient>
          </defs>

          {/* Arcos */}
          <path d="M 150.00,800.00 A 650,650 0 0 1 274.14,417.94 L 484.48,570.76 A 390,390 0 0 0 410.00,800.00 Z" fill="url(#enso-g0)"/>
          <path d="M 274.14,417.94 A 650,650 0 0 1 599.14,181.81 L 679.48,429.09 A 390,390 0 0 0 484.48,570.76 Z" fill="url(#enso-g1)"/>
          <path d="M 599.14,181.81 A 650,650 0 0 1 1000.86,181.81 L 920.52,429.09 A 390,390 0 0 0 679.48,429.09 Z" fill="url(#enso-g2)"/>
          <path d="M 1000.86,181.81 A 650,650 0 0 1 1325.86,417.94 L 1115.52,570.76 A 390,390 0 0 0 920.52,429.09 Z" fill="url(#enso-g3)"/>
          <path d="M 1325.86,417.94 A 650,650 0 0 1 1450.00,800.00 L 1190.00,800.00 A 390,390 0 0 0 1115.52,570.76 Z" fill="url(#enso-g4)"/>

          {/* Divisórias */}
          <line x1="410.00" y1="800.00" x2="150.00" y2="800.00" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3"/>
          <line x1="484.48" y1="570.76" x2="274.14" y2="417.94" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3"/>
          <line x1="679.48" y1="429.09" x2="599.14" y2="181.81" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3"/>
          <line x1="920.52" y1="429.09" x2="1000.86" y2="181.81" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3"/>
          <line x1="1115.52" y1="570.76" x2="1325.86" y2="417.94" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3"/>
          <line x1="1190.00" y1="800.00" x2="1450.00" y2="800.00" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3"/>

          {/* Labels */}
          <text x="300.70" y="637.77" textAnchor="middle" dominantBaseline="middle" transform="rotate(-72.00 300.70 637.77)" fontFamily="Arial, Helvetica, sans-serif" fontSize="46" fontWeight="700" letterSpacing="1.5" fill="#FFFFFF">LA NIÑA FORTE</text>
          <text x="491.41" y="375.27" textAnchor="middle" dominantBaseline="middle" transform="rotate(-36.00 491.41 375.27)" fontFamily="Arial, Helvetica, sans-serif" fontSize="46" fontWeight="700" letterSpacing="1.5" fill="#FFFFFF">LA NIÑA</text>
          <text x="800.00" y="275.00" textAnchor="middle" dominantBaseline="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="46" fontWeight="700" letterSpacing="1.5" fill="var(--sr-text, #30343A)">NEUTRO</text>
          <text x="1108.59" y="375.27" textAnchor="middle" dominantBaseline="middle" transform="rotate(36.00 1108.59 375.27)" fontFamily="Arial, Helvetica, sans-serif" fontSize="46" fontWeight="700" letterSpacing="1.5" fill="#FFFFFF">EL NIÑO</text>
          <text x="1299.30" y="637.77" textAnchor="middle" dominantBaseline="middle" transform="rotate(72.00 1299.30 637.77)" fontFamily="Arial, Helvetica, sans-serif" fontSize="38" fontWeight="700" letterSpacing="1.5" fill="#FFFFFF">SUPER EL NIÑO</text>

          {/* Agulha — rotação em torno do pivô (800,800) */}
          <g filter="url(#enso-shadow)" transform={`rotate(${angle}, 800, 800)`}>
            <polygon points={needlePoints} fill="url(#enso-needleGrad)" stroke="#737A82" strokeWidth="4"/>
            <circle cx="800" cy="800" r="68" fill="#181B1F" stroke="#666C73" strokeWidth="8"/>
            <circle cx="800" cy="800" r="46" fill="#2A2E33" stroke="#0B0D0F" strokeWidth="5"/>
          </g>
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

      <footer className="sr-mod-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Atualizado: {data.atualizadoEm} • Fonte: IRI / Columbia</span>
        {onNavigate && (
          <button type="button" className="sr-btn-link" onClick={() => onNavigate("enso")}>
            Ver detalhes <NavIcon name="chevron" size={13} />
          </button>
        )}
      </footer>
    </section>
  );
}

export default ENSOCard;
