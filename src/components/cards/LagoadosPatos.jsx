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

function pickHighlight(rows, highlightStationId) {
  return (
    rows.find((row) => row.id === highlightStationId) ||
    rows.find((row) => row.id === "lagoa_patos_pelotas") ||
    rows[0] ||
    null
  );
}

export function LagoadosPatos({ className = "", data = [], loading = false, error = null, onRetry, highlightStationId = "lagoa_patos_pelotas" }) {
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
          <div className="sr-mod-title"><span>~</span> Lagoa dos Patos</div>
          <span className="sr-source-pill is-muted">sem dados</span>
        </header>
        <div className="sr-lagoa-empty-state">
          <strong>Sem leitura real disponivel.</strong>
          <span>Aguarde a sincronizacao das estacoes monitoradas.</span>
        </div>
      </section>
    );
  }

  const highlight = pickHighlight(rows, highlightStationId);
  const highlightTrend = highlight?.historico?.length >= 2
    ? highlight.historico[highlight.historico.length - 1] - highlight.historico[highlight.historico.length - 2]
    : null;
  const highlightHistory = Array.isArray(highlight?.historico) ? highlight.historico : [];
  const currentCount = rows.filter((row) => Number.isFinite(row?.nivelM)).length;
  const criticalRows = [...rows]
    .sort((a, b) => stationRank(b) - stationRank(a))
    .filter((row) => row.id !== highlight?.id && isCritical(row))
    .slice(0, 3);
  const fallbackRows = criticalRows.length ? criticalRows : [...rows]
    .filter((row) => row.id !== highlight?.id)
    .sort((a, b) => stationRank(b) - stationRank(a))
    .slice(0, 3);
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
          <div className="sr-mod-subtitle">Pelotas / Laranjal em destaque, sem mistura com dado falso.</div>
        </div>
        <span className={`sr-source-pill status-${status.toLowerCase()}`}>{status}</span>
      </header>

      <div className="sr-lagoa-feature">
        <div className="sr-lagoa-feature-main">
          <span className="sr-lagoa-feature-kicker">Leitura em destaque</span>
          <strong>{highlight?.nome || "Pelotas / Laranjal"}</strong>
          <div className="sr-lagoa-feature-value">{formatMeters(highlight?.nivelM)}</div>
          <div className="sr-lagoa-feature-meta">
            <span>{highlight?.subEstacao || highlight?.fonte || "Fonte real"}</span>
            <span>{highlight?.hora ? `Atualizado ${highlight.hora}` : "Sem horario informado"}</span>
          </div>
        </div>
        <div className="sr-lagoa-feature-side">
          <span className="sr-lagoa-feature-kicker">Tendencia 24h</span>
          <strong className={trendClass(highlightTrend)}>{formatTrend(highlightTrend)}</strong>
          <Sparkline values={highlightHistory} />
          <span className="sr-lagoa-feature-hint">
            {highlightHistory.length >= 2 ? "Historico real de 7 dias" : "Sem historico suficiente"}
          </span>
        </div>
      </div>

      <div className="sr-lagoa-mini-grid">
        <div className="sr-lagoa-mini-card">
          <span>Estacoes com leitura</span>
          <strong>{currentCount}/{rows.length}</strong>
        </div>
        <div className="sr-lagoa-mini-card">
          <span>Maior nivel atual</span>
          <strong>{formatMeters(Math.max(...rows.map((row) => Number(row?.nivelM)).filter(Number.isFinite)))}</strong>
        </div>
        <div className="sr-lagoa-mini-card">
          <span>Historico valido</span>
          <strong>{highlightHistory.length >= 2 ? "7 dias" : "Sem historico suficiente"}</strong>
        </div>
      </div>

      <div className="sr-lagoa-table sr-lagoa-table-compact">
        {fallbackRows.length ? fallbackRows.map((row) => (
          <div key={row.id} className="sr-lagoa-row sr-lagoa-row-compact">
            <div>
              <strong>{row.nome}</strong>
              <span>{row.subEstacao || row.fonte || "Fonte real"}</span>
            </div>
            <strong>{formatMeters(row.nivelM)}</strong>
            <span className={trendClass(row.variacaoM)}>{formatTrend(row.variacaoM)}</span>
          </div>
        )) : (
          <div className="sr-lagoa-empty-note">Sem estacoes criticas no momento.</div>
        )}
      </div>
    </section>
  );
}

export default LagoadosPatos;
