import { MOCK_LAGOA } from "./LagoadosPatos";

export const MOCK_RODOVIAS = [
  { br: "BR-101", status: "Transito normal", trecho: "Osorio -> Torres", detalhe: "Tempo de viagem dentro do esperado" },
  { br: "BR-116", status: "Transito normal", trecho: "Porto Alegre -> Pelotas", detalhe: "Tempo de viagem dentro do esperado" },
  { br: "BR-471", status: "Transito normal", trecho: "Rio Grande -> Santa Vitoria do Palmar", detalhe: "Tempo de viagem dentro do esperado" },
];

export const MOCK_RIOS = [
  { nome: "Jacui", local: "Eldorado do Sul", nivelM: 2.84, status: "normal" },
  { nome: "Camaqua", local: "Camaqua", nivelM: 3.21, status: "atencao" },
  { nome: "Pelotas", local: "Pelotas", nivelM: 1.42, status: "normal" },
];

const statusColor = {
  Livre: "#4ade80",
  Lenta: "#facc15",
  Bloqueada: "#f87171",
  Normal: "#4ade80",
  "Transito normal": "#4ade80",
  Lentidao: "#facc15",
  Erro: "#94a3b8",
  normal: "#4ade80",
  atencao: "#facc15",
  alerta: "#f87171",
};

function ndviColor(value) {
  if (!Number.isFinite(value)) return "#94a3b8";
  if (value < 0.3) return "#f87171";
  if (value < 0.5) return "#facc15";
  return "#84cc16";
}

export function PanoramaGeral({
  className = "",
  lagoa = MOCK_LAGOA,
  chuva5dMm = 12,
  rodovias = MOCK_RODOVIAS,
  rios = MOCK_RIOS,
  queimadas = null,
  loading = false,
  error = null,
  onRetry,
}) {
  const nivelMedio = lagoa.reduce((sum, item) => sum + item.nivelM, 0) / lagoa.length;
  const variacaoMedia = lagoa.reduce((sum, item) => sum + item.variacaoM, 0) / lagoa.length;

  if (loading) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-skeleton h-5 w-1-3" />
        <div className="sr-panorama-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="sr-mod-skeleton h-32 w-full" />)}
        </div>
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

  const focoLabel = Number.isFinite(queimadas?.focos24h) && queimadas.focos24h > 0 ? queimadas.focos24h : "Sem foco";
  const ndviLabel = Number.isFinite(queimadas?.ndviMedio) ? queimadas.ndviMedio.toFixed(2) : "—";
  const colorNDVI = ndviColor(queimadas?.ndviMedio);
  const periodLabel = queimadas?.period?.to
    ? new Date(queimadas.period.to).toLocaleDateString("pt-BR")
    : null;

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>↗</span> PANORAMA GERAL</div>
        <div className="sr-mod-badge">Dados informativos • nao sao alertas ⓘ</div>
      </header>

      <div className="sr-panorama-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="sr-panorama-block">
          <span>≋ Lagoa dos Patos</span>
          <strong>{nivelMedio.toFixed(2).replace(".", ",")} m</strong>
          <small>Nivel medio</small>
          <em className={variacaoMedia > 0 ? "sr-var-up" : "sr-var-down"}>
            {variacaoMedia > 0 ? "↑" : "↓"} {Math.abs(variacaoMedia).toFixed(2).replace(".", ",")} m (24h)
          </em>
        </div>

        <div className="sr-panorama-block">
          <span>☔ Previsao</span>
          <strong>{chuva5dMm} mm</strong>
          <small>Acumulado 5 dias</small>
          <em>Chuva prevista</em>
        </div>

        <div className="sr-panorama-block">
          <span>≋ Niveis dos Rios</span>
          {rios.map((rio) => (
            <small key={rio.nome}>
              <b>{rio.nome}</b> {rio.nivelM.toFixed(2)} m
              <br />
              <i style={{ color: statusColor[rio.status] || statusColor.normal }}>{rio.status}</i>
            </small>
          ))}
        </div>

        {/* Bloco Vertical de Queimadas e Vegetação */}
        <div className="sr-panorama-block" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <span>🔥 Queimadas e Vegetação</span>
          
          <div style={{ borderBottom: "1px solid var(--sr-border)", paddingBottom: "6px" }}>
            <span style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--sr-text-muted)", fontWeight: 700 }}>Focos de calor (24h)</span>
            <strong style={{ display: "block", fontSize: "16px", margin: "2px 0 0 0" }}>{focoLabel}</strong>
            <small style={{ fontSize: "9px", color: "var(--sr-text-muted)" }}>Detectados (INPE)</small>
          </div>

          <div style={{ borderBottom: "1px solid var(--sr-border)", paddingBottom: "6px" }}>
            <span style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--sr-text-muted)", fontWeight: 700 }}>NDVI médio RS</span>
            <strong style={{ display: "block", fontSize: "16px", margin: "2px 0 0 0", color: colorNDVI }}>{ndviLabel}</strong>
            <div className="sr-ndvi-bar" style={{ marginTop: "4px", marginBottom: "4px" }}>
              <i style={{ display: "block", height: "100%", width: `${Math.max(0, Math.min(100, (queimadas?.ndviMedio ?? 0) * 100))}%`, background: colorNDVI }} />
            </div>
            <small style={{ fontSize: "9px", color: "var(--sr-text-muted)" }}>
              {queimadas?.vegetationPercent != null ? `${queimadas.vegetationPercent}% veg. saudável` : "Copernicus S-2"}
            </small>
          </div>

          <div>
            <span style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--sr-text-muted)", fontWeight: 700 }}>Cobertura analisada</span>
            <strong style={{ display: "block", fontSize: "16px", margin: "2px 0 0 0" }}>
              {queimadas?.validCoveragePercent != null ? `${queimadas.validCoveragePercent}%` : "—"}
            </strong>
            <small style={{ fontSize: "9px", color: "var(--sr-text-muted)" }}>
              {periodLabel ? `Imagem de ${periodLabel}` : "Fonte: Copernicus"}
            </small>
          </div>
        </div>
      </div>

      <div className="sr-panorama-roads">
        <span className="sr-panorama-roads-title">Rodovias</span>
        <div className="sr-panorama-roads-list">
          {rodovias.map((road) => (
            <div key={road.br} className="sr-panorama-roads-item">
              <b style={{ color: statusColor[road.status] || statusColor.Normal }}>●</b>
              <div>
                <strong>{road.br}</strong> — {road.status}
                <small>{road.trecho}{road.detalhe ? ` · ${road.detalhe}` : ""}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sr-defesa-banner">
        <div className="sr-defesa-logo">DEFESA<br />CIVIL</div>
        <p><strong>Atencao:</strong> os alertas oficiais sobre eventos adversos sao emitidos pela Defesa Civil RS. Em caso de riscos, siga as orientacoes dos canais oficiais e ligue <strong>199</strong>.</p>
        <a href="https://defesacivil.rs.gov.br/" target="_blank" rel="noreferrer">Defesa Civil RS - saiba mais ↗</a>
        <a href="https://api.whatsapp.com/send?phone=555133338000" target="_blank" rel="noreferrer">WhatsApp ↗</a>
      </div>
    </section>
  );
}

export default PanoramaGeral;
