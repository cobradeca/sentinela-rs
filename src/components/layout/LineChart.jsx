import { useId } from "react";

function buildSmoothPath(xs, ys) {
  if (xs.length < 2) return "";
  let d = `M ${xs[0]},${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = i === 0 ? xs[0] : xs[i - 1];
    const y0 = i === 0 ? ys[0] : ys[i - 1];
    const x1 = xs[i];
    const y1 = ys[i];
    const x2 = xs[i + 1];
    const y2 = ys[i + 1];
    const x3 = i + 2 < xs.length ? xs[i + 2] : x2;
    const y3 = i + 2 < xs.length ? ys[i + 2] : y2;

    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
  }
  return d;
}

export function LineChart({ points, width = 320, height = 120, color = "#1a6fd4", referenceY = null, dashed = false, label = "" }) {
  const gradientId = useId();

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
  const baselineY = 12 + chartH;

  const xs = points.map((_, i) => padX + (i / (points.length - 1)) * chartW);
  const ys = points.map((p) => 12 + chartH - ((p.v - yMin) / range) * chartH);
  const linePath = buildSmoothPath(xs, ys);
  const areaPath = `${linePath} L ${xs[xs.length - 1]},${baselineY} L ${xs[0]},${baselineY} Z`;
  const refY = referenceY !== null ? 12 + chartH - ((referenceY - yMin) / range) * chartH : null;

  return (
    <div className="sr-line-chart">
      {label && <div className="sr-chart-label">{label}</div>}
      <svg width="100%" height="auto" viewBox={`0 0 ${width} ${height}`} style={{ display: "block", maxWidth: width }}>
        <defs>
          <linearGradient id={`sr-area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {refY !== null && (
          <line x1={padX} y1={refY} x2={width - padX} y2={refY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        )}
        <path d={areaPath} fill={`url(#sr-area-${gradientId})`} stroke="none" />
        <path
          d={linePath}
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
