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

function Section({ title, children }) {
  const [open, setOpen] = useState(false);
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

export function CopernicusTab({ ctx }) {
  const { copernicusEms } = ctx;

  if (!copernicusEms?.ok) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
        ⏳ Aguardando dados do Copernicus EMS…
      </div>
    );
  }

  const emsr = copernicusEms.rapid_mapping?.rs_2024;
  const emsn = copernicusEms.risk_recovery?.rs_2024;
  const nacionais = copernicusEms.rapid_mapping?.recent_brazil_floods || [];

  return (
    <div style={{ display: "grid", gap: 14 }}>

      {/* CONTEXTO GERAL */}
      <div style={{
        padding: "16px 18px", borderRadius: 10,
        background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
        border: "1.5px solid #bfdbfe",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#3b82f6", marginBottom: 6 }}>
          Copernicus EMS — Serviço Europeu de Emergência por Satélite
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Quando ocorre um desastre, satélites europeus fotografam a região afetada e especialistas produzem mapas oficiais de danos, inundação e risco. Esses mapas são usados por governos e defesa civil para priorizar resgates e planejar a reconstrução. O Rio Grande do Sul recebeu <strong>dois tipos de ativação</strong> após as enchentes de 2024:
        </div>
      </div>

      {/* CARD EMSR720 */}
      {emsr && (
        <div style={{
          padding: "16px 18px", borderRadius: 10,
          border: "1.5px solid #fca5a5",
          background: "linear-gradient(135deg, #fff1f2 0%, #fff 100%)",
          display: "grid", gap: 12,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 18 }}>🚨</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#991b1b" }}>Mapeamento de Emergência</span>
              <Badge color={emsr.closed ? "gray" : "red"}>{emsr.closed ? "Encerrado" : "Ativo"}</Badge>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Código {emsr.code} · Ativado {formatDaysSince(emsr.activationTime)}
            </div>
          </div>

          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            <strong>O que é:</strong> nas primeiras horas da catástrofe, satélites fotografaram o RS e especialistas identificaram quais áreas estavam alagadas, quais estradas foram cortadas e onde havia destruição. Esses mapas foram entregues à Defesa Civil para guiar os resgates.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
            <div style={{ background: "rgba(239,68,68,0.07)", padding: "10px 12px", borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", marginBottom: 3 }}>Regiões mapeadas</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{emsr.n_aois ?? "--"}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>áreas de interesse</div>
            </div>
            <div style={{ background: "rgba(239,68,68,0.07)", padding: "10px 12px", borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", marginBottom: 3 }}>Mapas produzidos</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{emsr.n_products ?? "--"}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>produtos oficiais</div>
            </div>
          </div>

          {emsr.aois?.length > 0 && (
            <Section title={`Ver regiões mapeadas (${emsr.aois.length})`}>
              <div style={{ display: "grid", gap: 8 }}>
                {emsr.aois.map((aoi, i) => (
                  <div key={i} style={{
                    background: "var(--color-background-secondary)",
                    border: "1px solid var(--color-border-tertiary)",
                    borderRadius: 6, padding: "10px 12px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{aoi.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{aoi.products?.length || 0} mapas disponíveis</div>
                    </div>
                    {aoi.products?.[0]?.downloadPath && (
                      <LinkBtn href={aoi.products[0].downloadPath} color="#dc2626">⬇ Baixar mapa</LinkBtn>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {emsr.viewerUrl && <LinkBtn href={emsr.viewerUrl} color="#dc2626" filled>🗺 Ver mapas no Copernicus</LinkBtn>}
            {emsr.reportLink && <LinkBtn href={emsr.reportLink} color="#dc2626">📄 Relatório PDF</LinkBtn>}
          </div>
        </div>
      )}

      {/* CARD EMSN194 */}
      {emsn && (
        <div style={{
          padding: "16px 18px", borderRadius: 10,
          border: "1.5px solid #d8b4fe",
          background: "linear-gradient(135deg, #faf5ff 0%, #fff 100%)",
          display: "grid", gap: 12,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#6b21a8" }}>Análise de Risco e Reconstrução</span>
              <Badge color="purple">Em andamento</Badge>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Código {emsn.code} · Iniciado {formatDaysSince(emsn.activationTime)}
            </div>
          </div>

          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            <strong>O que é:</strong> meses após a enchente, uma segunda equipe analisa a extensão dos danos — quais cidades ainda estão em risco, quais infraestruturas foram destruídas, quais áreas precisam de obras de prevenção. O resultado são relatórios técnicos usados para planejar a reconstrução e reduzir riscos futuros.
          </div>

          {emsn.products?.length > 0 && (
            <Section title={`Análises produzidas (${emsn.products.length})`}>
              <div style={{ display: "grid", gap: 8 }}>
                {emsn.products.map((prod, i) => {
                  const statusColor = prod.statusCode === "AVAILABLE" ? "green" : "amber";
                  const statusLabel = prod.statusCode === "AVAILABLE" ? "Disponível" : (prod.statusCode || "Em preparo");
                  const totalArea = prod.aois?.reduce((sum, a) => sum + (parseFloat(a.sqkm) || 0), 0) || 0;
                  return (
                    <div key={i} style={{
                      background: "var(--color-background-secondary)",
                      border: "1px solid var(--color-border-tertiary)",
                      borderLeft: "3px solid #a855f7",
                      borderRadius: 6, padding: "12px 14px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{prod.productName || prod.productAcronym}</div>
                          {prod.analysisName && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{prod.analysisName}</div>}
                        </div>
                        <Badge color={statusColor}>{statusLabel}</Badge>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-secondary)" }}>
                        <span>{prod.mapsCount || 0} mapa{prod.mapsCount !== 1 ? "s" : ""}</span>
                        {prod.aois?.length > 0 && <span>{prod.aois.length} região{prod.aois.length !== 1 ? "s" : ""}</span>}
                        {totalArea > 0 && <span>{totalArea.toFixed(0)} km² analisados</span>}
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

      {/* EVENTOS NACIONAIS */}
      {nacionais.length > 0 && (
        <div style={{
          padding: "14px 16px", borderRadius: 10,
          border: "1px solid var(--color-border-tertiary)",
          background: "var(--color-background-primary)",
        }}>
          <Section title={`Outras ativações recentes no Brasil (${nacionais.length})`}>
            <div style={{ display: "grid", gap: 8 }}>
              {nacionais.map((evt, i) => (
                <div key={i} style={{
                  background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-tertiary)",
                  borderRadius: 6, padding: "10px 12px",
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{evt.name}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
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
                        style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}>
                        Ver →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* AVISO OPERACIONAL */}
      <div style={{
        padding: "12px 14px", borderRadius: 8, fontSize: 12, lineHeight: 1.6,
        background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.25)",
        color: "var(--color-text-secondary)",
      }}>
        <strong>ℹ️ Como usar estas informações:</strong> os mapas Copernicus são referência oficial para planejamento — não substituem alertas em tempo real. Para situações de emergência imediata, consulte a Defesa Civil RS (199), o RADAR Lagoa dos Patos e os dados Open-Meteo desta plataforma.
      </div>

    </div>
  );
}

export default CopernicusTab;
