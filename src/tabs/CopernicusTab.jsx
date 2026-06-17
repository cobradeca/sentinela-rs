import { useState } from "react";

function formatDaysSince(isoDate) {
  if (!isoDate) return "--";
  const date = new Date(isoDate);
  const now = new Date();
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  return days === 0 ? "Hoje" : `${days}d atrás`;
}

function TabButton({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        background: isActive ? "#1d4ed8" : "transparent",
        color: isActive ? "white" : "var(--color-text-secondary)",
        border: "none",
        borderBottom: isActive ? "3px solid #1d4ed8" : "1px solid var(--color-border-tertiary)",
        cursor: "pointer",
        fontWeight: isActive ? 600 : 500,
        fontSize: 13,
        transition: "all 0.2s"
      }}
    >
      {label}
    </button>
  );
}

function Badge({ status, children }) {
  const colors = {
    "AVAILABLE": { bg: "#dcfce7", text: "#166534" },
    "DRAFT": { bg: "#fef3c7", text: "#92400e" },
    "ACTIVE": { bg: "#dbeafe", text: "#1e40af" },
    "CLOSED": { bg: "#e5e7eb", text: "#374151" }
  };
  const style = colors[status] || colors.DRAFT;
  return (
    <span style={{
      display: "inline-block",
      fontSize: 11,
      fontWeight: 600,
      padding: "4px 8px",
      borderRadius: 4,
      background: style.bg,
      color: style.text,
      textTransform: "uppercase",
      letterSpacing: 0.5
    }}>
      {children}
    </span>
  );
}

function ExpandableSection({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid var(--color-border-tertiary)", paddingTop: 12 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "10px 0",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-primary)",
          transition: "all 0.2s"
        }}
      >
        {title}
        <span style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>▼</span>
      </button>
      {isOpen && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-border-tertiary)" }}>{children}</div>}
    </div>
  );
}

