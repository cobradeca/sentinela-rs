import { DefesaCivilNotice } from "../components/DefesaCivilNotice";

export function CopernicusTab({ ctx }) {
  const {
    COPERNICUS_REFERENCE,
    copernicusEms,
    copernicusNdvi,
    copernicusS1,
    copernicusWater,
    dark,
    formatDateTimeBR,
    s,
    t,
  } = ctx;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <DefesaCivilNotice t={t} dark={dark} />
      <div style={{ padding: "10px 14px", background: dark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 5, fontSize: 10, color: dark ? "#c4b5fd" : "#7c3aed" }}>
        🛰️ <strong>Copernicus — produtos reais ativos.</strong> Sentinel-2 observa água e vegetação quando há céu útil. Sentinel-1 usa radar e ajuda mesmo com nuvens ou à noite. As cores dos números destacam o tipo do indicador e a qualidade da leitura; não são alerta oficial.
      </div>

      <div style={{ ...s.card, border: `1px solid ${copernicusEms?.ok ? "#22c55e55" : "#eab30855"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: 2 }}>COPERNICUS EMS / CEMS</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: t.text, marginTop: 2 }}>Rapid Mapping + Risk and Recovery</div>
          </div>
          <div style={{ fontSize: 9, padding: "4px 8px", borderRadius: 4, border: `1px solid ${copernicusEms?.ok ? "#22c55e" : "#eab308"}`, color: copernicusEms?.ok ? "#22c55e" : "#eab308" }}>
            {copernicusEms?.ok ? "ATIVO" : "AGUARDANDO"}
          </div>
        </div>
        {copernicusEms?.ok ? (
          <div style={{ fontSize: 10, color: t.textMuted }}>EMS carregado com sucesso.</div>
        ) : (
          <div style={{ fontSize: 10, color: t.textMuted }}>Aguardando dados EMS...</div>
        )}
      </div>

      <div style={{ ...s.card, border: `1px solid ${copernicusS1?.ok ? "#22c55e55" : "#eab30855"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: 2 }}>SENTINEL-1 SAR</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: t.text, marginTop: 2 }}>Detecção de água por radar</div>
          </div>
          <div style={{ fontSize: 9, padding: "4px 8px", borderRadius: 4, border: `1px solid ${copernicusS1?.ok ? "#22c55e" : "#eab308"}`, color: copernicusS1?.ok ? "#22c55e" : "#eab308" }}>
            {copernicusS1?.ok ? "ATIVO" : "AGUARDANDO"}
          </div>
        </div>
        {copernicusS1?.ok ? (
          <div style={{ fontSize: 10, color: t.textMuted }}>Sentinel-1 carregado com sucesso.</div>
        ) : (
          <div style={{ fontSize: 10, color: t.textMuted }}>Aguardando dados Sentinel-1...</div>
        )}
      </div>

      <div style={{ ...s.card, border: `1px solid ${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e55" : "#eab30855"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: 2 }}>COPERNICUS NDVI</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: t.text, marginTop: 2 }}>Saúde da vegetação</div>
          </div>
          <div style={{ fontSize: 9, padding: "4px 8px", borderRadius: 4, border: `1px solid ${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308"}`, color: copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308" }}>
            {copernicusNdvi?.ndvi_mean !== undefined ? "ATIVO" : "AGUARDANDO"}
          </div>
        </div>
        {copernicusNdvi?.ndvi_mean !== undefined ? (
          <div style={{ fontSize: 10, color: t.textMuted }}>NDVI carregado com sucesso.</div>
        ) : (
          <div style={{ fontSize: 10, color: t.textMuted }}>Aguardando dados NDVI...</div>
        )}
      </div>
    </div>
  );
}

export default CopernicusTab;
