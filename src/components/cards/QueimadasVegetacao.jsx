export const MOCK_QUEIMADAS = {
  focos24h: 0,
  ndviMedio: 0.64,
  historico7dias: [0.58, 0.6, 0.57, 0.63, 0.61, 0.66, 0.64],
};

function Sparkline({ values }) {
  const width = 110;
  const height = 42;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return <svg viewBox={`0 0 ${width} ${height}`} className="sr-mod-spark"><polyline points={points} fill="none" stroke="#84cc16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ndviColor(value) {
  if (value < 0.3) return "#f87171";
  if (value < 0.5) return "#facc15";
  return "#84cc16";
}

export function QueimadasVegetacao({ className = "", data = MOCK_QUEIMADAS, loading = false, error = null, onRetry }) {
  if (loading) return <section className={`sr-mod-card ${className}`}><div className="sr-mod-skeleton h-40 w-full" /></section>;
  if (error) return <section className={`sr-mod-card ${className}`}><div className="sr-mod-error"><span>{error}</span>{onRetry && <button type="button" onClick={onRetry}>Tentar novamente</button>}</div></section>;

  const trend = data.historico7dias.at(-1) >= data.historico7dias[0] ? "↑ melhora" : "↓ piora";
  const color = ndviColor(data.ndviMedio);

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header"><div className="sr-mod-title"><span>🔥</span> QUEIMADAS E VEGETAÇÃO</div></header>
      <div className="sr-veg-grid">
        <div><span>Focos de calor (24h)</span><strong>{data.focos24h || "Sem foco"}</strong><small>Focos detectados • Fonte INPE</small></div>
        <div><span>NDVI médio RS</span><strong style={{ color }}>{data.ndviMedio.toFixed(2)}</strong><div className="sr-ndvi-bar"><i style={{ width: `${data.ndviMedio * 100}%`, background: color }} /></div></div>
        <div><span>Tendência (7 dias)</span><Sparkline values={data.historico7dias} /><small>{trend}</small></div>
      </div>
    </section>
  );
}

export default QueimadasVegetacao;
