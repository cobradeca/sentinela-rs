import { NavIcon } from "../layout/NavIcons";

export const MOCK_LAGOA = [];

function Sparkline({ values, color = "#2563eb" }) {
  const width = 96;
  const height = 28;
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
    <svg viewBox={`0 0 ${width} ${height}`} className="sr-mod-spark" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatMeters(value) {
  return Number.isFinite(value) ? `${value.toFixed(2).replace(".", ",")} m` : "—";
}

function formatTrend(value) {
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) < 0.005) return "estavel";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(0)} cm`;
}

function trendClass(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return "is-muted";
  return value > 0 ? "sr-var-up" : "sr-var-down";
}

export function LagoadosPatos({ className = "", data = [], loading = false, error = null, onRetry, onNavigate }) {
  if (loading) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-skeleton h-5 w-1-3" />
        <div className="sr-mod-skeleton h-12 w-full mt-3" />
        <div className="sr-mod-skeleton h-12 w-full mt-2" />
        <div className="sr-mod-skeleton h-12 w-full mt-2" />
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

  const status = rows.some((row) => Number(row?.nivelM) >= 1.2)
    ? "Alerta"
    : rows.some((row) => Number(row?.nivelM) >= 0.8)
    ? "Atencao"
    : "Normal";

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>~</span> Lagoa dos Patos</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`sr-source-pill status-${status.toLowerCase()}`}>{status}</span>
          {onNavigate && (
            <button type="button" className="sr-btn-link" onClick={() => onNavigate("lagoa")}>
              Ver detalhes <NavIcon name="chevron" size={13} />
            </button>
          )}
        </div>
      </header>

      <div className="sr-lagoa-table">
        {rows.map((row) => {
          const history = Array.isArray(row?.historico) ? row.historico.filter(Number.isFinite) : [];
          const hasHistory = history.length >= 2;
          const trend = hasHistory ? history[history.length - 1] - history[history.length - 2] : null;
          const trendLabel = formatTrend(trend);
          return (
            <div key={row.id} className="sr-lagoa-row">
              <div>
                <strong>{row.nome}</strong>
                <span>{row.subEstacao || row.fonte || "Fonte real"}</span>
              </div>
              <strong>{formatMeters(row.nivelM)}</strong>
              {hasHistory ? (
                <>
                  <span className={trendClass(trend)}>{trendLabel}</span>
                  <Sparkline values={history} />
                </>
              ) : (
                <span className="sr-lagoa-empty-note" style={{ gridColumn: "3 / span 2" }}>sem historico suficiente</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default LagoadosPatos;
