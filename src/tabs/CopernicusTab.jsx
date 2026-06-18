import { useState } from "react";

function formatDaysSince(isoDate) {
  if (!isoDate) return "--";
  const date = new Date(isoDate);
  const now = new Date();
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

function Badge({ color, children }) {
  const palettes = {
    red:    { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    purple: { bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" },
    green:  { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
    gray:   { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" },
    amber:  { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    blue:   { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  };
  const p = palettes[color] || palettes.gray;
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700,
      padding: "3px 8px", borderRadius: 4,
      background: p.bg, color: p.text, border: `1px solid ${p.border}`,
      textTransform: "uppercase", letterSpacing: 0.4,
    }}>{children}</span>
  );
}

function LinkBtn({ href, color = "#3b82f6", filled = false, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      display: "inline-block", padding: "8px 14px",
      background: filled ? color : "transparent",
      color: filled ? "white" : color,
      border: `1.5px solid ${color}`,
      textDecoration: "none", borderRadius: 6,
      fontWeight: 600, fontSize: 12, lineHeight: 1,
    }}>{children}</a>
  );
}

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid var(--color-border-tertiary)" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "12px 0", background: "transparent", border: "none",
        cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)",
      }}>
        {title}
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s", fontSize: 10 }}>▼</span>
      </button>
      {open && <div style={{ paddingBottom: 14 }}>{children}</div>}
    </div>
  );
}

const DOCS = [
  {
    fonte: "World Weather Attribution / npj Natural Hazards (2026)",
    titulo: "Mudança climática e El Niño por trás das enchentes no sul do Brasil",
    resumo: "Estudo peer-reviewed concluiu que a mudança climática tornou o evento mais de 2× mais provável e 6–9% mais intenso. El Niño agravou as condições, mas o aquecimento global foi o fator dominante.",
    achados: [
      "420 mm de chuva em 10 dias (24 abr – 4 mai 2024)",
      "+90% do estado afetado — área comparável ao Reino Unido",
      "Probabilidade do evento dobrada pelo aquecimento global",
      "Intensidade 6–9% maior que num clima sem aquecimento",
    ],
    relevancia: "Fundamenta o uso de ENSO como indicador de risco no Sentinela·RS",
    url: "https://www.worldweatherattribution.org/climate-change-made-the-floods-in-southern-brazil-twice-as-likely/",
    cor: "#dc2626",
  },
  {
    fonte: "ScienceDirect — Remote Sensing of Environment (2025)",
    titulo: "Mapeamento da inundação de maio 2024 no RS com Sentinel-1, Sentinel-2 e DEM",
    resumo: "Integrou SAR (Sentinel-1), imagens ópticas (Sentinel-2) e modelo digital de elevação para superar limitações de cada sensor individualmente, especialmente em áreas urbanas.",
    achados: [
      "SAR sozinho subestima inundação urbana (efeito de dupla reflexão)",
      "Fusão Sentinel-1 + Sentinel-2 + DEM melhora precisão em áreas densas",
      "Validação com PlanetScope de alta resolução",
      "Metodologia replicável para monitoramento futuro no RS",
    ],
    relevancia: "Justifica monitorar Sentinel-1 E Sentinel-2 juntos — não apenas um deles",
    url: "https://www.sciencedirect.com/science/article/pii/S2666592125000411",
    cor: "#7c3aed",
  },
  {
    fonte: "OCHA — ONU (setembro 2024)",
    titulo: "Relatório de situação: Enchentes no RS — último boletim oficial da ONU",
    resumo: "Cobertura humanitária de julho a setembro de 2024. Sistematiza impactos, resposta e lacunas de recuperação. Último relatório da série emergencial.",
    achados: [
      "469 municípios afetados — quase todo o estado",
      "Mais de 150.000 pessoas desabrigadas no pico",
      "R$ 19 bilhões em danos materiais (US$ 3,7 bi)",
      "181 mortes confirmadas, 61 desaparecidos",
    ],
    relevancia: "Baseline humanitário para comparar recuperação atual vs situação de emergência",
    url: "https://www.unocha.org/publications/report/brazil/brazil-floods-rio-grande-do-sul-united-nations-situation-report-20-september-2024",
    cor: "#0369a1",
  },
  {
    fonte: "Copernicus Global Flood Awareness (2024)",
    titulo: "Cronologia da resposta via satélite: EMSR720 + EMSN194",
    resumo: "Documentação oficial do acionamento do Copernicus EMS — da ativação em 3 mai (barragem de Cotiporã) até os 17+ mapas de danos produzidos para a Defesa Civil.",
    achados: [
      "Acionamento em 3 mai — ruptura de barragem em Cotiporã/Bento Gonçalves",
      "17 mapas produzidos em 2 semanas pelo EMSR720",
      "EMSN194: 4 análises — delimitação de cheias, danos, exposição populacional",
      "Produtos P04/P06/P08/P14 cobrem 1.083 km² de área analisada",
    ],
    relevancia: "Origem dos dados desta aba — contextualiza o que cada produto significa",
    url: "https://global-flood.emergency.copernicus.eu/news/170-Rio%20Grande%20do%20Sul%20Flooding,%20Brazil%20-%20April%20to%20June%202024/",
    cor: "#059669",
  },
];