export function CopernicusTabFull({ ctx }) {
  const [activeTab, setActiveTab] = useState("rapid");
  const { copernicusEms, formatDateTimeBR, dark, t = {} } = ctx;

  if (!copernicusEms?.ok) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
        ⏳ Copernicus EMS aguardando dados...
      </div>
    );
  }

  const rapidMapping = copernicusEms.rapid_mapping?.rs_2024;
  const riskRecovery = copernicusEms.risk_recovery?.rs_2024;
  const recentEvents = copernicusEms.rapid_mapping?.recent_brazil_floods || [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* HERO CARD */}
      <div style={{
        padding: "20px 16px",
        background: "linear-gradient(135deg, #dbeafe 0%, #ffffff 100%)",
        border: "2px solid #3b82f6",
        borderRadius: 12,
        display: "grid",
        gap: 14
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              Copernicus EMS — Resposta a Desastres
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#1e40af", marginBottom: 8 }}>
              {rapidMapping?.name || riskRecovery?.name || "Rio Grande do Sul 2024"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {rapidMapping && (
              <Badge status={rapidMapping.closed ? "CLOSED" : "ACTIVE"}>
                {rapidMapping.code}: {rapidMapping.closed ? "Fechado" : "Ativo"}
              </Badge>
            )}
            {riskRecovery && (
              <Badge status="AVAILABLE">{riskRecovery.code}: Recovery</Badge>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {rapidMapping && (
            <>
              <div style={{ background: "rgba(239, 68, 68, 0.08)", padding: "10px 12px", borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 4 }}>Activation</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{formatDaysSince(rapidMapping.activationTime)}</div>
              </div>
              <div style={{ background: "rgba(34, 197, 94, 0.08)", padding: "10px 12px", borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 4 }}>AOIs Mapeadas</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>{rapidMapping.n_aois}</div>
              </div>
              <div style={{ background: "rgba(59, 130, 246, 0.08)", padding: "10px 12px", borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 4 }}>Produtos</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>{rapidMapping.n_products}</div>
              </div>
            </>
          )}
          {riskRecovery && (
            <div style={{ background: "rgba(139, 92, 246, 0.08)", padding: "10px 12px", borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 4 }}>Análises Recovery</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>{riskRecovery.products?.length || 0}</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {rapidMapping?.viewerUrl && (
            <a
              href={rapidMapping.viewerUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 12px",
                background: "#3b82f6",
                color: "white",
                textDecoration: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12,
                transition: "0.2s"
              }}
            >
              🗺️ Viewer Copernicus
            </a>
          )}
          {rapidMapping?.reportLink && (
            <a
              href={rapidMapping.reportLink}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 12px",
                background: "transparent",
                color: "#3b82f6",
                border: "1px solid #3b82f6",
                textDecoration: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12
              }}
            >
              📄 Report PDF
            </a>
          )}
          {riskRecovery?.storyMapUrl && (
            <a
              href={riskRecovery.storyMapUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 12px",
                background: "transparent",
                color: "#a855f7",
                border: "1px solid #a855f7",
                textDecoration: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12
              }}
            >
              📍 StoryMap
            </a>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--color-border-tertiary)",
        borderRadius: "8px 8px 0 0",
        overflow: "hidden",
        background: "var(--color-background-secondary)"
      }}>
        <TabButton label="🚨 Rapid Mapping (EMSR)" isActive={activeTab === "rapid"} onClick={() => setActiveTab("rapid")} />
        <TabButton label="📊 Risk & Recovery (EMSN)" isActive={activeTab === "risk"} onClick={() => setActiveTab("risk")} />
        <TabButton label="📈 Comparativa" isActive={activeTab === "compare"} onClick={() => setActiveTab("compare")} />
        {recentEvents.length > 0 && (
          <TabButton label="🌍 Nacional" isActive={activeTab === "national"} onClick={() => setActiveTab("national")} />
        )}
      </div>

      {/* TAB: RAPID MAPPING */}
      {activeTab === "rapid" && rapidMapping && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-tertiary)",
          borderRadius: 12,
          padding: "16px 20px",
          display: "grid",
          gap: 12
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 10px", color: "var(--color-text-primary)" }}>
              AOIs — Áreas de Interesse Mapeadas
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {rapidMapping.aois?.map((aoi, idx) => (
                <div key={idx} style={{
                  background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-tertiary)",
                  borderRadius: 8,
                  padding: "12px 14px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
                        {aoi.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {aoi.products?.length || 0} produtos mapeados
                      </div>
                    </div>
                    {aoi.products?.[0]?.downloadPath && (
                      <a
                        href={aoi.products[0].downloadPath}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "6px 10px",
                          background: "#16a34a",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700
                        }}
                      >
                        ⬇️ Download
                      </a>
                    )}
                  </div>

                  {aoi.products?.length > 0 && (
                    <ExpandableSection title={`Detalhes dos produtos (${aoi.products.length})`}>
                      <div style={{ display: "grid", gap: 8, fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {aoi.products.map((prod, pidx) => (
                          <div key={pidx} style={{ padding: "8px", background: "var(--color-background-primary)", borderRadius: 4 }}>
                            <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>
                              {prod.type || "Map"}
                            </div>
                            <div>Mapas: {prod.mapsCount || 0}</div>
                          </div>
                        ))}
                      </div>
                    </ExpandableSection>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: RISK & RECOVERY */}
      {activeTab === "risk" && riskRecovery && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-tertiary)",
          borderRadius: 12,
          padding: "16px 20px",
          display: "grid",
          gap: 12
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 10px", color: "var(--color-text-primary)" }}>
              Produtos de Análise — Risk & Recovery
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {riskRecovery.products?.map((prod, idx) => (
                <div key={idx} style={{
                  background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-tertiary)",
                  borderLeft: "3px solid #a855f7",
                  borderRadius: 8,
                  padding: "14px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
                        {prod.productName} <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>({prod.productAcronym})</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
                        {prod.analysisName}
                      </div>
                    </div>
                    <Badge status={prod.statusCode || "DRAFT"}>{prod.statusCode || "DRAFT"}</Badge>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "auto auto auto", gap: 12, fontSize: 12, marginBottom: 10 }}>
                    <div>
                      <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Mapas:</span>
                      <span style={{ fontWeight: 700, marginLeft: 4 }}>{prod.mapsCount || 0}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Versão:</span>
                      <span style={{ fontWeight: 700, marginLeft: 4 }}>{prod.versionDelivery || "v1"}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>AOIs:</span>
                      <span style={{ fontWeight: 700, marginLeft: 4 }}>{prod.aois?.length || 0}</span>
                    </div>
                  </div>

                  {prod.aois?.length > 0 && (
                    <ExpandableSection title="AOIs Afetadas">
                      <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                        {prod.aois.map((aoi, aidx) => (
                          <div key={aidx} style={{ padding: "8px", background: "var(--color-background-primary)", borderRadius: 4 }}>
                            <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                              {aoi.aoiName}
                            </div>
                            <div style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>
                              Área: {aoi.sqkm.toFixed(1)} km²
                            </div>
                          </div>
                        ))}
                      </div>
                    </ExpandableSection>
                  )}

                  {prod.arcgisLayers?.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-border-tertiary)" }}>
                      <a
                        href={prod.arcgisLayers[0]}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          background: "#7c3aed",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700
                        }}
                      >
                        🗺️ Abrir em ArcGIS
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: COMPARATIVA */}
      {activeTab === "compare" && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-tertiary)",
          borderRadius: 12,
          padding: "16px 20px",
          display: "grid",
          gap: 14
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
            Comparação: Resposta vs Recuperação
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Rapid Mapping */}
            <div style={{
              background: "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "14px"
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7f1d1d", marginBottom: 10 }}>
                🚨 Rapid Mapping (EMSR720)
              </div>
              {rapidMapping && (
                <>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "#991b1b", fontWeight: 600 }}>Status:</span>
                    <span style={{ marginLeft: 6 }}>{rapidMapping.closed ? "Fechado" : "Ativo"}</span>
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "#991b1b", fontWeight: 600 }}>AOIs:</span>
                    <span style={{ marginLeft: 6 }}>{rapidMapping.n_aois}</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: "#991b1b", fontWeight: 600 }}>Produtos:</span>
                    <span style={{ marginLeft: 6 }}>{rapidMapping.n_products}</span>
                  </div>
                </>
              )}
            </div>

            {/* Risk Recovery */}
            <div style={{
              background: "linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)",
              border: "1px solid #e9d5ff",
              borderRadius: 8,
              padding: "14px"
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b21a8", marginBottom: 10 }}>
                📊 Risk & Recovery (EMSN194)
              </div>
              {riskRecovery && (
                <>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "#6b21a8", fontWeight: 600 }}>Status:</span>
                    <span style={{ marginLeft: 6 }}>Recuperação ativa</span>
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "#6b21a8", fontWeight: 600 }}>Análises:</span>
                    <span style={{ marginLeft: 6 }}>{riskRecovery.products?.length || 0}</span>
                  </div>
                  {riskRecovery.storyMapUrl && (
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: "#6b21a8", fontWeight: 600 }}>StoryMap:</span>
                      <a href={riskRecovery.storyMapUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: "#6b21a8", textDecoration: "underline" }}>
                        Ver narrativa
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={{
            padding: "10px 12px",
            background: "#f0fdf4",
            border: "1px solid #dcfce7",
            borderRadius: 6,
            fontSize: 12,
            color: "#166534"
          }}>
            ℹ️ <strong>EMSR</strong> = resposta imediata pós-evento (mapeamento de danos)<br/>
            <strong>EMSN</strong> = recuperação e análise de risco médio-longo prazo
          </div>
        </div>
      )}

      {/* TAB: NACIONAL */}
      {activeTab === "national" && recentEvents.length > 0 && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-tertiary)",
          borderRadius: 12,
          padding: "16px 20px",
          display: "grid",
          gap: 12
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 10px", color: "var(--color-text-primary)" }}>
            Eventos Brasil — Últimas Ativações
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            {recentEvents.map((evt, idx) => (
              <div key={idx} style={{
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-tertiary)",
                borderRadius: 8,
                padding: "12px 14px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
                      {evt.code}: {evt.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                      {evt.category} — {formatDaysSince(evt.activationTime)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {evt.n_aois} AOIs • {evt.n_products} produtos
                    </div>
                  </div>
                  <Badge status={evt.closed ? "CLOSED" : "ACTIVE"}>
                    {evt.closed ? "Fechado" : "Ativo"}
                  </Badge>
                </div>
                {evt.viewerUrl && (
                  <a
                    href={evt.viewerUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 10,
                      fontSize: 11,
                      color: "#3b82f6",
                      textDecoration: "none",
                      fontWeight: 600
                    }}
                  >
                    Ver no Copernicus →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{
        padding: "12px 14px",
        background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)",
        border: "1px solid rgba(59, 130, 246, 0.3)",
        borderRadius: 8,
        fontSize: 11,
        color: "var(--color-text-secondary)",
        lineHeight: 1.6
      }}>
        <strong>ℹ️ Uso operacional:</strong> Copernicus EMS (EMSR/EMSN) é referência oficial pós-evento. Valide com Defesa Civil RS, Open-Meteo observado e RADAR Lagoa antes de decisões críticas. Não aciona alerta automático.
      </div>
    </div>
  );
}

export default CopernicusTabFull;