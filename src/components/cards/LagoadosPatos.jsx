import { useId } from "react";
import { NavIcon } from "../layout/NavIcons";

export const MOCK_LAGOA = [];

function Sparkline({ values, color = "#2563eb" }) {
  const gradientId = useId();
  const width = 120;
  const height = 36;
  
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;
  const pad = 2; // Margem de segurança para não cortar o traço nas bordas
  
  const xs = values.map((_, i) => (i / (values.length - 1)) * (width - pad * 2) + pad);
  const ys = values.map((v) => height - pad - ((v - min) / range) * (height - pad * 2));
  
  let linePath = `M ${xs[0]},${ys[0]}`;
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

    linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
  }
  
  const areaPath = `${linePath} L ${xs[xs.length - 1]},${height} L ${xs[0]},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sr-mod-spark" aria-hidden="true" style={{ width: width, height: height, display: "block" }}>
      <defs>
        <linearGradient id={`spark-grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-grad-${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
          <strong>Sem leitura real disponível.</strong>
          <span>Aguarde a sincronização das estações monitoradas.</span>
        </div>
      </section>
    );
  }

  const status = rows.some((row) => Number(row?.nivelM) >= 1.2)
    ? "Alerta"
    : rows.some((row) => Number(row?.nivelM) >= 0.8)
    ? "Atenção"
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
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <strong>{formatMeters(row.nivelM)}</strong>
                {typeof row.floodLimitM === "number" && typeof row.historicMaxM === "number" && (
                  <div style={{ position: "relative", width: 50, height: 4, background: "var(--sr-border-active, #334155)", borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, (row.nivelM / row.historicMaxM) * 100))}%`, background: row.nivelM >= row.floodLimitM ? "#ef4444" : "#3b82f6" }} />
                    <div style={{ position: "absolute", left: `${(row.floodLimitM / row.historicMaxM) * 100}%`, top: 0, bottom: 0, width: 2, background: "#facc15" }} title={`Inundação: ${row.floodLimitM}m | Máx: ${row.historicMaxM}m`} />
                  </div>
                )}
              </div>
              {hasHistory ? (
                <>
                  <span className={trendClass(trend)}>{trendLabel}</span>
                  <Sparkline values={history} />
                </>
              ) : (
                <span className="sr-lagoa-empty-note">sem histórico suficiente</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default LagoadosPatos;