const EMSN194_AOIS = [
  { label: "Porto Alegre", cx: 157.1, cy: 122.1, color: "#3b82f6", fill: "rgba(59,130,246,0.2)", pts: "22.78,159.35 26.80,153.23 40.17,148.04 52.81,140.08 59.38,136.49 28.15,115.20 36.97,85.34 84.48,77.92 89.31,69.47 72.74,60.50 83.87,52.12 106.60,49.10 128.01,42.82 134.68,34.91 154.64,22.40 180.22,19.01 200.22,19.67 207.29,26.47 218.39,24.06 234.39,24.40 237.70,28.53 258.91,28.52 274.77,22.68 281.68,26.10 276.72,28.17 284.80,35.53 297.20,40.19 324.62,51.68 294.62,58.18 281.47,57.99 261.97,64.58 250.66,75.61 231.95,95.31 220.69,110.64 251.95,114.81 251.61,151.65 221.59,164.49 267.12,221.11 262.47,232.77 249.03,257.82 159.87,292.75 109.19,266.31 111.10,262.12 109.91,252.14 107.66,242.55 104.90,234.18 103.15,227.85 97.02,220.39 83.92,217.05 70.10,211.32 72.56,199.92 64.68,189.85 46.26,184.04 44.01,176.97 46.55,173.00 22.78,159.35" },
  { label: "Canoas", cx: 156.1, cy: 167.5, color: "#ef4444", fill: "rgba(239,68,68,0.2)", pts: "64.68,189.85 46.26,184.04 58.70,178.84 95.33,163.10 108.21,151.89 111.25,149.64 128.98,151.08 133.94,152.01 141.53,152.41 146.49,152.18 148.42,152.27 152.34,152.58 157.01,152.80 159.74,152.80 198.82,153.42 221.66,152.89 230.63,153.76 241.66,155.90 221.59,164.49 234.79,180.88 237.54,184.31 244.76,193.29 245.52,194.23 191.74,196.35 72.56,199.92 64.68,189.85" },
  { label: "Porto Alegre North", cx: 145.6, cy: 129.5, color: "#8b5cf6", fill: "rgba(139,92,246,0.2)", pts: "220.69,110.64 251.95,114.81 251.61,151.65 241.66,155.90 230.63,153.76 221.66,152.89 198.82,153.42 159.74,152.80 157.01,152.80 152.34,152.58 148.42,152.27 146.49,152.18 141.53,152.41 133.94,152.01 128.98,151.08 111.25,149.64 120.44,142.81 118.51,139.93 113.39,133.03 107.35,130.64 97.02,128.00 84.94,125.87 83.51,121.53 88.91,118.22 89.50,117.47 95.01,117.66 102.94,117.49 108.01,117.37 113.26,117.59 116.70,117.85 122.25,119.25 123.99,119.53 126.07,119.58 128.90,119.48 129.78,119.34 132.37,117.75 136.32,115.32 138.18,114.81 145.46,113.30 148.78,112.65 150.97,112.72 156.72,113.79 159.25,114.11 169.94,114.12 171.60,114.02 220.69,110.64" },
  { label: "Porto Alegre South", cx: 127.9, cy: 105.9, color: "#f59e0b", fill: "rgba(245,158,11,0.2)", pts: "220.69,110.64 171.60,114.02 169.94,114.12 159.25,114.11 156.72,113.79 150.97,112.72 148.78,112.65 145.46,113.30 138.18,114.81 136.32,115.32 132.37,117.75 129.78,119.34 128.90,119.48 126.07,119.58 123.99,119.53 122.25,119.25 116.70,117.85 113.26,117.59 108.01,117.37 102.94,117.49 95.01,117.66 89.50,117.47 91.70,114.68 84.43,109.35 80.24,106.22 76.66,103.67 77.95,101.45 75.45,98.94 71.12,98.11 60.58,97.03 58.02,93.21 59.87,88.79 64.06,84.10 84.87,79.84 95.88,77.05 98.97,73.69 250.03,76.27 238.12,88.81 236.59,90.41 231.95,95.31 220.69,110.64" }
];

