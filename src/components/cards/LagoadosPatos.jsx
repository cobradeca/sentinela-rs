export const MOCK_LAGOA = [];

function Sparkline({ values, color = "#2563eb" }) {
  const safeValues = Array.isArray(values) ? values.filter((value) => Number.isFinite(value)) : [];
  if (safeValues.length < 2) return <span className="sr-lagoa-empty-note">sem historico suficiente</span>;

  const width = 96;
  const height = 28;
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const points = safeValues
    .map((value, index) => {
      const x = (index / (safeValues.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sr-mod-spark" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatMeters(value) {
  return Number.isFinite(value) ? `${value.toFixed(2).replace(".", ",")} m` : "—";
}

function formatTrend(value) {
  if (!Number.isFinite(value)) return "sem historico suficiente";
  if (Math.abs(value) < 0.005) return "estavel";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(0)} cm`;
}

function trendClass(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return "is-muted";
  return value > 0 ? "sr-var-up" : "sr-var-down";
}

function stationRank(row) {
  const level = Number(row?.nivelM);
  const trend = Number(row?.variacaoM);
  const historySize = Array.isArray(row?.historico) ? row.historico.length : 0;
  const levelRank = Number.isFinite(level) ? level : 0;
  const trendRank = Number.isFinite(trend) && trend > 0 ? trend : 0;
  const historyRank = historySize >= 2 ? 0.25 : 0;
  return levelRank + trendRank + historyRank;
}

function isCritical(row) {
  const level = Number(row?.nivelM);
  return Number.isFinite(level) && level >= 0.8;
}

export function LagoadosPatos({ className = "", data = [], loading = false, error = null, onRetry }) {
  if (loading) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-skeleton h-5 w-1-3" />
        <div className="sr-mod-skeleton h-12 w-full mt-3" />
        <div className="sr-mod-skeleton h-40 w-full mt-4" />
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

  const rows = Array.isArray(data) ? data.filter(Boolean) : [];
  if (!rows.length) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <header className="sr-mod-header">
          <div>
            <div className="sr-mod-title"><span>~</span> Lagoa dos Patos</div>
            <div className="sr-mod-subtitle">Sem leitura real disponivel.</div>
          </div>
          <span className="sr-source-pill is-muted">sem dados</span>
        </header>
        <div className="sr-lagoa-empty-state">
          <strong>Aguarde a sincronizacao das estacoes monitoradas.</strong>
          <span>O painel nao inventa niveis, tendencias ou historicos.</span>
        </div>
      </section>
    );
  }

  const currentCount = rows.filter((row) => Number.isFinite(row?.nivelM)).length;
  const criticalRows = [...rows]
    .sort((a, b) => stationRank(b) - stationRank(a))
    .filter(isCritical)
    .slice(0, 3);
  const visibleRows = criticalRows.length ? criticalRows : [...rows].sort((a, b) => stationRank(b) - stationRank(a)).slice(0, 3);
  const maxLevel = rows.map((row) => Number(row?.nivelM)).filter(Number.isFinite);
  const status = rows.some((row) => Number(row?.nivelM) >= 1.2)
    ? "Alerta"
    : rows.some((row) => Number(row?.nivelM) >= 0.8)
      ? "Atencao"
      : "Normal";

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div>
          <div className="sr-mod-title"><span>~</span> Lagoa dos Patos</div>
          <div className="sr-mod-subtitle">Seis estacoes empilhadas com leitura atual, tendencia real e historico valido.</div>
        </div>
        <span className={`sr-source-pill status-${status.toLowerCase()}`}>{status}</span>
      </header>

      <div className="sr-lagoa-mini-grid">
        <div className="sr-lagoa-mini-card">
          <span>Estacoes com leitura</span>
          <strong>{currentCount}/{rows.length}</strong>
        </div>
        <div className="sr-lagoa-mini-card">
          <span>Maior nivel atual</span>
          <strong>{maxLevel.length ? formatMeters(Math.max(...maxLevel)) : "—"}</strong>
        </div>
        <div className="sr-lagoa-mini-card">
          <span>Historico valido</span>
          <strong>{rows.some((row) => Array.isArray(row?.historico) && row.historico.length >= 2) ? "7 dias" : "Sem historico suficiente"}</strong>
        </div>
      </div>

      <div className="sr-lagoa-table sr-lagoa-table-compact">
        {visibleRows.map((row) => {
          const hasLevel = Number.isFinite(row?.nivelM);
          const history = Array.isArray(row?.historico) ? row.historico : [];
          const trend = Number.isFinite(row?.variacaoM)
            ? row.variacaoM
            : history.length >= 2
              ? history[history.length - 1] - history[history.length - 2]
              : null;
          return (
            <div key={row.id} className="sr-lagoa-row sr-lagoa-row-compact">
              <div>
                <strong>{row.nome}</strong>
                <span>{row.subEstacao || row.fonte || "Fonte real"}</span>
              </div>
              <strong>{formatMeters(row.nivelM)}</strong>
              <span className={trendClass(trend)}>{formatTrend(trend)}</span>
              <span className="sr-lagoa-spark-cell">
                <Sparkline values={history} />
              </span>
            </div>
          );
        })}
        {!visibleRows.length && <div className="sr-lagoa-empty-note">Sem estacoes criticas no momento.</div>}
      </div>
    </section>
  );
}

export default LagoadosPatos;
