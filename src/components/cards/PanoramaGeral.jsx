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

export function PanoramaGeral({
  className = "",
  lagoa = MOCK_LAGOA,
  chuva5dMm = 12,
  rodovias = MOCK_RODOVIAS,
  rios = MOCK_RIOS,
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

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>↗</span> PANORAMA GERAL</div>
        <div className="sr-mod-badge">Dados informativos • nao sao alertas ⓘ</div>
      </header>

      <div className="sr-panorama-grid">
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
          <span>Rodovias</span>
          {rodovias.map((road) => (
            <small key={road.br}>
              <b style={{ color: statusColor[road.status] || statusColor.Normal }}>●</b> {road.br}: {road.status}
              <br />
              {road.trecho}
              {road.detalhe ? <><br />{road.detalhe}</> : null}
            </small>
          ))}
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
