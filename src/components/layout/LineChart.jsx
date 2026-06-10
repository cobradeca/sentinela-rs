export function LineChart({ points, width = 320, height = 120, color = "#1a6fd4", referenceY = null, dashed = false, label = "" }) {
  if (!points || points.length < 2) {
    return <div className="sr-chart-empty">Sem dados suficientes para o gráfico</div>;
  }

  const vals = points.map((p) => p.v);
  const min = Math.min(...vals, referenceY ?? Infinity);
  const max = Math.max(...vals, referenceY ?? -Infinity);
  const pad = (max - min) * 0.12 || 0.05;
  const yMin = min - pad;
  const yMax = max + pad;
  const range = yMax - yMin || 0.01;
  const padX = 24;
  const chartW = width - padX * 2;
  const chartH = height - 28;

  const xs = points.map((_, i) => padX + (i / (points.length - 1)) * chartW);
  const ys = points.map((p) => 12 + chartH - ((p.v - yMin) / range) * chartH);
  const poly = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const refY = referenceY !== null ? 12 + chartH - ((referenceY - yMin) / range) * chartH : null;

  return (
    <div className="sr-line-chart">
      {label && <div className="sr-chart-label">{label}</div>}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {refY !== null && (
          <line x1={padX} y1={refY} x2={width - padX} y2={refY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        )}
        <polyline
          points={poly}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={dashed ? "6 4" : undefined}
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="4" fill={color} />
            <text x={xs[i]} y={ys[i] - 8} textAnchor="middle" fontSize="9" fill="#64748b">
              {p.v.toFixed(2).replace(".", ",")}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