function EmsAoiMap() {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1.5px solid #bfdbfe" }}>
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
        borderBottom: "1px solid #bfdbfe",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af" }}>
            🛰 Áreas Analisadas pelo Copernicus — EMSN194
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
            Viewer oficial · Porto Alegre e região metropolitana · mai/2024
          </div>
        </div>
        <LinkBtn href="https://riskandrecovery.emergency.copernicus.eu/EMSN194/viewer/" color="#1e40af" filled>
          ↗ Viewer interativo
        </LinkBtn>
      </div>

      <div style={{ position: "relative", width: "100%", paddingBottom: "75%", background: "#e8f4fd" }}>
        <iframe
          src="https://riskandrecovery.emergency.copernicus.eu/EMSN194/viewer/"
          title="Copernicus EMS — EMSN194 Viewer"
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            border: "none",
          }}
          allowFullScreen
        />
      </div>
      <div style={{
        padding: "8px 14px",
        borderTop: "1px solid var(--color-border-tertiary)",
        background: "var(--color-background-primary)",
        fontSize: 11, color: "var(--color-text-secondary)",
      }}>
        Fonte: Copernicus Emergency Management Service · EMSN194 · viewer oficial
      </div>
    </div>
  );
}

export function CopernicusTab({ ctx }) {
  const { copernicusEms } = ctx;
  const emsr = copernicusEms?.rapid_mapping?.rs_2024;
  const emsn = copernicusEms?.rapid_mapping?.rs_2024
    ? copernicusEms.risk_recovery?.rs_2024
    : null;
  const nacionais = copernicusEms?.rapid_mapping?.recent_brazil_floods || [];

  return (
    <div style={{ display: "grid", gap: 14 }}>

      <EmsAoiMap />

            {/* CARDS EMSR + EMSN */}
      {emsr && (
        <div style={{
          padding: "14px 16px", borderRadius: 10,
          border: "1.5px solid #fca5a5",
          background: "linear-gradient(135deg, #fff1f2 0%, #fff 100%)",
          display: "grid", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>Mapeamento de Emergência — {emsr.code}</span>
            <Badge color={emsr.closed ? "gray" : "red"}>{emsr.closed ? "Encerrado" : "Ativo"}</Badge>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Ativado em 3 mai 2024 após ruptura de barragem em Cotiporã. Satélites mapearam extensão da inundação e danos para guiar resgates da Defesa Civil. {emsr.n_products} mapas produzidos em {emsr.n_aois} regiões.
          </div>
          {emsr.aois?.length > 0 && (
            <Section title={`Regiões mapeadas (${emsr.aois.length})`}>
              <div style={{ display: "grid", gap: 6 }}>
                {emsr.aois.map((aoi, i) => (
                  <div key={i} style={{
                    background: "var(--color-background-secondary)", borderRadius: 6,
                    padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{aoi.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{aoi.products?.length || 0} mapas</div>
                    </div>
                    {aoi.products?.[0]?.downloadPath && (
                      <LinkBtn href={aoi.products[0].downloadPath} color="#dc2626">⬇ Baixar</LinkBtn>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {emsr.viewerUrl && <LinkBtn href={emsr.viewerUrl} color="#dc2626" filled>🗺 Ver mapas de emergência</LinkBtn>}
            {emsr.reportLink && <LinkBtn href={emsr.reportLink} color="#dc2626">📄 Relatório PDF</LinkBtn>}
          </div>
        </div>
      )}

      {emsn && (
        <div style={{
          padding: "14px 16px", borderRadius: 10,
          border: "1.5px solid #d8b4fe",
          background: "linear-gradient(135deg, #faf5ff 0%, #fff 100%)",
          display: "grid", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16 }}>📊</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#6b21a8" }}>Análise de Risco e Reconstrução — {emsn.code}</span>
            <Badge color="purple">Análises concluídas</Badge>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Fase pós-emergência: análise detalhada de danos, exposição populacional e risco residual. 4 produtos técnicos cobrindo 1.083 km² ao redor de Porto Alegre / Canoas / São Leopoldo.
          </div>
          {emsn.products?.length > 0 && (
            <Section title={`Análises produzidas (${emsn.products.length})`}>
              <div style={{ display: "grid", gap: 6 }}>
                {emsn.products.map((prod, i) => {
                  const totalArea = prod.aois?.reduce((sum, a) => sum + (parseFloat(a.sqkm) || 0), 0) || 0;
                  const finished = prod.statusCode === "AVAILABLE" || prod.statusCode === "PRODUCTION FINISHED";
                  return (
                    <div key={i} style={{
                      background: "var(--color-background-secondary)",
                      borderLeft: "3px solid #a855f7", borderRadius: 6, padding: "10px 12px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{prod.productAcronym || prod.productName}</div>
                          {prod.analysisName && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{prod.analysisName}</div>}
                        </div>
                        <Badge color={finished ? "green" : "amber"}>{finished ? "Concluído" : "Em preparo"}</Badge>
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                        {prod.mapsCount > 0 && <span>{prod.mapsCount} mapa{prod.mapsCount !== 1 ? "s" : ""}</span>}
                        {prod.aois?.length > 0 && <span>{prod.aois.length} região{prod.aois.length !== 1 ? "s" : ""}</span>}
                        {totalArea > 0 && <span>{totalArea.toFixed(0)} km²</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {emsn.viewerUrl && <LinkBtn href={emsn.viewerUrl} color="#7c3aed" filled>📊 Ver análises no Copernicus</LinkBtn>}
            {emsn.storyMapUrl && <LinkBtn href={emsn.storyMapUrl} color="#7c3aed">📍 StoryMap narrativo</LinkBtn>}
          </div>
        </div>
      )}

      {/* DOCUMENTOS E PUBLICAÇÕES CIENTÍFICAS */}
      <div style={{
        padding: "14px 16px", borderRadius: 10,
        border: "1px solid var(--color-border-tertiary)",
        background: "var(--color-background-primary)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📚 Publicações e Documentos Oficiais</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
          O evento de maio 2024 foi extensamente documentado por organizações internacionais. Os achados têm implicações diretas para o monitoramento atual.
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {DOCS.map((doc, i) => (
            <div key={i} style={{
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-tertiary)",
              borderLeft: `3px solid ${doc.cor}`,
              borderRadius: 8, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: doc.cor, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                {doc.fonte}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{doc.titulo}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>{doc.resumo}</div>
              <div style={{ display: "grid", gap: 3, marginBottom: 8 }}>
                {doc.achados.map((a, j) => (
                  <div key={j} style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "flex", gap: 6 }}>
                    <span style={{ color: doc.cor, flexShrink: 0 }}>▸</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
              <div style={{
                fontSize: 11, padding: "6px 10px", borderRadius: 4,
                background: `${doc.cor}10`, color: doc.cor, fontWeight: 600,
                marginBottom: 8,
              }}>
                💡 {doc.relevancia}
              </div>
              <LinkBtn href={doc.url} color={doc.cor}>Ver documento →</LinkBtn>
            </div>
          ))}
        </div>
      </div>

      {/* EVENTOS NACIONAIS */}
      {nacionais.length > 0 && (
        <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--color-border-tertiary)" }}>
          <Section title={`Outras ativações Copernicus no Brasil (${nacionais.length})`}>
            <div style={{ display: "grid", gap: 8 }}>
              {nacionais.map((evt, i) => (
                <div key={i} style={{
                  background: "var(--color-background-secondary)", borderRadius: 6,
                  padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{evt.name}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {evt.code} · {evt.category} · {formatDaysSince(evt.activationTime)}
                    </div>
                    {(evt.n_aois || evt.n_products) && (
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                        {evt.n_aois} regiões · {evt.n_products} mapas
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <Badge color={evt.closed ? "gray" : "red"}>{evt.closed ? "Encerrado" : "Ativo"}</Badge>
                    {evt.viewerUrl && (
                      <a href={evt.viewerUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}>Ver →</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* AVISO */}
      <div style={{
        padding: "12px 14px", borderRadius: 8, fontSize: 12, lineHeight: 1.6,
        background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.25)",
        color: "var(--color-text-secondary)",
      }}>
        <strong>ℹ️ Uso operacional:</strong> Copernicus EMS é referência pós-evento. Para alertas em tempo real, use Defesa Civil RS (199), RADAR Lagoa dos Patos e Open-Meteo desta plataforma.
      </div>

    </div>
  );
}

export default CopernicusTab;
