import { DefesaCivilNotice } from "../components/DefesaCivilNotice";
import { findNearbyFireEvents, findNearbyFireFoci } from "../utils/fireSpatial";

function latestDetection(nearbyFoci, nearbyEvents) {
  const values = [
    ...nearbyFoci.map(({ focus }) => focus?.datahora || focus?.properties?.datahora),
    ...nearbyEvents.map(({ event }) => event?.properties?.dt_maxima),
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  return values.length > 0 ? new Date(Math.max(...values)).toISOString() : null;
}

export function QueimadasTab({ ctx }) {
  const {
    FIRE_MONITORED_AREAS_RS,
    censipamFireEvents,
    dark,
    formatDateTimeBR,
    loadQueimadas,
    qLoading,
    queimadas,
    s,
    t,
  } = ctx;

  const fireRecords = Array.isArray(queimadas) ? queimadas : (queimadas?.records || []);
  const activeFireEvents = censipamFireEvents?.active_records_48h || [];
  const sourceAvailable = Boolean(queimadas?.ok || censipamFireEvents?.ok);
  const sourcesReady = Boolean(queimadas?.ok && censipamFireEvents?.ok);
  const monitoredAreas = FIRE_MONITORED_AREAS_RS.map((area) => {
    const nearbyFoci = findNearbyFireFoci(area, fireRecords);
    const nearbyEvents = findNearbyFireEvents(area, activeFireEvents);
    const nearestDistance = Math.min(nearbyFoci[0]?.distanceKm ?? Infinity, nearbyEvents[0]?.distanceKm ?? Infinity);
    const sources = [
      nearbyFoci.length > 0 ? "INPE" : null,
      nearbyEvents.length > 0 ? "CENSIPAM" : null,
    ].filter(Boolean);

    return {
      area,
      hasFire: nearbyFoci.length > 0 || nearbyEvents.length > 0,
      nearestDistance,
      sources,
      latest: latestDetection(nearbyFoci, nearbyEvents),
    };
  });

  return (
    <div style={{ display:"grid", gap:12 }}>
      <DefesaCivilNotice t={t} dark={dark} />

      <div style={{ padding:"10px 14px", background: dark?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:5, fontSize:10, color: dark?"#fdba74":"#c2410c", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <span>🔥 Monitoramento das principais áreas de preservação ambiental no trajeto pelas rodovias <strong>BR-116</strong> e <strong>BR-471</strong>.</span>
        <button onClick={loadQueimadas} disabled={qLoading} style={{ background:"none", border:"1px solid rgba(249,115,22,0.5)", color:"#fdba74", padding:"5px 12px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:9, letterSpacing:1 }}>
          {qLoading ? "⏳ Consultando..." : "↻ Atualizar"}
        </button>
      </div>

      <div style={{ ...s.card }}>
        <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>ÁREAS DE PRESERVAÇÃO MONITORADAS — BR-116 E BR-471</div>
        <div style={{ fontSize:9, color:t.textMuted, marginBottom:12, lineHeight:1.5 }}>
          O status considera focos georreferenciados do INPE e Eventos de Fogo recentes do CENSIPAM próximos a cada área.
        </div>

        {!sourceAvailable && !qLoading && (
          <div style={{ marginBottom:10, padding:"8px 10px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.22)", borderRadius:4, fontSize:9, color:t.textMuted }}>
            As fontes de focos estão indisponíveis nesta sessão. Atualize para tentar novamente.
          </div>
        )}

        <div style={{ display:"grid", gap:8 }}>
          {monitoredAreas.map(({ area, hasFire, nearestDistance, sources, latest }) => (
            <div key={area.id} style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${hasFire ? "#f97316" : t.border}`, borderRadius:5, padding:"10px 12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:8, color:t.textFaint, letterSpacing:1.3 }}>{area.region}</div>
                  <div style={{ fontSize:13, fontWeight:900, color:t.text, marginTop:2 }}>{area.name}</div>
                </div>
                <div style={{ fontSize:8, fontWeight:700, color:hasFire ? "#f97316" : "#94a3b8", border:`1px solid ${hasFire ? "#f97316" : "rgba(100,116,139,0.4)"}`, borderRadius:3, padding:"2px 7px", whiteSpace:"nowrap" }}>
                  {hasFire ? "Com foco" : sourcesReady ? "Sem foco" : "Sem leitura"}
                </div>
              </div>

              <div style={{ fontSize:9, color:t.textMuted, lineHeight:1.45, marginTop:6 }}>{area.focus}</div>

              <div style={{ fontSize:8, color:t.textFaint, marginTop:7 }}>
                {hasFire
                  ? `${sources.join(" + ")} · última detecção: ${formatDateTimeBR(latest)}${Number.isFinite(nearestDistance) ? ` · ${nearestDistance.toFixed(1)} km` : ""}`
                  : sourcesReady ? "Nenhum foco recente identificado na área monitorada." : "Não foi possível confirmar a situação desta área nesta sessão."}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...s.card }}>
        <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:6 }}>FONTES DO MONITORAMENTO</div>
        <div style={{ fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
          INPE BDQueimadas: focos detectados por satélite nas últimas 48 horas.<br />
          CENSIPAM Painel do Fogo: eventos consolidados com detecção nas últimas 48 horas.
        </div>
      </div>
    </div>
  );
}
