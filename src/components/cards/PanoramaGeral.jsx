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

const statusBgColor = {
  livre: "rgba(74, 222, 128, 0.15)",
  lenta: "rgba(250, 204, 21, 0.15)",
  bloqueada: "rgba(248, 113, 113, 0.15)",
  normal: "rgba(74, 222, 128, 0.15)",
  "transito normal": "rgba(74, 222, 128, 0.15)",
  lentidao: "rgba(250, 204, 21, 0.15)",
  erro: "rgba(148, 163, 184, 0.15)",
  atencao: "rgba(250, 204, 21, 0.15)",
  alerta: "rgba(248, 113, 113, 0.15)",
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
        <div className="sr-panorama-grid">
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

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>↗</span> PANORAMA GERAL</div>
        <div className="sr-mod-badge">Dados informativos • não são alertas ⓘ</div>
      </header>

      <div className="sr-panorama-grid">
        <div className="sr-panorama-block">
          <span>≋ Lagoa dos Patos</span>
          <strong>{nivelMedio.toFixed(2).replace(".", ",")} m</strong>
          <small>Nível médio</small>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "11px",
            fontWeight: "700",
            padding: "2px 6px",
            borderRadius: "6px",
            background: variacaoMedia > 0 ? "rgba(248, 113, 113, 0.15)" : "rgba(74, 222, 128, 0.15)",
            color: variacaoMedia > 0 ? "#ef4444" : "#22c55e",
            marginTop: "6px"
          }}>
            {variacaoMedia > 0 ? "↑" : "↓"} {Math.abs(variacaoMedia).toFixed(2).replace(".", ",")} m (24h)
          </span>
        </div>

        <div className="sr-panorama-block">
          <span>☔ Previsão</span>
          <strong>{chuva5dMm} mm</strong>
          <small>Acumulado 5 dias</small>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: "11px",
            fontWeight: "600",
            padding: "2px 6px",
            borderRadius: "6px",
            background: "rgba(59, 130, 246, 0.12)",
            color: "#2563eb",
            marginTop: "6px"
          }}>
            Chuva prevista
          </span>
        </div>

        <div className="sr-panorama-block">
          <span>≋ Niveis dos Rios</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
            {rios.map((rio) => {
              const rStatus = rio.status ? String(rio.status).toLowerCase() : "normal";
              const sColor = statusColor[rio.status] || statusColor.normal;
              const sBg = statusBgColor[rStatus] || "rgba(74, 222, 128, 0.15)";
              return (
                <div key={rio.nome} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", borderBottom: "1px solid var(--sr-border)", paddingBottom: "4px" }}>
                  <span style={{ color: "var(--sr-text)", fontWeight: 700 }}>{rio.nome}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{rio.nivelM.toFixed(2)} m</span>
                    <span style={{
                      fontSize: "8px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: sBg,
                      color: sColor,
                      letterSpacing: "0.02em"
                    }}>
                      {rio.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
        </div>
      </div>

      <div className="sr-panorama-roads">
        <span className="sr-panorama-roads-title">Rodovias</span>
        <div className="sr-panorama-roads-list">
          {rodovias.map((road) => (
            <div key={road.br} className="sr-panorama-roads-item">
              <span style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: statusColor[road.status] || statusColor.Normal,
                boxShadow: `0 0 8px ${statusColor[road.status] || statusColor.Normal}`,
                marginTop: 6,
                flexShrink: 0
              }} />
              <div>
                <strong>{road.br}</strong> — <span style={{ color: statusColor[road.status] || statusColor.Normal, fontWeight: 700 }}>{road.status}</span>
                <small>{road.trecho}{road.detalhe ? ` · ${road.detalhe}` : ""}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sr-defesa-banner">
        <div className="sr-defesa-logo">DEFESA<br />CIVIL</div>
        <div>
          <p style={{ margin: "0 0 10px 0" }}><strong>Atenção:</strong> os alertas oficiais sobre eventos adversos são emitidos pela Defesa Civil RS. Em caso de riscos, siga as orientações dos canais oficiais e ligue <strong>199</strong>.</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <a href="https://defesacivil.rs.gov.br/" target="_blank" rel="noreferrer">Defesa Civil RS ↗</a>
            <a href="https://api.whatsapp.com/send?phone=555133338000" target="_blank" rel="noreferrer">WhatsApp ↗</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PanoramaGeral;
