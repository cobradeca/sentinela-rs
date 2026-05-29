export function Sparkline({ points, color, t, sourceLabel }) {
  if (!points || points.length < 2) {
    return <div style={{ fontSize: 8, color: t.textFaint }}>sem histórico</div>;
  }

  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 0.01;
  const W = 180;
  const H = 36;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - ((p.v - min) / range) * H);
  const lastV = points[points.length - 1].v;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 8, color: t.textMuted, marginBottom: 3 }}>
        HISTÓRICO ~24h ({points.length} leituras){sourceLabel ? ` · ${sourceLabel}` : ""}
      </div>
      <svg width={W} height={H + 4} style={{ display: "block" }}>
        <polyline
          points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.85"
        />
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={color} />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7, color: t.textFaint, marginTop: 2 }}>
        <span>mín {min.toFixed(2)}m</span>
        <span style={{ color }}>{lastV.toFixed(2)}m agora</span>
        <span>máx {max.toFixed(2)}m</span>
      </div>
    </div>
  );
}
