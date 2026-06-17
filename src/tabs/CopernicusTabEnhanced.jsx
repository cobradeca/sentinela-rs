import { useState } from "react";
import { DefesaCivilNotice } from "../components/DefesaCivilNotice";

function Sparkline({ values, color = "#22c55e", height = 40 }) {
  if (!Array.isArray(values) || values.length < 2) return null;
  const max = Math.max(...values.filter(v => typeof v === 'number'));
  const min = Math.min(...values.filter(v => typeof v === 'number'));
  const range = max - min || 1;
  const w = 200;
  const h = height;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ExpandableSection({ title, content, isOpen, onToggle }) {
  return (
    <div style={{ border: "1px solid var(--sr-border)", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--sr-text)"
        }}
      >
        {title}
        <span style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>▼</span>
      </button>
      {isOpen && (
        <div style={{ padding: "12px 14px", background: "var(--sr-card-bg)", borderTop: "1px solid var(--sr-border)", fontSize: 12, color: "var(--sr-text-muted)", lineHeight: 1.6 }}>
          {content}
        </div>
      )}
    </div>
  );
}

function TabButton({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        background: isActive ? "#1d4ed8" : "transparent",
        color: isActive ? "white" : "var(--sr-text-muted)",
        border: "none",
        borderBottom: isActive ? "3px solid #1d4ed8" : "1px solid var(--sr-border)",
        cursor: "pointer",
        fontWeight: isActive ? 700 : 500,
        fontSize: 13
      }}
    >
      {label}
    </button>
  );
}

