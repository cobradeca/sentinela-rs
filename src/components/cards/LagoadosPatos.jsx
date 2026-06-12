export const MOCK_LAGOA = [
  { id: "lagoa_patos_poa", nome: "Itapua", subEstacao: "Norte da Lagoa", nivelM: 0.41, variacaoM: -0.03, historico: [0.46, 0.45, 0.44, 0.43, 0.43, 0.42, 0.41], hora: "07:30", fonte: "Monitoramento" },
  { id: "lagoa_patos_pelotas", nome: "Pelotas / Laranjal", subEstacao: "HidroSens", nivelM: 0.32, variacaoM: -0.02, historico: [0.36, 0.35, 0.35, 0.34, 0.33, 0.33, 0.32], hora: "07:20", fonte: "HIDROSENS" },
  { id: "lagoa_rio_grande", nome: "Rio Grande", subEstacao: "Barra", nivelM: 0.18, variacaoM: 0.04, historico: [0.12, 0.13, 0.14, 0.16, 0.17, 0.17, 0.18], hora: "07:10", fonte: "Monitoramento" },
  { id: "lagoa_sao_lourenco", nome: "Sao Lourenco do Sul", subEstacao: "Barrinha", nivelM: 0.55, variacaoM: -0.05, historico: [0.62, 0.61, 0.6, 0.59, 0.58, 0.56, 0.55], hora: "07:15", fonte: "Monitoramento" },
  { id: "lagoa_patos_arambare", nome: "Arambare", subEstacao: "Centro", nivelM: 0.48, variacaoM: 0, historico: [0.47, 0.48, 0.48, 0.49, 0.48, 0.48, 0.48], hora: "07:35", fonte: "Monitoramento" },
  { id: "lagoa_sao_jose_norte", nome: "Sao Jose do Norte", subEstacao: "Margem leste", nivelM: 0.37, variacaoM: -0.01, historico: [0.39, 0.39, 0.38, 0.38, 0.37, 0.37, 0.37], hora: "07:25", fonte: "Monitoramento" },
];

function Sparkline({ values, color = "#3b82f6" }) {
  const safeValues = values?.filter(Number.isFinite) || [];
  if (safeValues.length < 2) return <span style={{ color: "var(--sr-text-muted)" }}>—</span>;
  const width = 82;
  const height = 28;
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const points = safeValues.map((value, index) => {
    const x = (index / (safeValues.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sr-mod-spark" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function trendLabel(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.005) return "estavel";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(0)} cm`;
}

function trendClass(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return "";
  return value > 0 ? "sr-var-up" : "sr-var-down";
}

function stationRank(row) {
  const level = Number(row?.nivelM);
  const variation = Number(row?.variacaoM);
  return (Number.isFinite(level) ? level : 0) + Math.max(0, Number.isFinite(variation) ? variation : 0);
}

export function LagoadosPatos({ className = "", data = MOCK_LAGOA, loading = false, error = null, onRetry, highlightStationId = "lagoa_patos_pelotas" }) {
  if (loading) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-skeleton h-5 w-1-3" />
        <div className="sr-mod-skeleton h-36 w-full mt-4" />
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

  const rows = Array.isArray(data) && data.length ? data : MOCK_LAGOA;
  const highlight = rows.find((row) => row.id === highlightStationId) || rows[0];
  const topRows = [...rows]
    .filter((row) => row.id !== highlight?.id)
    .sort((a, b) => stationRank(b) - stationRank(a))
    .slice(0, 3);
  const status = rows.some((row) => row.nivelM >= 1.2) ? "Alerta" : rows.some((row) => row.nivelM >= 0.8) ? "Atencao" : "Normal";

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>≋</span> Lagoa dos Patos</div>
        <span className="sr-source-pill">{status}</span>
      </header>

      <div className="sr-panorama-block" style={{ marginBottom: 12 }}>
        <span>{highlight.nome}</span>
        <strong>{highlight.nivelM.toFixed(2).replace(".", ",")} m</strong>
        <small>{highlight.subEstacao} • {highlight.fonte}</small>
        <em className={trendClass(highlight.variacaoM)}>{trendLabel(highlight.variacaoM)}</em>
        <Sparkline values={highlight.historico} />
      </div>

      <div className="sr-lagoa-table">
        {topRows.map((row) => (
          <div key={row.id} className="sr-lagoa-row sr-lagoa-row-compact">
            <div><strong>{row.nome}</strong><span>{row.fonte}</span></div>
            <strong>{row.nivelM.toFixed(2).replace(".", ",")} m</strong>
            <span className={trendClass(row.variacaoM)}>{trendLabel(row.variacaoM)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default LagoadosPatos;
