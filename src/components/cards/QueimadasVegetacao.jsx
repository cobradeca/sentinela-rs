import { NavIcon } from "../layout/NavIcons";

export const MOCK_QUEIMADAS = {
  focos24h: 0,
  ndviMedio: null,
  historico7dias: [],
};

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

  return {
    focos24h: Number.isFinite(data.focos24h) ? data.focos24h
      : Number.isFinite(data.focos_24h) ? data.focos_24h
      : Number.isFinite(data.count) ? data.count : 0,
    ndviMedio: ndviMean,
    vegetationPercent: Number.isFinite(data.vegetation_percent) ? data.vegetation_percent : null,
    lowVegetationPercent: Number.isFinite(data.low_vegetation_percent) ? data.low_vegetation_percent : null,
    validCoveragePercent: Number.isFinite(data.valid_coverage_percent) ? data.valid_coverage_percent : null,
    period: data.period || null,
    source: data.source || null,
    method: data.method || null,
    status: data.status || null,
    aoi: data.aoi || data.area || null,
  };
}

function getLastValidCoverageLabel(period) {
  if (!period?.to) return null;
  const end = new Date(period.to);
  if (Number.isNaN(end.getTime())) return null;
  const todayIsoUtc = new Date().toISOString().slice(0, 10);
  if (String(period.to).slice(0, 10) === todayIsoUtc) {
    end.setUTCDate(end.getUTCDate() - 1);
  }
  return end.toLocaleDateString("pt-BR");
}

export function QueimadasVegetacao({ className = "", data = MOCK_QUEIMADAS, loading = false, error = null, onRetry, onNavigate }) {
  if (loading) return <section className={`sr-mod-card ${className}`}><div className="sr-mod-skeleton h-40 w-full" /></section>;

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

  const normalized = normalizeQueimadasData(data);
  const color = ndviColor(normalized.ndviMedio);
  const ndviLabel = Number.isFinite(normalized.ndviMedio) ? normalized.ndviMedio.toFixed(2) : "—";
  const focoLabel = Number.isFinite(normalized.focos24h) && normalized.focos24h > 0 ? normalized.focos24h : "Sem foco";
  const periodLabel = getLastValidCoverageLabel(normalized.period);
  const badgeLabel = normalized.focos24h > 0 ? `${normalized.focos24h} foco(s) ativo(s)` : "Sem foco ativo";

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>🔥</span> QUEIMADAS E VEGETAÇÃO</div>
        <div className="sr-mod-badge">{badgeLabel}</div>
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
            <span>Cobertura analisada</span>
            <strong>{normalized.validCoveragePercent != null ? `${normalized.validCoveragePercent}%` : "—"}</strong>
            <small>{periodLabel ? `Última válida: ${periodLabel}` : "Fonte: Copernicus / Sentinel-2"}</small>
          </div>
        </div>

      {onNavigate && (
        <footer className="sr-mod-footer" style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="sr-btn-link" onClick={() => onNavigate("queimadas")}>
            Ver detalhes <NavIcon name="chevron" size={13} />
          </button>
        </footer>
      )}
    </section>
  );
}

export default QueimadasVegetacao;
