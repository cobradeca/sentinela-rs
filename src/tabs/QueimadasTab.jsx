import { DefesaCivilNotice } from "../components/DefesaCivilNotice";
import monitoredAreasGeojsonRaw from "../data/fire-monitored-areas.geojson?raw";
import { findNearbyFireEvents, findNearbyFireFoci } from "../utils/fireSpatial";

const MONITORED_AREA_GEOMETRIES = (() => {
  try {
    const geojson = JSON.parse(monitoredAreasGeojsonRaw);
    return Object.fromEntries((geojson.features || []).map((feature) => [
      feature.properties?.id,
      feature,
    ]).filter(([id]) => Boolean(id)));
  } catch {
    return {};
  }
})();

function latestDetection(nearbyFoci, nearbyInpeEvents, nearbyCensipamEvents) {
  const values = [
    ...nearbyFoci.map(({ focus }) => focus?.datahora || focus?.properties?.datahora),
    ...nearbyInpeEvents.map(({ event }) => event?.properties?.dt_maxima),
    ...nearbyCensipamEvents.map(({ event }) => event?.properties?.dt_maxima),
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  return values.length > 0 ? new Date(Math.max(...values)).toISOString() : null;
}

function monitoredAreaWithGeometry(area) {
  const feature = MONITORED_AREA_GEOMETRIES[area.id];
  if (!feature?.geometry) return area;
  return {
    ...area,
    bufferKm: feature.properties?.bufferKm ?? area.proximityRadiusKm,
    geometry: feature.geometry,
  };
}

function distanceLabel(distanceKm) {
  if (!Number.isFinite(distanceKm)) return "";
  if (distanceKm < 0.1) return "dentro da área monitorada";
  return `${distanceKm.toFixed(1)} km da área monitorada`;
}

function classifyFireStatus(nearbyFoci, nearbyInpeEvents, nearbyCensipamEvents, sourcesReady) {
  const hasInpe = nearbyFoci.length > 0;
  const hasInpeEvent = nearbyInpeEvents.length > 0;
  const hasCensipam = nearbyCensipamEvents.length > 0;

  if ((hasInpe || hasInpeEvent) && hasCensipam) {
    return {
      level: "confirmed",
      label: "Fogo provável",
      color: "#ef4444",
      borderColor: "#ef4444",
      detailPrefix: "Detecção cruzada",
    };
  }

  if (hasInpeEvent || hasCensipam) {
    return {
      level: "probable",
      label: "Fogo provável",
      color: "#f97316",
      borderColor: "#f97316",
      detailPrefix: hasInpeEvent ? "Evento de Fogo consolidado" : "Evento consolidado",
    };
  }

  if (hasInpe) {
    return {
      level: "thermal",
      label: "Alerta térmico",
      color: "#eab308",
      borderColor: "#eab308",
      detailPrefix: "Ponto quente sem confirmação cruzada",
    };
  }

  return {
    level: sourcesReady ? "clear" : "unknown",
    label: sourcesReady ? "Sem foco" : "Sem leitura",
    color: "#94a3b8",
    borderColor: "rgba(100,116,139,0.4)",
    detailPrefix: null,
  };
}

export function QueimadasTab({ ctx }) {
  const {
    FIRE_MONITORED_AREAS_RS,
    censipamFireEvents,
    dark,
    formatDateTimeBR,
    inpeFireEvents,
    loadQueimadas,
    qLoading,
    queimadas,
    s,
    t,
  } = ctx;

  const fireRecords = Array.isArray(queimadas) ? queimadas : (queimadas?.records || []);
  const activeInpeFireEvents = inpeFireEvents?.active_records || [];
  const activeFireEvents = censipamFireEvents?.active_records_48h || [];
  const sourceAvailable = Boolean(queimadas?.ok || inpeFireEvents?.ok || censipamFireEvents?.ok);
  const sourcesReady = Boolean(queimadas?.ok && inpeFireEvents?.ok && censipamFireEvents?.ok);
  const monitoredAreas = FIRE_MONITORED_AREAS_RS.map((baseArea) => {
    const area = monitoredAreaWithGeometry(baseArea);
    const nearbyFoci = findNearbyFireFoci(area, fireRecords);
    const nearbyInpeEvents = findNearbyFireEvents(area, activeInpeFireEvents);
    const nearbyEvents = findNearbyFireEvents(area, activeFireEvents);
    const nearestDistance = Math.min(nearbyFoci[0]?.distanceKm ?? Infinity, nearbyInpeEvents[0]?.distanceKm ?? Infinity, nearbyEvents[0]?.distanceKm ?? Infinity);
    const sources = [
      nearbyFoci.length > 0 ? "INPE" : null,
      nearbyInpeEvents.length > 0 ? "INPE Eventos" : null,
      nearbyEvents.length > 0 ? "CENSIPAM" : null,
    ].filter(Boolean);
    const status = classifyFireStatus(nearbyFoci, nearbyInpeEvents, nearbyEvents, sourcesReady);

    return {
      area,
      hasFire: status.level === "confirmed" || status.level === "probable",
      hasThermalAlert: status.level === "thermal",
      nearestDistance,
      sources,
      status,
      latest: latestDetection(nearbyFoci, nearbyInpeEvents, nearbyEvents),
    };
  });

  return (
    <div style={{ display:"grid", gap:12 }}>
      <DefesaCivilNotice t={t} dark={dark} />

      <div style={{ padding:"10px 14px", background: dark?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:5, fontSize:10, color: dark?"#fdba74":"#c2410c", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <span>Monitoramento das principais áreas de preservação ambiental no trajeto pelas rodovias <strong>BR-116</strong>, <strong>BR-101</strong> e <strong>BR-471</strong>.</span>
        <button onClick={loadQueimadas} disabled={qLoading} style={{ background:"none", border:"1px solid rgba(249,115,22,0.5)", color:"#fdba74", padding:"5px 12px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:9, letterSpacing:1 }}>
          {qLoading ? "Consultando..." : "Atualizar"}
        </button>
      </div>

      <div style={{ ...s.card }}>
        <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>ÁREAS DE PRESERVAÇÃO MONITORADAS — BR-116, BR-101 E BR-471</div>
        <div style={{ fontSize:9, color:t.textMuted, marginBottom:12, lineHeight:1.5 }}>
          O status considera focos georreferenciados do INPE, Eventos de Fogo do INPE e Eventos de Fogo recentes do CENSIPAM nas áreas monitoradas ou próximos a elas.
        </div>

        {!sourceAvailable && !qLoading && (
          <div style={{ marginBottom:10, padding:"8px 10px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.22)", borderRadius:4, fontSize:9, color:t.textMuted }}>
            As fontes de focos estão indisponíveis nesta sessão. Atualize para tentar novamente.
          </div>
        )}

        <div style={{ display:"grid", gap:8 }}>
          {monitoredAreas.map(({ area, hasFire, hasThermalAlert, nearestDistance, sources, status, latest }) => (
            <div key={area.id} style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${hasFire || hasThermalAlert ? status.borderColor : t.border}`, borderRadius:5, padding:"10px 12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:8, color:t.textFaint, letterSpacing:1.3 }}>{area.region}</div>
                  <div style={{ fontSize:13, fontWeight:900, color:t.text, marginTop:2 }}>{area.name}</div>
                </div>
                <div style={{ fontSize:8, fontWeight:700, color:status.color, border:`1px solid ${status.borderColor}`, borderRadius:3, padding:"2px 7px", whiteSpace:"nowrap" }}>
                  {status.label}
                </div>
              </div>

              <div style={{ fontSize:9, color:t.textMuted, lineHeight:1.45, marginTop:6 }}>{area.focus}</div>

              <div style={{ fontSize:8, color:t.textFaint, marginTop:7 }}>
                {hasFire || hasThermalAlert
                  ? `${status.detailPrefix}: ${sources.join(" + ")} · última detecção: ${formatDateTimeBR(latest)}${distanceLabel(nearestDistance) ? ` · menor distância: ${distanceLabel(nearestDistance)}` : ""}`
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
          INPE Eventos de Fogo: eventos agregados em KML, separados entre ativos e em observação.<br />
          CENSIPAM Painel do Fogo: eventos consolidados com detecção nas últimas 48 horas.<br />
          INPE isolado é tratado como alerta térmico; fogo provável exige Evento de Fogo INPE, Evento de Fogo CENSIPAM ou cruzamento entre fontes.
        </div>
      </div>
    </div>
  );
}
