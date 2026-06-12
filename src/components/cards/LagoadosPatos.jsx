export const MOCK_LAGOA = [
  { id: "poa", nome: "Porto Alegre", subEstacao: "Cais Mauá", nivelM: 0.41, variacaoM: -0.03, historico: [0.46, 0.45, 0.44, 0.43, 0.43, 0.42, 0.41], hora: "07:30", fonte: "CPRM" },
  { id: "pelotas", nome: "Pelotas", subEstacao: "Barra do Laranjal", nivelM: 0.32, variacaoM: -0.02, historico: [0.36, 0.35, 0.35, 0.34, 0.33, 0.33, 0.32], hora: "07:20", fonte: "CPRM" },
  { id: "riogrande", nome: "Rio Grande", subEstacao: "Porto Velho", nivelM: 0.18, variacaoM: 0.04, historico: [0.12, 0.13, 0.14, 0.16, 0.17, 0.17, 0.18], hora: "07:10", fonte: "CPRM" },
  { id: "saolourenco", nome: "São Lourenço do Sul", subEstacao: "Barrinha", nivelM: 0.55, variacaoM: -0.05, historico: [0.62, 0.61, 0.6, 0.59, 0.58, 0.56, 0.55], hora: "07:15", fonte: "CPRM" },
  { id: "arambare", nome: "Arambaré", subEstacao: "Centro", nivelM: 0.48, variacaoM: 0.0, historico: [0.47, 0.48, 0.48, 0.49, 0.48, 0.48, 0.48], hora: "07:35", fonte: "CPRM" },
  { id: "mostardas", nome: "Mostardas", subEstacao: "Litoral", nivelM: 0.37, variacaoM: -0.01, historico: [0.39, 0.39, 0.38, 0.38, 0.37, 0.37, 0.37], hora: "07:25", fonte: "CPRM" },
];

function Sparkline({ values, color = "#3b82f6" }) {
  const width = 82;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sr-mod-spark" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function levelColor(row) {
  if (row.variacaoM > 0.03) return "#f87171";
  if (Math.abs(row.variacaoM) <= 0.01) return "#facc15";
  return "#4ade80";
}

export function LagoadosPatos({ className = "", data = MOCK_LAGOA, loading = false, error = null, onRetry }) {
  if (loading) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-skeleton h-5 w-1-3" />
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="sr-mod-skeleton h-12 w-full mt-3" />)}
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
        <div className="sr-mod-title"><span>≋</span> LAGOA DOS PATOS</div>
        <div className="sr-mod-badge">Níveis em metros (m) • Referência: DHN/CPRM ↗</div>
      </header>
      <div className="sr-lagoa-table">
        {data.map((row) => {
          const positive = row.variacaoM > 0;
          const stable = Math.abs(row.variacaoM) <= 0.005;
          return (
            <div key={row.id} className="sr-lagoa-row">
              <div><strong>{row.nome}</strong><span>{row.subEstacao}</span></div>
              <strong style={{ color: levelColor(row) }}>{row.nivelM.toFixed(2).replace(".", ",")} m</strong>
              <span className={positive ? "sr-var-up" : "sr-var-down"}>{stable ? "→" : positive ? "↑" : "↓"} {Math.abs(row.variacaoM).toFixed(2).replace(".", ",")}</span>
              <Sparkline values={row.historico} />
              <span>{row.hora}</span>
              <span className="sr-source-pill">{row.fonte}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default LagoadosPatos;