export function CopernicusTab({ ctx }) {
  const [activeTab, setActiveTab] = useState("ems");
  const [expandedExplain, setExpandedExplain] = useState(null);

  const {
    copernicusEms,
    copernicusS1,
    copernicusNdvi,
    copernicusWater,
    COPERNICUS_REFERENCE,
    formatDateTimeBR,
    t,
    dark
  } = ctx;

  const statusArray = [
    { ok: copernicusEms?.ok, label: "EMS" },
    { ok: copernicusS1?.ok, label: "Radar (S-1)" },
    { ok: copernicusNdvi?.ndvi_mean !== undefined, label: "NDVI" }
  ];
  const activeCount = statusArray.filter(s => s.ok).length;
  const statusColor = activeCount === 3 ? "#22c55e" : activeCount >= 1 ? "#facc15" : "#ef4444";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DefesaCivilNotice t={t} dark={dark} />

      {/* HERO CARD */}
      <div style={{ 
        padding: "20px 16px", 
        background: `linear-gradient(135deg, ${statusColor}12 0%, ${statusColor}06 100%)`,
        border: `2px solid ${statusColor}`,
        borderRadius: 12,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 16,
        alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--sr-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Status Copernicus</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: statusColor, marginBottom: 6 }}>{activeCount} de 3 produtos ativos</div>
          <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>
            {statusArray.map(s => (
              <span key={s.label} style={{ marginRight: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.ok ? "#22c55e" : "#e5e7eb" }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: statusColor }}>🛰️</div>
          <div style={{ fontSize: 11, color: "var(--sr-text-muted)", marginTop: 4 }}>
            Sentinel-2 & 1
          </div>
        </div>
      </div>

      {/* INFO BANNER */}
      <div style={{ 
        padding: "10px 14px", 
        background: dark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.05)", 
        border: "1px solid rgba(139,92,246,0.3)", 
        borderRadius: 8, 
        fontSize: 11, 
        color: dark ? "#c4b5fd" : "#7c3aed",
        lineHeight: 1.5
      }}>
        <strong>Copernicus — produtos reais ativos.</strong> Sentinel-2 observa água e vegetação quando há céu útil. Sentinel-1 usa radar e ajuda mesmo com nuvens. As cores destacam tipo e qualidade. Decisão operacional continua dependendo de Defesa Civil, Open-Meteo, RADAR Lagoa e HidroSens.
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--sr-border)", borderRadius: "8px 8px 0 0", overflow: "hidden", background: "var(--sr-card-bg)" }}>
        <TabButton label="🚨 EMS & Rapid Mapping" isActive={activeTab === "ems"} onClick={() => setActiveTab("ems")} />
        <TabButton label="📡 Radar (Sentinel-1)" isActive={activeTab === "s1"} onClick={() => setActiveTab("s1")} />
        <TabButton label="🌿 Vegetação (NDVI)" isActive={activeTab === "ndvi"} onClick={() => setActiveTab("ndvi")} />
        <TabButton label="📚 Referências" isActive={activeTab === "ref"} onClick={() => setActiveTab("ref")} />
      </div>

      {/* TAB: EMS */}
      {activeTab === "ems" && (
        <div className="sr-card-v2" style={{ borderTop: `3px solid ${copernicusEms?.ok ? "#22c55e" : "#eab308"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--sr-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Copernicus EMS</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--sr-text)" }}>Rapid Mapping + Risk & Recovery</div>
            </div>
            <div style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: `1px solid ${copernicusEms?.ok ? "#22c55e" : "#eab308"}`, color: copernicusEms?.ok ? "#22c55e" : "#eab308", fontWeight: 700 }}>
              {copernicusEms?.ok ? "✓ ATIVO" : "⏳ AGUARDANDO"}
            </div>
          </div>

          {copernicusEms?.ok ? (
            <div style={{ display: "grid", gap: 12 }}>
              {/* QUICK STATS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--sr-text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Ativações Brasil</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#22c55e" }}>{copernicusEms.rapid_mapping?.recent_brazil_floods?.length ?? 0}</div>
                  <div style={{ fontSize: 9, color: "var(--sr-text-muted)", marginTop: 4 }}>Rapid Mapping</div>
                </div>
                <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--sr-text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>EMSR720 (RS 2024)</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#3b82f6" }}>{copernicusEms.rapid_mapping?.rs_2024?.aois?.length ?? 0}</div>
                  <div style={{ fontSize: 9, color: "var(--sr-text-muted)", marginTop: 4 }}>Áreas de interesse</div>
                </div>
                <div style={{ background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--sr-text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>EMSN194 (POA)</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#a855f7" }}>{copernicusEms.risk_recovery?.rs_2024?.products?.length ?? 0}</div>
                  <div style={{ fontSize: 9, color: "var(--sr-text-muted)", marginTop: 4 }}>Produtos Risk & Recovery</div>
                </div>
              </div>

              {/* PRODUTOS */}
              {(copernicusEms.risk_recovery?.rs_2024?.products || []).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sr-text)", marginBottom: 10 }}>Produtos disponíveis</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {copernicusEms.risk_recovery.rs_2024.products.map(p => (
                      <div key={p.productName} style={{ background: "var(--sr-border)", borderRadius: 8, padding: "12px 14px", borderLeft: "3px solid #a855f7" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sr-text)" }}>{p.productName}</div>
                            <div style={{ fontSize: 11, color: "var(--sr-text-muted)", marginTop: 3 }}>{p.analysisName}</div>
                            <div style={{ fontSize: 9, color: "var(--sr-text-muted)", marginTop: 4 }}>
                              {(p.aois || []).map(a => a.aoiName).join(" • ") || "sem AOI"}
                            </div>
                          </div>
                          {p.arcgisLayers?.[0]?.[1] && (
                            <a href={p.arcgisLayers[0][1]} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#1d4ed8", fontWeight: 700, whiteSpace: "nowrap" }}>
                              Abrir ArcGIS →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--sr-text-muted)", fontSize: 12 }}>
              EMS ainda não carregado. Aguardando consulta pública...
            </div>
          )}
        </div>
      )}

      {/* TAB: SENTINEL-1 (RADAR) */}
      {activeTab === "s1" && (
        <div className="sr-card-v2" style={{ borderTop: `3px solid ${copernicusS1?.ok ? "#22c55e" : "#eab308"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--sr-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Sentinel-1 SAR</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--sr-text)" }}>Detecção de água por radar</div>
            </div>
            <div style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: `1px solid ${copernicusS1?.ok ? "#22c55e" : "#eab308"}`, color: copernicusS1?.ok ? "#22c55e" : "#eab308", fontWeight: 700 }}>
              {copernicusS1?.ok ? "✓ ATIVO" : "⏳ AGUARDANDO"}
            </div>
          </div>

          {copernicusS1?.ok ? (
            <div style={{ display: "grid", gap: 12 }}>
              {/* INDICADORES */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                {[
                  { l: "Áreas compatíveis com água", v: copernicusS1.water_compatible_area_km2 ?? "–", u: "km²", c: "#0ea5e9" },
                  { l: "% Compatível com água", v: copernicusS1.water_compatible_percent ?? "–", u: "%", c: "#06b6d4" },
                  { l: "Cobertura válida", v: copernicusS1.valid_coverage_percent ?? "–", u: "%", c: "#22c55e" }
                ].map(item => (
                  <div key={item.l} style={{ background: `${item.c}12`, border: `1px solid ${item.c}44`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "var(--sr-text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>{item.l}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: item.c }}>{item.v}</div>
                    <div style={{ fontSize: 10, color: "var(--sr-text-muted)", marginTop: 2 }}>{item.u}</div>
                  </div>
                ))}
              </div>

              {/* SPARKLINE */}
              {copernicusS1.history_values && (
                <div style={{ background: "var(--sr-border)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sr-text)", marginBottom: 8 }}>Evolução (12 últimos períodos)</div>
                  <Sparkline values={copernicusS1.history_values} color="#0ea5e9" height={50} />
                </div>
              )}

              {/* EXPLICAÇÃO */}
              <ExpandableSection
                title="📖 Como interpretar dados de radar"
                isOpen={expandedExplain === "s1"}
                onToggle={() => setExpandedExplain(expandedExplain === "s1" ? null : "s1")}
                content={
                  <>
                    O Sentinel-1 usa radar para detectar água. Superfícies de água devolvem <strong>pouco sinal</strong> (aparecem escuras), por isso são "compatíveis com água". 
                    <br /><br />
                    <strong>Vantagens:</strong> Funciona com nuvens e à noite.
                    <br />
                    <strong>Limitações:</strong> Pode confundir áreas urbanas, vegetação inundada, vento sobre água e sombras de relevo.
                    <br /><br />
                    <strong style={{ color: "#f97316" }}>⚠ Sempre confirmar com Defesa Civil, Open-Meteo observado, RADAR Lagoa e HidroSens.</strong>
                  </>
                }
              />

              <div style={{ padding: "10px 12px", background: "#f973160c", border: "1px solid #f9731644", borderRadius: 6, fontSize: 10, color: "#b45309", lineHeight: 1.5 }}>
                ⚠ <strong>Limitação SAR:</strong> {copernicusS1.limitation || "Indicador de baixo retroespalhamento. Confirmar com fontes responsáveis."}
              </div>

              <div style={{ fontSize: 9, color: "var(--sr-text-muted)" }}>
                Período: {copernicusS1.period?.from ? formatDateTimeBR(copernicusS1.period.from) : "–"} → {copernicusS1.period?.to ? formatDateTimeBR(copernicusS1.period.to) : "–"}
              </div>
            </div>
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--sr-text-muted)", fontSize: 12 }}>
              Sentinel-1 ainda não carregado nesta sessão.
            </div>
          )}
        </div>
      )}

      {/* TAB: NDVI */}
      {activeTab === "ndvi" && (
        <div className="sr-card-v2" style={{ borderTop: `3px solid ${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--sr-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Sentinel-2 NDVI</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--sr-text)" }}>Saúde da vegetação</div>
            </div>
            <div style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: `1px solid ${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308"}`, color: copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308", fontWeight: 700 }}>
              {copernicusNdvi?.ndvi_mean !== undefined ? "✓ ATIVO" : "⏳ AGUARDANDO"}
            </div>
          </div>

          {copernicusNdvi?.ndvi_mean !== undefined ? (
            <div style={{ display: "grid", gap: 12 }}>
              {/* AVISO COBERTURA */}
              {typeof copernicusNdvi.valid_coverage_percent === "number" && copernicusNdvi.valid_coverage_percent < 30 && (
                <div style={{ padding: "10px 12px", background: "#ef44440c", border: "1px solid #ef444444", borderRadius: 6, fontSize: 10, color: "#991b1b", lineHeight: 1.5 }}>
                  🌿 <strong>Cobertura insuficiente: {copernicusNdvi.valid_coverage_percent}%</strong> — muitas nuvens. NDVI pode não ser representativo.
                </div>
              )}

              {/* INDICADORES */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                {[
                  { l: "NDVI médio", v: copernicusNdvi.ndvi_mean?.toFixed(3) ?? "–", c: "#16a34a" },
                  { l: "Vegetação saudável", v: copernicusNdvi.vegetation_percent ? `${copernicusNdvi.vegetation_percent}%` : "–", c: "#22c55e" },
                  { l: "Vegetação baixa", v: copernicusNdvi.low_vegetation_percent ? `${copernicusNdvi.low_vegetation_percent}%` : "–", c: "#eab308" },
                  { l: "Cobertura válida", v: copernicusNdvi.valid_coverage_percent ? `${copernicusNdvi.valid_coverage_percent}%` : "–", c: "#06b6d4" }
                ].map(item => (
                  <div key={item.l} style={{ background: `${item.c}12`, border: `1px solid ${item.c}44`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "var(--sr-text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>{item.l}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: item.c }}>{item.v}</div>
                  </div>
                ))}
              </div>

              {/* EXPLICAÇÃO */}
              <ExpandableSection
                title="📖 O que é NDVI"
                isOpen={expandedExplain === "ndvi"}
                onToggle={() => setExpandedExplain(expandedExplain === "ndvi" ? null : "ndvi")}
                content={
                  <>
                    NDVI (Normalized Difference Vegetation Index) mede o vigor da vegetação usando luz visível e infravermelha.
                    <br /><br />
                    <strong>Valores:</strong> De -1 (água/solo) até +1 (vegetação muito saudável).
                    <br />
                    <strong>Uso:</strong> Acompanhar estiagem, saúde de lavouras e recuperação pós-evento.
                    <br /><br />
                    <strong style={{ color: "#f97316" }}>⚠ Contexto ambiental, não gera alerta automático.</strong>
                  </>
                }
              />

              <div style={{ padding: "10px 12px", background: "#facc150c", border: "1px solid #facc1544", borderRadius: 6, fontSize: 10, color: "#854d0e", lineHeight: 1.5 }}>
                ⚠ {copernicusNdvi.limitation || "NDVI é contexto técnico. Confirmar com Defesa Civil."}
              </div>

              <div style={{ fontSize: 9, color: "var(--sr-text-muted)" }}>
                Período: {copernicusNdvi.period?.from ? formatDateTimeBR(copernicusNdvi.period.from) : "–"} → {copernicusNdvi.period?.to ? formatDateTimeBR(copernicusNdvi.period.to) : "–"}
              </div>
            </div>
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--sr-text-muted)", fontSize: 12 }}>
              NDVI ainda não carregado nesta sessão.
            </div>
          )}
        </div>
      )}

      {/* TAB: REFERÊNCIAS */}
      {activeTab === "ref" && (
        <>
          <div style={{ padding: "10px 14px", background: dark ? "rgba(234,179,8,0.07)" : "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 8, fontSize: 10, color: dark ? "#fef08a" : "#854d0e", lineHeight: 1.5 }}>
            🗓 <strong>Contexto histórico:</strong> Não são SITREP operacional. São referências técnicas separadas da leitura Copernicus.
          </div>

          {COPERNICUS_REFERENCE?.themes?.length > 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              {COPERNICUS_REFERENCE.themes.map(theme => (
                <div key={theme.id} style={{ 
                  background: "var(--sr-card-bg)", 
                  border: `2px solid ${theme.color}44`, 
                  borderLeft: `4px solid ${theme.color}`, 
                  borderRadius: 8, 
                  padding: "14px 16px",
                  display: "grid",
                  gap: 10
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{theme.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--sr-text)" }}>{theme.name}</div>
                      <div style={{ fontSize: 9, color: theme.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>○ Referência histórica</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--sr-text-muted)", lineHeight: 1.6 }}>
                    <strong>RS:</strong> {theme.rsHistory}
                  </div>
                  <div style={{ fontSize: 10, color: theme.color, fontWeight: 600 }}>
                    {theme.indicator}
                  </div>
                  <div style={{ fontSize: 8, color: "var(--sr-text-muted)" }}>
                    📡 {theme.copSource}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--sr-text-muted)", fontSize: 12 }}>
              Sem referências disponíveis.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CopernicusTab;
