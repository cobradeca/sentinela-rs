export const MOCK_QUEIMADAS = {
  focos24h: 0,
  ndviMedio: 0.64,
  historico7dias: [0.58, 0.6, 0.57, 0.63, 0.61, 0.66, 0.64],
};

function Sparkline({ values = [] }) {
  if (!Array.isArray(values) || values.length < 2) {
    return <div className="sr-veg-empty">sem historico suficiente</div>;
  }

  const width = 110;
  const height = 42;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sr-mod-spark">
      <polyline points={points} fill="none" stroke="#84cc16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ndviColor(value) {
  if (!Number.isFinite(value)) return "#94a3b8";
  if (value < 0.3) return "#f87171";
  if (value < 0.5) return "#facc15";
  return "#84cc16";
}

function normalizeQueimadasData(data = {}) {
  const ndviMean = Number.isFinite(data.ndvi_mean)
    ? data.ndvi_mean
    : Number.isFinite(data.ndviMedio)
      ? data.ndviMedio
      : null;

  const history = Array.isArray(data.historico7dias)
    ? data.historico7dias.map((value) => Number(value)).filter(Number.isFinite)
    : Array.isArray(data.history)
      ? data.history.map((value) => Number(value)).filter(Number.isFinite)
      : [];

  return {
    focos24h: Number.isFinite(data.focos24h)
      ? data.focos24h
      : Number.isFinite(data.focos_24h)
        ? data.focos_24h
        : Number.isFinite(data.count)
          ? data.count
          : 0,
    ndviMedio: ndviMean,
    historico7dias: history,
    vegetationPercent: Number.isFinite(data.vegetation_percent) ? data.vegetation_percent : null,
    lowVegetationPercent: Number.isFinite(data.low_vegetation_percent) ? data.low_vegetation_percent : null,
    validCoveragePercent: Number.isFinite(data.valid_coverage_percent) ? data.valid_coverage_percent : null,
    period: data.period || null,
    source: data.source || null,
    method: data.method || null,
    limitation: data.limitation || null,
    status: data.status || null,
    aoi: data.aoi || data.area || null,
  };
}

export function QueimadasVegetacao({ className = "", data = MOCK_QUEIMADAS, loading = false, error = null, onRetry }) {
  if (loading) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-skeleton h-40 w-full" />
      </section>
    );
  }

  if (error) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-error">
          <span>{error}</span>
          {onRetry && (
            <button type="button" onClick={onRetry}>
              Tentar novamente
            </button>
          )}
        </div>
      </section>
    );
  }

  const normalized = normalizeQueimadasData(data);
  const trend = normalized.historico7dias.length >= 2
    ? (normalized.historico7dias.at(-1) >= normalized.historico7dias[0] ? "↑ melhora" : "↓ piora")
    : "sem historico suficiente";
  const color = ndviColor(normalized.ndviMedio);
  const ndviLabel = Number.isFinite(normalized.ndviMedio) ? normalized.ndviMedio.toFixed(2) : "—";
  const statusText = normalized.status || (Number.isFinite(normalized.ndviMedio) ? "ativo" : "sem leitura");
  const focoLabel = Number.isFinite(normalized.focos24h) && normalized.focos24h > 0 ? normalized.focos24h : "Sem foco";

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title">
          <span>🔥</span> QUEIMADAS E VEGETAÇÃO
        </div>
        <div className="sr-mod-badge">{statusText}</div>
      </header>

      <div className="sr-veg-grid">
        <div>
          <span>Focos de calor (24h)</span>
          <strong>{focoLabel}</strong>
          <small>Focos detectados • Fonte INPE</small>
        </div>

        <div>
          <span>NDVI médio RS</span>
          <strong style={{ color }}>{ndviLabel}</strong>
          <div className="sr-ndvi-bar">
            <i style={{ width: `${Math.max(0, Math.min(100, (normalized.ndviMedio ?? 0) * 100))}%`, background: color }} />
          </div>
          <small>{normalized.vegetationPercent != null ? `${normalized.vegetationPercent}% vegetação saudável` : normalized.method || "Contexto Copernicus"}</small>
        </div>

        <div>
          <span>Tendência / série</span>
          <Sparkline values={normalized.historico7dias} />
          <small>{trend}</small>
        </div>
      </div>
    </section>
  );
}

export default QueimadasVegetacao;
