import { useEffect, useMemo, useState } from "react";
import { DefesaCivilNotice } from "../components/DefesaCivilNotice";
import { findNearbyFireEvents, findNearbyFireFoci } from "../utils/fireSpatial";

let monitoredAreaGeometriesPromise = null;
const monitoredAreasGeojsonUrl = `${import.meta.env.BASE_URL}data/fire-monitored-areas.geojson`;

function loadMonitoredAreaGeometries() {
  if (!monitoredAreaGeometriesPromise) {
    monitoredAreaGeometriesPromise = fetch(monitoredAreasGeojsonUrl)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("geojson indisponivel")))
      .then((geojson) => Object.fromEntries((geojson.features || []).map((feature) => [
        feature.properties?.id,
        feature,
      ]).filter(([id]) => Boolean(id))))
      .catch(() => ({}));
  }
  return monitoredAreaGeometriesPromise;
}

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

function monitoredAreaWithGeometry(area, monitoredAreaGeometries) {
  const feature = monitoredAreaGeometries[area.id];
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
  const [monitoredAreaGeometries, setMonitoredAreaGeometries] = useState({});

  useEffect(() => {
    let active = true;
    loadMonitoredAreaGeometries().then((geometries) => {
      if (active) setMonitoredAreaGeometries(geometries);
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceAvailable = Boolean(queimadas?.ok || inpeFireEvents?.ok || censipamFireEvents?.ok);
  const sourcesReady = Boolean(queimadas?.ok && inpeFireEvents?.ok && censipamFireEvents?.ok);
  const monitoredAreas = useMemo(() => FIRE_MONITORED_AREAS_RS.map((baseArea) => {
    const fireRecords = Array.isArray(queimadas) ? queimadas : (queimadas?.records || []);
    const activeInpeFireEvents = inpeFireEvents?.active_records || [];
    const activeFireEvents = censipamFireEvents?.active_records_48h || [];
    const area = monitoredAreaWithGeometry(baseArea, monitoredAreaGeometries);
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
  }), [FIRE_MONITORED_AREAS_RS, censipamFireEvents, inpeFireEvents, monitoredAreaGeometries, queimadas, sourcesReady]);
  const fireStats = {
    total: monitoredAreas.length,
    probable: monitoredAreas.filter(({ hasFire }) => hasFire).length,
    thermal: monitoredAreas.filter(({ hasThermalAlert }) => hasThermalAlert).length,
    clear: monitoredAreas.filter(({ status }) => status.level === "clear").length,
    unknown: monitoredAreas.filter(({ status }) => status.level === "unknown").length,
  };

  // Focos totais no estado (independente de área monitorada)
  const totalFocosEstado = useMemo(() => {
    const fireRecords = Array.isArray(queimadas) ? queimadas : (queimadas?.records || []);
    return fireRecords.length;
  }, [queimadas]);

  return (
    <div style={{ display:"grid", gap:12, fontSize:14 }}>
      <DefesaCivilNotice t={t} dark={dark} />

      <div className="sr-queimadas-toolbar">
        <span>Monitoramento das principais áreas de preservação ambiental no trajeto pelas rodovias <strong>BR-116</strong>, <strong>BR-101</strong> e <strong>BR-471</strong>.</span>
        <button onClick={loadQueimadas} disabled={qLoading} style={{ background:"none", border:"1px solid rgba(249,115,22,0.5)", color:"#fdba74", padding:"5px 12px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:9, letterSpacing:1 }}>
          {qLoading ? "Consultando..." : "Atualizar"}
        </button>
      </div>

      <div style={{ ...s.card }}>
        <div style={{ fontSize:12, color:t.textMuted, letterSpacing:1.4, marginBottom:6, textTransform:"uppercase" }}>ÁREAS DE PRESERVAÇÃO MONITORADAS — BR-116, BR-101 E BR-471</div>
        <div style={{ fontSize:11, color:t.textMuted, marginBottom:14, lineHeight:1.55 }}>
          O status considera focos georreferenciados do INPE, Eventos de Fogo do INPE e Eventos de Fogo recentes do CENSIPAM nas áreas monitoradas ou próximos a elas.
        </div>

        <div className="sr-mini-stat-grid" aria-label="Resumo das areas monitoradas">
          <div className="sr-mini-stat">
            <div className="sr-mini-stat-label">Areas</div>
            <div className="sr-mini-stat-value">{fireStats.total}</div>
          </div>
          <div className="sr-mini-stat">
            <div className="sr-mini-stat-label">Fogo provavel</div>
            <div className="sr-mini-stat-value" style={{ color:fireStats.probable ? "#f97316" : "#22c55e" }}>{fireStats.probable}</div>
          </div>
          <div className="sr-mini-stat">
            <div className="sr-mini-stat-label">Alerta termico</div>
            <div className="sr-mini-stat-value" style={{ color:fireStats.thermal ? "#eab308" : "#22c55e" }}>{fireStats.thermal}</div>
          </div>
          <div className="sr-mini-stat">
            <div className="sr-mini-stat-label">{fireStats.unknown ? "Sem leitura" : "Sem foco"}</div>
            <div className="sr-mini-stat-value" style={{ color:fireStats.unknown ? "#94a3b8" : "#22c55e" }}>{fireStats.unknown || fireStats.clear}</div>
          </div>
        </div>

        {!sourceAvailable && !qLoading && (
          <div style={{ marginBottom:12, padding:"10px 12px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.22)", borderRadius:6, fontSize:11, color:t.textMuted }}>
            As fontes de focos estão indisponíveis nesta sessão. Atualize para tentar novamente.
          </div>
        )}

        <div style={{ display:"grid", gap:10 }}>
          {monitoredAreas.map(({ area, hasFire, hasThermalAlert, nearestDistance, sources, status, latest }) => (
            <div key={area.id} className="sr-fire-card" style={{ "--sr-fire-accent": status.borderColor, background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${hasFire || hasThermalAlert ? status.borderColor : t.border}`, borderRadius:6, padding:"12px 14px 12px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:10, color:t.textFaint, letterSpacing:1.2 }}>{area.region}</div>
                  <div style={{ fontSize:15, fontWeight:900, color:t.text, marginTop:3, lineHeight:1.15 }}>{area.name}</div>
                </div>
                <div className="sr-fire-status-pill" style={{ color:status.color, border:`1px solid ${status.borderColor}` }}>
                  {status.label}
                </div>
              </div>

              <div style={{ fontSize:11, color:t.textMuted, lineHeight:1.5, marginTop:8 }}>{area.focus}</div>

              <div className="sr-queimadas-source-line" aria-label={`Fontes para ${area.name}`}>
                <span className="sr-source-badge is-official">INPE focos</span>
                <span className="sr-source-badge is-official">INPE Eventos</span>
                <span className="sr-source-badge is-derived">CENSIPAM</span>
                <span className="sr-source-badge is-context">Geocerca</span>
              </div>

              <div style={{ fontSize:10, color:t.textFaint, marginTop:10, lineHeight:1.5 }}>
                {hasFire || hasThermalAlert
                  ? `${status.detailPrefix}: ${sources.join(" + ")} · última detecção: ${formatDateTimeBR(latest)}${distanceLabel(nearestDistance) ? ` · menor distância: ${distanceLabel(nearestDistance)}` : ""}`
                  : sourcesReady ? "Nenhum foco recente identificado na área monitorada." : "Não foi possível confirmar a situação desta área nesta sessão."}
              </div>

              {!hasFire && !hasThermalAlert && totalFocosEstado > 0 && (
                <div style={{ marginTop:10, padding:"9px 10px", borderRadius:6, background: dark?"rgba(245,158,11,0.08)":"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.22)", color:"#f59e0b", fontSize:10, lineHeight:1.45 }}>
                  ⚠ {totalFocosEstado} foco{totalFocosEstado > 1 ? "s" : ""} detectado{totalFocosEstado > 1 ? "s" : ""} no RS, fora das áreas BRs 101, 116 e 471 monitoradas.
                </div>
              )}
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
