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
            🛰 Mapeamento de Inundação — EMSN194 · Porto Alegre / mai 2024
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
            Sentinel-2 · azul = área inundada · verde = delimitação da AOI
          </div>
        </div>
        <LinkBtn href="https://riskandrecovery.emergency.copernicus.eu/EMSN194/viewer/" color="#1e40af" filled>
          ↗ Viewer interativo
        </LinkBtn>
      </div>

      <img
        src="/sentinela-rs/map_screenshot_1781799234470.webp"
        alt="Mapeamento Copernicus EMS EMSN194 — inundação Porto Alegre maio 2024"
        style={{ width: "100%", display: "block" }}
      />

      <div style={{
        padding: "8px 14px",
        borderTop: "1px solid var(--color-border-tertiary)",
        background: "var(--color-background-primary)",
        fontSize: 10, color: "var(--color-text-secondary)",
      }}>
        Copernicus EMS · EMSN194 · Sentinel-2 · mai 2024
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

      {/* MUP-RS */}
      <div style={{
        padding: "14px 16px", borderRadius: 10,
        background: "linear-gradient(135deg, #eef2ff 0%, #fff 100%)",
        border: "1px solid rgba(99,102,241,0.32)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 240px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3730a3" }}>
              🗺 MUP-RS — Monitoramento do Uso e Permeabilidade do Solo
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
              Plataforma do Governo do RS para acompanhamento de áreas de risco, ocupação e permeabilidade do solo — complementa o mapeamento de satélite desta aba.
            </div>
          </div>
          <LinkBtn href="https://mup.rs.gov.br/" color="#4338ca" filled>
            ↗ Acessar MUP-RS
          </LinkBtn>
        </div>
      </div>

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

      {/* OBRAS E REGISTROS HISTÓRICOS PÓS-EVENTO */}
      <div style={{
        padding: "14px 16px", borderRadius: 10,
        border: "1px solid var(--color-border-tertiary)",
        background: "var(--color-background-primary)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🏛 Obras & Registros Históricos Pós-Evento</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
          Documentos oficiais e estudos técnicos produzidos após maio de 2024 — legislação, impacto socioeconômico, gestão hídrica e resposta institucional.
        </div>
        <div style={{ display: "grid", gap: 10 }}>

          {/* Senado */}
          <a href="https://www2.senado.leg.br/bdsf/bitstream/handle/id/660728/Alem_calamidade_respostas_reconstrucao_RS.pdf"
            target="_blank" rel="noreferrer"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 8,
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-tertiary)",
              borderLeft: "3px solid #1e3a5f",
            }}>
            <img src="https://www.senado.leg.br/favicon.ico" alt="Senado" width={24} height={24}
              style={{ borderRadius: 4, flexShrink: 0, objectFit: "contain" }}
              onError={e => { e.target.style.display="none"; }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                Além da Calamidade — Respostas e Reconstrução do RS
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Senado Federal · Análise legislativa e institucional das respostas ao desastre, propostas de reconstrução e lacunas de governança
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 14, flexShrink: 0 }}>↗</span>
          </a>

          {/* SEPLAN-RS */}
          <a href="https://planejamento.rs.gov.br/upload/arquivos/202504/29092549-relatorio-dee-impactos-socioeconomicos-dos-eventos-climáticos-extremos-de-2024-no-rio-grande-do-sul-uma-analise-apos-um-ano-do-desastre-1.pdf"
            target="_blank" rel="noreferrer"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 8,
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-tertiary)",
              borderLeft: "3px solid #0c4a6e",
            }}>
            <img src="/sentinela-rs/icons/spggrs.png" alt="SPGG-RS" width={24} height={24}
              style={{ borderRadius: 4, flexShrink: 0, objectFit: "contain" }}
              onError={e => { e.target.style.display="none"; }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                Impactos Socioeconômicos — 1 ano após o desastre
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                SEPLAN-RS · Quantificação de perdas por setor (agropecuária, indústria, infraestrutura) e análise regional do impacto econômico acumulado
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 14, flexShrink: 0 }}>↗</span>
          </a>

          {/* ANA */}
          <a href="https://biblioteca.ana.gov.br/sophia_web/Busca/Download?codigoArquivo=171447&tipoMidia=0"
            target="_blank" rel="noreferrer"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 8,
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-tertiary)",
              borderLeft: "3px solid #155e75",
            }}>
            <img src="https://www.gov.br/ana/favicon.ico" alt="ANA" width={24} height={24}
              style={{ borderRadius: 4, flexShrink: 0, objectFit: "contain" }}
              onError={e => { e.target.style.display="none"; }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                Relatório Técnico ANA — Gestão Hídrica na Crise
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Agência Nacional de Águas · Avaliação das barragens, níveis fluviais, operação do sistema e recomendações para monitoramento futuro
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 14, flexShrink: 0 }}>↗</span>
          </a>

          {/* CGU */}
          <a href="https://www.gov.br/cgu/pt-br/acoes-da-cgu-em-apoio-ao-rio-grande-do-sul/imagens/GuiaCalamidade1.pdf"
            target="_blank" rel="noreferrer"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 8,
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-tertiary)",
              borderLeft: "3px solid #166534",
            }}>
            <img src="https://www.gov.br/favicon.ico" alt="CGU" width={24} height={24}
              style={{ borderRadius: 4, flexShrink: 0, objectFit: "contain" }}
              onError={e => { e.target.style.display="none"; }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                Guia de Gestão de Calamidade — CGU
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Controladoria-Geral da União · Orientações sobre controle, transparência e prestação de contas dos recursos federais destinados à reconstrução do RS
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 14, flexShrink: 0 }}>↗</span>
          </a>

        </div>
      </div>


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
