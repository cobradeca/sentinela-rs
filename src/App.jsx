import { useState, useEffect, useCallback, useRef } from "react";
import { usePush } from "./hooks/usePush";

// ─── BLOCO C: frescor do dado ─────────────────────────────────────────────────
function dataStaleness(measuredAt) {
  if (!measuredAt) return "unknown";
  const ageMin = (Date.now() - new Date(measuredAt).getTime()) / 60000;
  if (ageMin <= 180)  return "fresh";
  if (ageMin <= 1440) return "attention";
  return "stale";
}

function StaleBadge({ measuredAt, fallback, fallbackAgeMin, t }) {
  const status = fallback ? "stale" : dataStaleness(measuredAt);
  const cfg = {
    fresh:     { label: "Atualizado",    color: "#22c55e", dot: "●" },
    attention: { label: "Atenção",       color: "#eab308", dot: "◐" },
    stale:     { label: "Desatualizado", color: "#ef4444", dot: "○" },
    unknown:   { label: "Sem horário",   color: "#64748b", dot: "–" },
  }[status];
  const age = fallback && fallbackAgeMin
    ? ` · ${fallbackAgeMin}min atrás`
    : measuredAt
    ? ` · ${Math.round((Date.now()-new Date(measuredAt).getTime())/60000)}min atrás`
    : "";
  return (
    <span style={{ fontSize:8, color:cfg.color, fontWeight:600 }}>
      {cfg.dot} {cfg.label}{age}
    </span>
  );
}

// ─── ESTAÇÕES ────────────────────────────────────────────────────────────────
const STATIONS_LAGOA = [
  { id: "lagoa_patos_poa",      name: "Itapuã",                   displayName: "Lagoa dos Patos — Itapuã",              lat: -30.36, lon: -51.03, type: "lagoa", anaCode: "87450004", sourceHint: "RADAR", ordemEscoamento: 1 },
  { id: "lagoa_patos_arambare", name: "Arambaré",                 displayName: "Lagoa dos Patos — Arambaré",            lat: -30.91, lon: -51.50, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 2 },
  { id: "lagoa_sao_lourenco",   name: "São Lourenço do Sul",      displayName: "Lagoa dos Patos — São Lourenço do Sul", lat: -31.36, lon: -51.98, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 3 },
  { id: "lagoa_patos_pelotas",  name: "Pelotas / Laranjal",       displayName: "Lagoa dos Patos — Pelotas / Laranjal",  lat: -31.77, lon: -52.34, type: "lagoa", sourceHint: "HIDROSENS", ordemEscoamento: 4 },
  { id: "lagoa_sao_jose_norte", name: "São José do Norte",        displayName: "Lagoa dos Patos — São José do Norte",   lat: -32.02, lon: -52.04, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 5 },
  { id: "lagoa_rio_grande",     name: "Rio Grande / FURG CCMAR",  displayName: "Lagoa dos Patos — Rio Grande / Barra",  lat: -32.03, lon: -52.10, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 6 },
];

// Municípios com histórico real de enchentes no RS — dashboard em ordem decrescente de densidade demográfica
const STATIONS_CIDADES = [
  { id: "rs_porto_alegre",  name: "Porto Alegre",    lat: -30.03, lon: -51.23, type: "cidade", ibgeCode: "4314902", rioRef: "Guaíba — enchente mai/2024", demDensity: 2681 },
  { id: "rs_canoas",        name: "Canoas",          lat: -29.92, lon: -51.18, type: "cidade", ibgeCode: "4304606", rioRef: "Lago Guaíba / Gravataí", demDensity: 2654 },
  { id: "rs_sao_leopoldo",  name: "São Leopoldo",    lat: -29.76, lon: -51.14, type: "cidade", ibgeCode: "4318705", rioRef: "Rio dos Sinos", demDensity: 2131 },
  { id: "rs_lajeado",       name: "Lajeado",         lat: -29.47, lon: -51.96, type: "cidade", ibgeCode: "4311403", rioRef: "Rio Taquari — recorde 2023", demDensity: 1032 },
  { id: "rs_caxias_sul",    name: "Caxias do Sul",   lat: -29.17, lon: -51.17, type: "cidade", ibgeCode: "4305108", rioRef: "Bacia do Caí", demDensity: 282 },
  { id: "rs_passo_fundo",   name: "Passo Fundo",     lat: -28.26, lon: -52.41, type: "cidade", ibgeCode: "4314100", rioRef: "Rio Passo Fundo", demDensity: 263 },
  { id: "rs_pelotas",       name: "Pelotas",         lat: -31.77, lon: -52.34, type: "cidade", ibgeCode: "4314407", rioRef: "Canal São Gonçalo", demDensity: 202 },
  { id: "rs_santa_maria",   name: "Santa Maria",     lat: -29.68, lon: -53.81, type: "cidade", ibgeCode: "4316907", rioRef: "Bacia do Vacacaí", demDensity: 153 },
  { id: "rs_rio_grande",    name: "Rio Grande",      lat: -32.03, lon: -52.10, type: "cidade", ibgeCode: "4315602", rioRef: "Lagoa dos Patos / litoral", demDensity: 68 },
  { id: "rs_cachoeira_sul", name: "Cachoeira do Sul",lat: -29.88, lon: -52.89, type: "cidade", ibgeCode: "4303004", rioRef: "Rio Jacuí", demDensity: 21 },
];

const STATIONS = [...STATIONS_CIDADES];
const ALL_STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];

const APAS_RS = [
  { id: "apa_banhado_grande", name: "APA Banhado Grande",        lat: -29.85, lon: -50.85, municipio: "Glorinha/Viamão" },
  { id: "apa_rota_sol",       name: "APA Rota do Sol",           lat: -29.40, lon: -50.10, municipio: "Serra Gaúcha" },
  { id: "apa_balneario",      name: "APA Balneário Pinhal",      lat: -30.22, lon: -50.21, municipio: "Palmares do Sul" },
  { id: "apa_litoral_medio",  name: "APA Litoral Médio",         lat: -30.80, lon: -50.22, municipio: "Mostardas/Tavares" },
  { id: "rebio_sao_donato",   name: "REBIO São Donato",          lat: -28.28, lon: -54.87, municipio: "São Nicolau" },
  { id: "esec_taim",          name: "Estação Ecológica do Taim", lat: -32.55, lon: -52.60, municipio: "Rio Grande/Santa Vitória" },
  { id: "parna_aparados",     name: "PARNA Aparados da Serra",   lat: -29.15, lon: -50.07, municipio: "Cambará do Sul" },
  { id: "parna_lagoa_peixe",  name: "PARNA Lagoa do Peixe",      lat: -31.25, lon: -51.05, municipio: "Mostardas" },
];

const FIRE_MONITORED_AREAS_RS = [
  { id:"delta_jacui", name:"Porto Alegre / Delta do Jacuí", lat:-30.03, lon:-51.23, focus:"interface urbana, banhados e fumaça sobre a capital" },
  { id:"itapua_viamao", name:"Viamão / Itapuã", lat:-30.36, lon:-51.03, focus:"parques, campos, margem norte da Lagoa" },
  { id:"lagoa_peixe", name:"Mostardas / Lagoa do Peixe", lat:-31.25, lon:-51.05, focus:"unidade de conservação, restinga e banhados" },
  { id:"sao_lourenco", name:"São Lourenço do Sul", lat:-31.36, lon:-51.98, focus:"margem oeste da Lagoa e áreas rurais" },
  { id:"pelotas_laranjal", name:"Pelotas / Laranjal", lat:-31.77, lon:-52.34, focus:"orla, banhados e transição urbano-rural" },
  { id:"rio_grande_taim", name:"Rio Grande / Taim", lat:-32.55, lon:-52.60, focus:"ESEC Taim, campos, banhados e fumaça costeira" },
  { id:"santa_vitoria_chui", name:"Santa Vitória do Palmar / Chuí", lat:-33.52, lon:-53.37, focus:"extremo sul, campos e fronteira" },
];

const RISK_LEVELS = {
  NORMAL:     { label: "Normal",     color: "#22c55e", bg: "#052e16", bgLight: "#dcfce7", colorLight: "#15803d", icon: "✓" },
  ATENCAO:    { label: "Atenção",    color: "#eab308", bg: "#1c1a05", bgLight: "#fef9c3", colorLight: "#a16207", icon: "⚠" },
  ALERTA:     { label: "Alerta",     color: "#f97316", bg: "#1c0a05", bgLight: "#ffedd5", colorLight: "#c2410c", icon: "▲" },
  EMERGENCIA: { label: "Emergência", color: "#ef4444", bg: "#1c0505", bgLight: "#fee2e2", colorLight: "#b91c1c", icon: "⬆" },
  CRITICO:    { label: "Crítico",    color: "#dc2626", bg: "#1c0000", bgLight: "#fecaca", colorLight: "#991b1b", icon: "☠" },
};

const dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const DEFESA_CIVIL_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs";
const INMET_FORECAST_BASE_URL = "https://apiprevmet3.inmet.gov.br/previsao";
const INMET_PREVISAO_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/inmet-previsao";
const CEMADEN_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cemaden-rs";
const CEMADEN_ATTRIBUTION = "DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC";
const ANA_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/ana-rs";
const LAGOA_RADAR_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/lagoa-patos-radar";
const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";
const NOAA_ENSO_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/noaa-enso";
const IRI_ENSO_PROB_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/iri-enso-probabilidades";
const CPTEC_INPE_PRODUCTS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cptec-inpe-produtos";
const INPE_QUEIMADAS_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/inpe-queimadas-rs";
const ICMBIO_UCS_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/icmbio-ucs-rs";
const NOTIFICATION_HEALTH_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/notification-health";
const COPERNICUS_WATER_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-water";
const COPERNICUS_SENTINEL1_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-sentinel1-water";
const COPERNICUS_NDVI_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-ndvi";
const COPERNICUS_EMS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/copernicus-ems";
const COPERNICUS_EMS_RAPID_INFO_URL = "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations-info/";
const COPERNICUS_EMS_RAPID_DETAIL_URL = "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/";
const COPERNICUS_EMS_RRM_URL = "https://riskandrecovery.emergency.copernicus.eu/api/public-activations/";

// ENSO — estado base não operacional.
const ENSO_UNAVAILABLE = {
  nino34: null,
  oni3m: null,
  phase: "UNAVAILABLE",
  referenceDate: null,
  referenceSource: "NOAA/CPC indisponível",
  prob: null,
  superThreshold: 1.5,
  forecast: [],
};

// Copernicus histórico foi removido da superfície principal.
// A aba Copernicus deve mostrar apenas endpoints reais ativos ou mensagens de integração pendente.
const COPERNICUS_REFERENCE = {
  themes: [],
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function getRiskLevel(precipAccum, tempMin, windMax, lagoaLevel = null) {
  let score = 0;
  if (precipAccum > 150) score += 4; else if (precipAccum > 80) score += 3;
  else if (precipAccum > 40) score += 2; else if (precipAccum > 20) score += 1;
  // Temperatura: limiar revisado para RS. < 10°C é frequente no inverno gaúcho
  // sem associação a risco de catástrofe — removido como gatilho.
  // < 5°C → Atenção; < 0°C → Alerta (geada/gelo operacional).
  if (tempMin < 0) score += 3; else if (tempMin < 5) score += 2;
  if (windMax > 80) score += 3; else if (windMax > 50) score += 2; else if (windMax > 30) score += 1;
  // ENSO é contexto climático, não alerta operacional local. Não entra no score das cidades.
  if (lagoaLevel !== null) {
    // Nível da Lagoa não usa mais limiar genérico. O risco por nível é calculado por estação, usando threshold_m próprio.
  }
  if (score >= 9) return "CRITICO";
  if (score >= 6) return "EMERGENCIA";
  if (score >= 4) return "ALERTA";
  if (score >= 2) return "ATENCAO";
  return "NORMAL";
}

function classifyENSO(a) {
  if (a === null || a === undefined || Number.isNaN(Number(a))) return { label:"Indisponível", color:"#64748b", icon:"–" };
  if (a >= 2.0)   return { label:"Super El Niño",   color:"#dc2626", icon:"🔴" };
  if (a >= 1.5)   return { label:"El Niño Forte",   color:"#ef4444", icon:"🟠" };
  if (a >= 0.5)   return { label:"El Niño",         color:"#f97316", icon:"🟡" };
  if (a > -0.5)   return { label:"Neutro",          color:"#22c55e", icon:"🟢" };
  if (a > -1.5)   return { label:"La Niña",         color:"#3b82f6", icon:"🔵" };
  if (a > -2.0)   return { label:"La Niña Forte",   color:"#1d4ed8", icon:"🟣" };
  return           { label:"Super La Niña",         color:"#1e3a8a", icon:"⚫" };
}

function formatSignedCelsius(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}°C`
    : "indisponível";
}

function formatProbability(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${(value * 100).toFixed(0)}%`
    : "indisponível";
}

function percentValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value * 100 : 0;
}

function safeEnsoForecast(forecast) {
  return Array.isArray(forecast) ? forecast : [];
}

function getDominantEnsoPhase(prob) {
  const items = [
    { key: "elNino", label: "El Niño", value: prob?.elNino, color: "#f97316" },
    { key: "neutral", label: "Neutro", value: prob?.neutral, color: "#22c55e" },
    { key: "laNina", label: "La Niña", value: prob?.laNina, color: "#3b82f6" },
  ].filter((item) => typeof item.value === "number" && Number.isFinite(item.value));

  if (!items.length) return null;
  return items.sort((a, b) => b.value - a.value)[0];
}

function formatDominantEnsoProbability(prob, period = "") {
  const dominant = getDominantEnsoPhase(prob);
  if (!dominant) return "Probabilidade IRI/CCSR indisponível";
  const prefix = dominant.key === "neutral" ? "Cenário mais provável" : "Evento mais provável";
  return `${prefix}: ${dominant.label} ${formatProbability(dominant.value)}${period ? ` · ${period}` : ""}`;
}


// NOAA/CPC + IRI — ENSO real via Edge Function.
// Atualiza Niño 3.4 e ONI. Probabilidades IRI permanecem como camada separada até integração própria.
async function fetchNoaaEnso() {
  try {
    const res = await fetch(NOAA_ENSO_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || !data?.enso) return null;

    return data.enso;
  } catch {
    return null;
  }
}



// CPTEC/INPE — produtos oficiais sazonais/subsazonais por imagem.
// São dados reais oficiais publicados como PNG, não série numérica JSON.
async function fetchCptecInpeProducts() {
  try {
    const res = await fetch(CPTEC_INPE_PRODUCTS_FUNCTION_URL, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data?.products)) return null;

    return data;
  } catch {
    return null;
  }
}

async function fetchCopernicusWater(aoi = "lagoa_patos", days = 30) {
  try {
    const url = `${COPERNICUS_WATER_FUNCTION_URL}?aoi=${encodeURIComponent(aoi)}&days=${encodeURIComponent(days)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.ok !== true || typeof data.water_percent !== "number") return data || null;

    return data;
  } catch {
    return null;
  }
}

async function fetchCopernicusSentinel1(aoi = "lagoa_patos", days = 18) {
  try {
    const url = `${COPERNICUS_SENTINEL1_FUNCTION_URL}?aoi=${encodeURIComponent(aoi)}&days=${encodeURIComponent(days)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || typeof data.water_like_percent !== "number") return data || null;

    return data;
  } catch {
    return null;
  }
}

async function fetchCopernicusNdvi(aoi = "entorno_lagoa_patos", days = 30) {
  try {
    const url = `${COPERNICUS_NDVI_FUNCTION_URL}?aoi=${encodeURIComponent(aoi)}&days=${encodeURIComponent(days)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || typeof data.ndvi_mean !== "number") return data || null;

    return data;
  } catch {
    return null;
  }
}

async function fetchCopernicusEms() {
  try {
    const res = await fetch(COPERNICUS_EMS_FUNCTION_URL, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;

    const data = await res.json();
    return data?.ok ? data : null;
  } catch {
    return fetchCopernicusEmsDirect();
  }
}

async function fetchCopernicusEmsDirect() {
  try {
    const [infoRes, rapidRes, rrmRes] = await Promise.all([
      fetch(`${COPERNICUS_EMS_RAPID_INFO_URL}?limit=100`, { signal: AbortSignal.timeout(30000) }),
      fetch(`${COPERNICUS_EMS_RAPID_DETAIL_URL}?code=EMSR720`, { signal: AbortSignal.timeout(30000) }),
      fetch(`${COPERNICUS_EMS_RRM_URL}?code=EMSN194`, { signal: AbortSignal.timeout(30000) }),
    ]);
    if (!infoRes.ok || !rapidRes.ok || !rrmRes.ok) return null;

    const [info, rapid, rrm] = await Promise.all([infoRes.json(), rapidRes.json(), rrmRes.json()]);
    const rapidRs = rapid?.results?.[0] || null;
    const rrmRs = rrm?.results?.[0] || null;
    const recentBrazilFloods = (info?.results || [])
      .filter((item) => (item.countries || []).some((c) => String(c?.name || c).toLowerCase() === "brazil") && String(item.category || "").toLowerCase().includes("flood"))
      .slice(0, 8)
      .map((item) => ({
        code:item.code, name:item.name, category:item.category, activationTime:item.activationTime, closed:item.closed,
        n_aois:item.n_aois ?? item.aois?.length ?? 0, n_products:item.n_products ?? 0,
        viewerUrl:`https://mapping.emergency.copernicus.eu/activations/${item.code}`,
      }));

    return {
      ok: true,
      source: "Copernicus EMS Mapping public APIs (direto)",
      fetched_at: new Date().toISOString(),
      rapid_mapping: {
        recent_brazil_floods: recentBrazilFloods,
        rs_2024: rapidRs && {
          code: rapidRs.code,
          name: rapidRs.name,
          category: rapidRs.category,
          activationTime: rapidRs.activationTime,
          closed: rapidRs.closed,
          reportLink: rapidRs.reportLink,
          productsPath: rapidRs.productsPath,
          stats: rapidRs.stats,
          aois: (rapidRs.aois || []).map((a) => ({
            name: a.name,
            number: a.number,
            products: (a.products || []).map((p) => ({ type:p.type, mapsCount:p.mapsCount, downloadPath:p.downloadPath, layers:p.layers || [] })),
          })),
        },
      },
      risk_recovery: {
        rs_2024: rrmRs && {
          code: rrmRs.code,
          name: rrmRs.name,
          category: rrmRs.category,
          activationTime: rrmRs.activationTime,
          closed: rrmRs.closed,
          viewerUrl: rrmRs.viewerUrl,
          storyMapUrl: rrmRs.storyMapUrl,
          generalArcgisLayers: rrmRs.GeneralArcGISRestAPILayers || [],
          products: (rrmRs.products || []).map((p) => ({
            productName:p.productName,
            productAcronym:p.productAcronym,
            analysisName:p.analysisName,
            statusCode:p.statusCode,
            mapsCount:p.mapsCount,
            versionDelivery:p.versionDelivery,
            arcgisLayers:p.ProductArcGISRestAPILayers || [],
            aois:(p.linkedAois || []).map((a)=>({ aoiNumber:a.aoiNumber, aoiName:a.aoiName, sqkm:a.sqkm })),
          })),
        },
      },
      operational_use: "CEMS EMSR/EMSN é produto oficial pós-evento. No Sentinela-RS entra como camada de referência e resposta a desastre; não aciona alerta automático sozinho.",
    };
  } catch {
    return null;
  }
}

// IRI/CCSR — Probabilidades ENSO reais via Edge Function.
// Substitui as probabilidades estáticas quando disponível.
async function fetchIriEnsoProbabilities() {
  try {
    const res = await fetch(IRI_ENSO_PROB_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || !data?.prob || !Array.isArray(data?.forecast)) return null;

    return {
      prob: data.prob,
      forecast: data.forecast,
      probabilitySource: data.source,
      probabilityReferenceDate: data.referenceDate,
      probabilityDynamic: true,
      probabilityFetchedAt: data.fetched_at,
      probabilityParsing: data.parsing,
    };
  } catch {
    return null;
  }
}

// Previsão 14 dias via Open-Meteo (forecast_days=14)
async function fetchWeather14Days(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=America%2FSao_Paulo&forecast_days=14`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error("Open-Meteo indisponível");
  return res.json();
}


// Lagoa dos Patos — sensores RADAR do portal de monitoramento.
// Fonte principal para pontos onde a ANA não retorna nível operacional.

// HidroSens/UFPel — Estação Laranjal / Pelotas.
// Fonte específica para o ponto Pelotas/Laranjal, via ThingsBoard público.
async function fetchHidroSensLaranjalLevel() {
  const cached = readFallbackCache(HIDROSENS_LARANJAL_CACHE_KEY);

  try {
    const res = await fetch(HIDROSENS_LARANJAL_FUNCTION_URL, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return cached || null;

    const data = await res.json();
    if (!data?.ok || typeof data.level_m !== "number") return cached || null;

    const ageMinutes = typeof data.age_minutes === "number"
      ? data.age_minutes
      : data.measured_at
      ? Math.round((Date.now() - new Date(data.measured_at).getTime()) / 60000)
      : null;
    const readingOlderThan24h = typeof ageMinutes === "number" && ageMinutes > 1440;
    const live = {
      ok: true,
      station_id: data.station_id,
      name: data.name,
      source_label: "HidroSens/UFPel",
      measured_at: data.measured_at,
      received_at: data.fetched_at,
      level_m: data.level_m,
      level_cm: data.level_cm,
      distance_m: data.distance_m,
      sensor_height_m: data.sensor_height_m,
      operational: !readingOlderThan24h,
      stale: readingOlderThan24h,
      age_minutes: ageMinutes,
      threshold_m: data.threshold_m ?? 1.20,
      threshold_cm: data.threshold_cm ?? 120,
      critical_threshold_m: data.critical_threshold_m ?? 1.40,
      critical_threshold_cm: data.critical_threshold_cm ?? 140,
      max_may_2024_m: data.max_may_2024_m ?? 2.40,
      max_may_2024_cm: data.max_may_2024_cm ?? 240,
      status: readingOlderThan24h ? "SEM_LEITURA" : (data.level_m >= 1.40 ? "ALERTA" : data.level_m >= 1.20 ? "ATENCAO" : "NORMAL"),
      note: data.note,
    };

    if (live.operational) saveFallbackCache(HIDROSENS_LARANJAL_CACHE_KEY, live);
    return live;
  } catch {
    return cached || null;
  }
}

async function fetchLagoaRadarLevels() {
  const cached = readFallbackCache(LAGOA_RADAR_CACHE_KEY);

  try {
    const res = await fetch(LAGOA_RADAR_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return cached ? markRadarFallback(cached) : {};

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.sensors)) {
      return cached ? markRadarFallback(cached) : {};
    }

    const live = Object.fromEntries(
      data.sensors
        .filter((sensor) => sensor?.ok && sensor?.station_id)
        .map((sensor) => [sensor.station_id, sensor])
    );

    if (Object.keys(live).length > 0) {
      saveFallbackCache(LAGOA_RADAR_CACHE_KEY, live);
      return live;
    }

    return cached ? markRadarFallback(cached) : {};
  } catch {
    return cached ? markRadarFallback(cached) : {};
  }
}

function radarRiskToLevel(status) {
  if (status === "ALERTA") return "ALERTA";
  if (status === "ATENCAO") return "ATENCAO";
  return "NORMAL";
}

const LAGOA_FALLBACK_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const LAGOA_RADAR_CACHE_KEY = "sentinela_rs_lagoa_radar_last_valid_v1";
const HIDROSENS_LARANJAL_CACHE_KEY = "sentinela_rs_hidrosens_laranjal_last_valid_v1";
// BLOCO B — histórico em localStorage (ring buffer 48 pontos ~24h @ 30min)
const LAGOA_HISTORY_KEY = "sentinela_rs_lagoa_history_v1";
const HISTORY_MAX_POINTS = 48;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(LAGOA_HISTORY_KEY) || "{}"); } catch { return {}; }
}

function appendHistory(stationId, level_m, measuredAt) {
  if (typeof level_m !== "number") return;
  const all = loadHistory();
  const arr = all[stationId] || [];
  const last = arr[arr.length - 1];
  // evita duplicatas de mesmo horário
  if (last && last.t === measuredAt) return;
  arr.push({ t: measuredAt || new Date().toISOString(), v: level_m });
  if (arr.length > HISTORY_MAX_POINTS) arr.splice(0, arr.length - HISTORY_MAX_POINTS);
  all[stationId] = arr;
  try { localStorage.setItem(LAGOA_HISTORY_KEY, JSON.stringify(all)); } catch {}
}

function Sparkline({ points, color, t }) {
  if (!points || points.length < 2) return <div style={{ fontSize:8, color:t.textFaint }}>sem histórico</div>;
  const vals = points.map(p => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 0.01;
  const W = 180, H = 36;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map(p => H - ((p.v - min) / range) * H);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const lastV = points[points.length - 1].v;
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ fontSize:8, color:t.textMuted, marginBottom:3 }}>HISTÓRICO ~24h ({points.length} leituras)</div>
      <svg width={W} height={H + 4} style={{ display:"block" }}>
        <polyline points={xs.map((x,i)=>`${x},${ys[i]}`).join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85"/>
        <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="2.5" fill={color}/>
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, color:t.textFaint, marginTop:2 }}>
        <span>mín {min.toFixed(2)}m</span>
        <span style={{ color }}>{lastV.toFixed(2)}m agora</span>
        <span>máx {max.toFixed(2)}m</span>
      </div>
    </div>
  );
}

function saveFallbackCache(key, data) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify({
      saved_at: new Date().toISOString(),
      data,
    }));
  } catch {}
}

function readFallbackCache(key, maxAgeMs = LAGOA_FALLBACK_MAX_AGE_MS) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAtMs = new Date(parsed.saved_at || 0).getTime();
    if (!savedAtMs || Date.now() - savedAtMs > maxAgeMs) return null;

    return {
      ...parsed.data,
      fallback: true,
      fallback_saved_at: parsed.saved_at,
      fallback_age_minutes: Math.round((Date.now() - savedAtMs) / 60000),
    };
  } catch {
    return null;
  }
}

function markRadarFallback(map) {
  if (!map || typeof map !== "object") return {};
  return Object.fromEntries(
    Object.entries(map).map(([id, sensor]) => [
      id,
      {
        ...sensor,
        fallback: true,
        fallback_saved_at: map.fallback_saved_at || sensor?.fallback_saved_at || null,
        fallback_age_minutes: map.fallback_age_minutes ?? sensor?.fallback_age_minutes ?? null,
      },
    ])
  );
}


function formatDateTimeBR(value) {
  if (!value) return "sem horário";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lagoaStatusLabel(status) {
  if (status === "ALERTA") return "Acima da cota";
  if (status === "ATENCAO") return "Atenção";
  if (status === "NORMAL") return "Normal";
  if (status === "SEM_LIMIAR") return "Dado real";
  if (status === "SEM_LEITURA") return "Sem leitura";
  return "Sem leitura";
}

function lagoaStatusColor(status) {
  if (status === "ALERTA") return "#f97316";
  if (status === "ATENCAO") return "#eab308";
  if (status === "NORMAL") return "#22c55e";
  if (status === "SEM_LIMIAR") return "#22c55e";
  return "#64748b";
}

function getLagoaPointData(point, stationData) {
  return stationData?.[point.id] || null;
}

function getLagoaSourceText(lagoa) {
  if (!lagoa?.isReal) return "Sem leitura";
  const suffix = lagoa?.isFallback ? " · última salva" : "";
  if (lagoa?.hidrosens) return "HidroSens/UFPel" + suffix;
  if (lagoa?.radar) return "RADAR Lagoa dos Patos" + suffix;
  if (lagoa?.anaLevel !== null && lagoa?.anaLevel !== undefined) return "ANA HidroWeb";
  return "Fonte validada" + suffix;
}

function getResponsibleAgencyText(source) {
  const text = String(source || "").toUpperCase();
  if (text.includes("HIDROSENS")) return "HidroSens/UFPel";
  if (text.includes("RADAR")) return "Rede RADAR Lagoa dos Patos";
  if (text.includes("ANA")) return "ANA HidroWeb";
  if (text.includes("CEMADEN")) return "CEMADEN/MCTI";
  if (text.includes("INMET")) return "INMET";
  if (text.includes("DEFESA")) return "Defesa Civil RS";
  if (text.includes("COPERNICUS")) return "Copernicus Data Space / Sentinel Hub";
  if (text.includes("NOAA") || text.includes("IRI")) return "NOAA/CPC ou IRI/CCSR";
  return "órgão responsável pela fonte";
}

function getFallbackWarningText(source, ageMinutes = null) {
  const ageText = typeof ageMinutes === "number" ? ` há ${ageMinutes} min` : "";
  return `Fonte primária indisponível. Exibindo última leitura válida salva${ageText}. Verifique a informação junto ao órgão responsável: ${getResponsibleAgencyText(source)}.`;
}

function getLagoaMeasuredAt(lagoa) {
  return lagoa?.hidrosens?.measured_at || lagoa?.radar?.measured_at || null;
}

function getLagoaMaxMay2024(lagoa) {
  return lagoa?.hidrosens?.max_may_2024_m ?? lagoa?.radar?.max_may_2024_m ?? null;
}

function getLagoaSummary(stationData) {
  const points = STATIONS_LAGOA
    .map((point) => ({ point, data: stationData?.[point.id] }))
    .filter((item) => item.data?.lagoa?.isReal);

  const above = points.filter(({ data }) => data.lagoa?.levelStatus === "ALERTA").length;
  const attention = points.filter(({ data }) => data.lagoa?.levelStatus === "ATENCAO").length;

  const latestMs = Math.max(
    0,
    ...points
      .map(({ data }) => new Date(getLagoaMeasuredAt(data.lagoa) || 0).getTime())
      .filter((value) => Number.isFinite(value))
  );

  const thresholdValidated = points.filter(({ data }) => typeof data.lagoa?.threshold_m === "number").length;
  const withoutThreshold = points.filter(({ data }) => data.lagoa?.isReal && typeof data.lagoa?.threshold_m !== "number").length;

  return {
    monitored: points.length,
    total: STATIONS_LAGOA.length,
    above,
    attention,
    thresholdValidated,
    withoutThreshold,
    latest: latestMs ? new Date(latestMs).toISOString() : null,
  };
}


// ANA HidroWeb — nível real via Supabase Edge Function.
// A função ana-rs consulta a ANA com datas reais, lê <Nivel> e converte cm → m.
async function fetchAnaLevel(anaCode) {
  try {
    const res = await fetch(`${ANA_RS_FUNCTION_URL}?codEstacao=${encodeURIComponent(anaCode)}`, {
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (!data?.ok || typeof data?.latest?.level_m !== "number") {
      return null;
    }

    return data.latest.level_m;
  } catch {
    return null;
  }
}

// INPE BDQueimadas
async function fetchQueimadas() {
  try {
    const res = await fetch(`${INPE_QUEIMADAS_RS_FUNCTION_URL}?days=2&limit=100`, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function fetchIcmbioUcsRs() {
  try {
    const res = await fetch(`${ICMBIO_UCS_RS_FUNCTION_URL}?priority=true&limit=30`, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function fetchNotificationHealth() {
  try {
    const res = await fetch(NOTIFICATION_HEALTH_FUNCTION_URL, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}



// CEMADEN — chuva observada por acumulados recentes.
// O token fica no Supabase Secret CEMADEN_PED_TOKEN, nunca no App.jsx.
async function mapWithConcurrency(items, limit, worker) {
  const results = [];
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      try {
        results[currentIndex] = { status: "fulfilled", value: await worker(items[currentIndex], currentIndex) };
      } catch (reason) {
        results[currentIndex] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, runWorker);
  await Promise.allSettled(workers);
  return results;
}

async function fetchCemadenAccumulations() {
  try {
    const res = await fetch(CEMADEN_RS_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return {};

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.cities)) return {};

    return Object.fromEntries(
      data.cities
        .filter((city) => city?.ok && city?.city_id)
        .map((city) => [city.city_id, city])
    );
  } catch {
    return {};
  }
}

function formatCemadenRain(cemaden) {
  if (!cemaden) return "";
  const acc24 = typeof cemaden.max_acc24hr === "number" ? cemaden.max_acc24hr : null;
  const acc6 = typeof cemaden.max_acc6hr === "number" ? cemaden.max_acc6hr : null;

  if (acc24 !== null) return `chuva observada 24h ${acc24.toFixed(1)}mm`;
  if (acc6 !== null) return `chuva observada 6h ${acc6.toFixed(1)}mm`;

  return "chuva observada disponível";
}

function explainCityRisk(station, d, ensoText = "") {
  if (!d || d.error) {
    return {
      title: `${station?.name || "Cidade"} — sem dados suficientes`,
      lines: ["Não foi possível carregar todos os parâmetros necessários para classificar esta cidade."],
      note: "Sem simulação: quando uma fonte não responde, o app mostra indisponibilidade."
    };
  }

  const lines = [];
  const precip = typeof d.precip === "number" ? d.precip : null;
  const tempMin = typeof d.tempMin === "number" ? d.tempMin : null;
  const windMax = typeof d.windMax === "number" ? d.windMax : null;

  if (precip !== null) {
    if (precip > 150) lines.push(`A previsão soma ${precip.toFixed(0)}mm de chuva em 14 dias, um volume muito alto para acompanhar de perto.`);
    else if (precip > 80) lines.push(`A previsão soma ${precip.toFixed(0)}mm de chuva em 14 dias, volume alto o suficiente para elevar a atenção.`);
    else if (precip > 40) lines.push(`A previsão soma ${precip.toFixed(0)}mm de chuva em 14 dias. É chuva moderada, ainda sem sinal severo isolado.`);
    else if (precip > 20) lines.push(`A previsão soma ${precip.toFixed(0)}mm de chuva em 14 dias. Por enquanto, é um cenário de acompanhamento.`);
    else lines.push(`A previsão soma apenas ${precip.toFixed(0)}mm de chuva em 14 dias, sem pressão relevante por chuva acumulada.`);
  }

  if (tempMin !== null) {
    if (tempMin < 0) lines.push(`A mínima prevista chega a ${tempMin.toFixed(1)}°C, com risco de geada ou gelo.`);
    else if (tempMin < 5) lines.push(`A mínima prevista é de ${tempMin.toFixed(1)}°C. É frio suficiente para entrar em atenção no RS.`);
    else lines.push(`A mínima prevista é de ${tempMin.toFixed(1)}°C. Esse frio não aumenta o nível de atenção agora.`);
  }

  if (windMax !== null) {
    if (windMax > 80) lines.push(`As rajadas podem chegar a ${windMax.toFixed(0)}km/h, faixa de vento muito forte.`);
    else if (windMax > 50) lines.push(`As rajadas podem chegar a ${windMax.toFixed(0)}km/h, vento forte para acompanhar.`);
    else if (windMax > 30) lines.push(`As rajadas podem chegar a ${windMax.toFixed(0)}km/h. Ainda é atenção leve por vento.`);
    else lines.push(`O vento previsto chega a ${windMax.toFixed(0)}km/h, baixo demais para aumentar o nível de atenção.`);
  }

  if (d.cemaden) lines.push(`CEMADEN: ${formatCemadenRain(d.cemaden)}.`);
  else lines.push("CEMADEN: sem estação ativa ou sem acumulado validado para esta cidade no período. Ausência de dado não significa ausência de chuva.");

  const riskLabel = RISK_LEVELS[d.risk]?.label || d.risk || "Indefinido";

  return {
    title: `${station?.name || "Cidade"} — ${riskLabel}`,
    lines,
    note: `Regra: status calculado por parâmetros locais — chuva prevista, temperatura mínima, vento, CEMADEN e nível quando houver estação. ENSO é contexto climático${ensoText ? ` (${ensoText})` : ""}; não aciona alerta local sozinho.`
  };
}

function explainDailyRisk(station, date, p, tn, w, riskCode) {
  const dd = new Date(date + "T12:00:00");
  const riskLabel = RISK_LEVELS[riskCode]?.label || riskCode || "Indefinido";
  const weightedPrecip = p * 1.5;

  return {
    title: `${station?.name || "Cidade"} — ${dd.toLocaleDateString("pt-BR")} — ${riskLabel}`,
    lines: [
      p >= 10
        ? `Há ${p.toFixed(0)}mm de chuva previstos para o dia. Esse volume já justifica acompanhar a situação.`
        : `Quase não há chuva prevista para o dia (${p.toFixed(0)}mm), então a chuva não pesa no risco.`,
      tn < 0
        ? `A mínima pode cair para ${tn.toFixed(1)}°C, com risco de geada ou gelo.`
        : tn < 5
        ? `A mínima pode chegar a ${tn.toFixed(1)}°C. É frio relevante para o RS e entra como atenção.`
        : `A mínima prevista é de ${tn.toFixed(1)}°C. Esse frio não aumenta o nível de atenção agora.`,
      w >= 30
        ? `O vento pode chegar a ${w.toFixed(0)}km/h. A partir de 30km/h o app passa a acompanhar o vento com mais cuidado.`
        : `O vento previsto é baixo (${w.toFixed(0)}km/h), sem influência relevante no risco do dia.`
    ],
    note: "Este status resume chuva, frio e vento previstos. Para decisões de segurança, confira também os avisos oficiais da Defesa Civil e dos órgãos responsáveis."
  };
}

function explainLagoaRisk(point, lagoa) {
  const label = lagoaStatusLabel(lagoa?.levelStatus);

  if (!lagoa?.isReal || lagoa?.atual === null || lagoa?.atual === undefined) {
    return {
      title: `${point?.name || "Ponto"} — Sem leitura`,
      lines: ["Sem leitura operacional validada no período."],
      note: "Sem simulação: o app não inventa nível quando a fonte não retorna dado válido."
    };
  }

  const lines = [
    `Cota atual: ${(lagoa.atual * 100).toFixed(1)}cm (${lagoa.atual.toFixed(3)}m).`
  ];

  if (typeof lagoa.threshold_m === "number") {
    lines.push(`Limiar validado da estação: ${(lagoa.threshold_m * 100).toFixed(0)}cm (${lagoa.threshold_m.toFixed(2)}m).`);
  } else {
    lines.push("Dado real, mas sem limiar operacional validado.");
  }

  if (typeof lagoa.critical_threshold_m === "number") {
    lines.push(`Cota crítica validada: ${(lagoa.critical_threshold_m * 100).toFixed(0)}cm (${lagoa.critical_threshold_m.toFixed(2)}m).`);
  }

  const measuredAt = getLagoaMeasuredAt(lagoa);
  if (measuredAt) lines.push(`Horário da leitura: ${formatDateTimeBR(measuredAt)}.`);

  if (lagoa.operational === false || lagoa.stale) {
    const ageText = typeof lagoa.age_minutes === "number" ? ` (${lagoa.age_minutes}min atrás)` : "";
    lines.push(`A fonte retornou uma leitura real${ageText}, mas ela está velha para uso como leitura atual. O app mostra o valor como referência e não eleva o alerta com base nele.`);
  }

  if (lagoa.hidrosens?.distance_m && lagoa.hidrosens?.sensor_height_m) {
    lines.push(`Cálculo HidroSens: altura do sensor ${lagoa.hidrosens.sensor_height_m.toFixed(2)}m − Distance ${lagoa.hidrosens.distance_m.toFixed(2)}m = ${lagoa.atual.toFixed(2)}m.`);
  }

  if (lagoa.isFallback) {
    lines.push("Fonte primária indisponível. Esta é a última leitura válida salva. Verifique a informação junto ao órgão responsável pela fonte antes de qualquer decisão operacional. Fallback vencido não dispara novo alerta automático.");
  }

  return {
    title: `${point?.name || "Ponto"} — ${label}`,
    lines,
    note: "Normal significa abaixo do limiar validado. Atenção/Acima da cota dependem do limiar próprio da estação, não de limiar genérico."
  };
}

// INMET — previsão oficial por município.
// Endpoint validado no navegador: apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}
function pickInmetPeriod(dayData) {
  if (!dayData || typeof dayData !== "object") return null;
  return dayData.manha || dayData.tarde || dayData.noite || Object.values(dayData)[0] || null;
}

function normalizeInmetForecast(raw, ibgeCode) {
  const cityBlock = raw?.[ibgeCode];
  if (!cityBlock || typeof cityBlock !== "object") return null;

  const todayKey = Object.keys(cityBlock)[0];
  const period = pickInmetPeriod(cityBlock[todayKey]);

  if (!todayKey || !period) return null;

  return {
    source: "INMET",
    official: true,
    ibgeCode,
    date: todayKey,
    city: period.entidade || "",
    resumo: period.resumo || "",
    tempMax: period.temp_max ?? null,
    tempMin: period.temp_min ?? null,
    windDirection: period.dir_vento || "",
    windIntensity: period.int_vento || "",
    humidityMax: period.umidade_max ?? null,
    humidityMin: period.umidade_min ?? null,
    weekday: period.dia_semana || "",
  };
}

async function fetchInmetForecast(ibgeCode) {
  if (!ibgeCode) return null;

  try {
    const res = await fetch(`${INMET_PREVISAO_FUNCTION_URL}?codigo_ibge=${encodeURIComponent(ibgeCode)}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || !data?.latest) return null;

    return {
      ...data.latest,
      proxied: true,
      fetched_at: data.fetched_at,
    };
  } catch {
    return null;
  }
}

// Defesa Civil RS — RSS oficial via Supabase Edge Function.
// Não buscar o RSS direto no navegador: o site oficial bloqueia por CORS.
function normalizeOfficialRiskLevel(alert) {
  const text = `${alert?.title || ""} ${alert?.message || ""}`.toUpperCase();

  if (text.includes("RISCO EXTREMO") || text.includes("EMERGÊNCIA METEOROLÓGICA") || text.includes("EMERGENCIA METEOROLOGICA")) {
    return "EMERGENCIA";
  }

  if (text.includes("RISCO MUITO NÃO USAR COMO ALERTA") || text.includes("CRÍTICO") || text.includes("CRITICO")) {
    return "CRITICO";
  }

  if (text.includes("ALERTA") || text.includes("RISCO NÃO USAR COMO ALERTA")) {
    return "ALERTA";
  }

  return alert?.risk_level || "ATENCAO";
}

async function fetchDefesaCivilAlerts() {
  try {
    const res = await fetch(DEFESA_CIVIL_RS_FUNCTION_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.alerts)) return [];

    return data.alerts.map((alert) => ({
      ...alert,
      id: alert.id || `defesa_civil_rs_${alert.at || alert.title}`,
      station: alert.station || "Defesa Civil RS",
      risk_level: normalizeOfficialRiskLevel(alert),
      official: true,
      source: "Defesa Civil RS",
    }));
  } catch {
    return [];
  }
}

const WMO_WEATHER = {
  0: ["☀️", "Céu claro"],
  1: ["🌤️", "Principalmente claro"],
  2: ["⛅", "Parcialmente nublado"],
  3: ["☁️", "Nublado"],
  45: ["🌫️", "Neblina"],
  48: ["🌫️", "Neblina com geada"],
  51: ["🌦️", "Garoa fraca"],
  53: ["🌧️", "Garoa"],
  55: ["🌧️", "Garoa forte"],
  56: ["🌧️", "Garoa congelante fraca"],
  57: ["🌧️", "Garoa congelante forte"],
  61: ["🌧️", "Chuva fraca"],
  63: ["🌧️", "Chuva"],
  65: ["🌧️", "Chuva forte"],
  66: ["🌧️", "Chuva congelante fraca"],
  67: ["🌧️", "Chuva congelante forte"],
  71: ["❄️", "Neve fraca"],
  73: ["❄️", "Neve"],
  75: ["❄️", "Neve intensa"],
  77: ["❄️", "Grãos de neve"],
  80: ["🌦️", "Pancadas fracas"],
  81: ["🌧️", "Pancadas"],
  82: ["⛈️", "Pancadas fortes"],
  85: ["❄️", "Pancadas de neve"],
  86: ["❄️", "Pancadas fortes de neve"],
  95: ["⛈️", "Tempestade"],
  96: ["⛈️", "Tempestade com granizo"],
  99: ["⛈️", "Tempestade forte com granizo"],
};

const wmoDesc  = (c) => WMO_WEATHER[Number(c)]?.[1] || "Condição meteorológica";
const wmoEmoji = (c) => WMO_WEATHER[Number(c)]?.[0] || "🌦️";

// ─── PUSH ────────────────────────────────────────────────────────────────────
function PushButton({ dark }) {
  const { supported, subscribed, loading, error, subscribe: subscribePush } = usePush();
  async function subscribe() {
    await subscribePush([]);
  }
  const state = subscribed ? "subscribed" : loading ? "requesting" : error ? "error" : "idle";
  const c = { idle:"#22d3ee", requesting:"#eab308", subscribed:"#22c55e", error:"#ef4444" };
  const helpText = error || (!supported ? "Este navegador não oferece Push API para PWA." : null);
  const label = subscribed ? "✓ Push ativo" : loading ? "⏳..." : error ? "✗ Ajustar push" : "🔔 Push";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
      <button onClick={subscribe} disabled={state==="subscribed"||state==="requesting"||!supported}
        style={{ padding:"6px 12px", borderRadius:4, fontFamily:"inherit", fontSize:10, cursor:"pointer",
          background: dark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.6)",
          border:`1px solid ${c[state]}44`, color:c[state] }}>
        {label}
      </button>
      {helpText && (
        <div style={{ fontSize:9, color:"#fca5a5", maxWidth:280, textAlign:"right", lineHeight:1.45 }}>{helpText}</div>
      )}
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function SentinelaRS() {
  const [stationData, setStationData]   = useState({});
  const [loading, setLoading]           = useState(true);
  const [lastUpdate, setLastUpdate]     = useState(null);
  const [selStation, setSelStation]     = useState(STATIONS_CIDADES[0]); // POA default
  const [activeTab, setActiveTab]       = useState("dashboard");
  const [alerts, setAlerts]             = useState([]);
  const [queimadas, setQueimadas]       = useState(null);
  const [icmbioUcs, setIcmbioUcs]       = useState(null);
  const [qLoading, setQLoading]         = useState(false);
  const [expanded, setExpanded]         = useState(null);
  const [dark, setDark]                 = useState(true);
  const [ensoLive, setEnsoLive]         = useState(null);
  const [ensoProbLive, setEnsoProbLive]     = useState(null);
  const [cptecProducts, setCptecProducts]   = useState(null);
  const [copernicusWater, setCopernicusWater] = useState(null);
  const [copernicusS1, setCopernicusS1] = useState(null);
  const [copernicusNdvi, setCopernicusNdvi] = useState(null);
  const [copernicusEms, setCopernicusEms] = useState(null);
  const [notificationHealth, setNotificationHealth] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null); // para detalhe do card
  const [riskExplain, setRiskExplain] = useState(null);
  // BLOCO D — saúde das fontes
  const [sourceHealth, setSourceHealth] = useState({});
  const sourceHealthRef = useRef({});

  useEffect(() => {
    document.body.dataset.theme = dark ? "dark" : "light";
    return () => { delete document.body.dataset.theme; };
  }, [dark]);

  // Cores dinâmicas por tema
  const t = dark ? {
    bg: "#070b12",
    surface: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)",
    borderActive: "rgba(34,211,238,0.5)",
    text: "#f3f8ff",
    textMuted: "#c6d3e1",
    textFaint: "#9fb0c3",
    accent: "#22d3ee",
    grid: "rgba(34,211,238,0.04)",
    tabActiveBg: "rgba(34,211,238,0.15)",
    tabActive: "#22d3ee",
    tabInactive: "#64748b",
    cardBg: "rgba(255,255,255,0.03)",
    inputBg: "rgba(0,0,0,0.4)",
    barBg: "rgba(0,0,0,0.4)",
    shadowCard: "none",
  } : {
    bg: "#f1f5f9",
    surface: "rgba(255,255,255,0.9)",
    border: "rgba(0,0,0,0.1)",
    borderActive: "rgba(6,182,212,0.6)",
    text: "#0f172a",
    textMuted: "#475569",
    textFaint: "#94a3b8",
    accent: "#0891b2",
    grid: "rgba(6,182,212,0.05)",
    tabActiveBg: "rgba(6,182,212,0.12)",
    tabActive: "#0891b2",
    tabInactive: "#94a3b8",
    cardBg: "#ffffff",
    inputBg: "rgba(255,255,255,0.9)",
    barBg: "rgba(0,0,0,0.1)",
    shadowCard: "0 1px 4px rgba(0,0,0,0.08)",
  };

  const s = {
    card: { background: t.cardBg, border:`1px solid ${t.border}`, borderRadius:6, padding:"14px 16px", boxShadow: t.shadowCard },
    label: { fontSize:9, color: t.textMuted, letterSpacing:2, textTransform:"uppercase", marginBottom:6 },
  };

  const getRiskColor = (lvl) => {
    const r = RISK_LEVELS[lvl];
    return dark ? r.color : r.colorLight;
  };
  const getRiskBg = (lvl) => {
    const r = RISK_LEVELS[lvl];
    return dark ? r.bg : r.bgLight;
  };

  function getValidatedSourceHealth(name) {
    const existing = sourceHealthRef.current?.[name] || sourceHealth?.[name] || null;
    if (existing) return existing;

    if (name === "NOAA/CPC ENSO" && ensoLive && typeof ensoLive.nino34 === "number") {
      return { ok: true, lastOk: ensoLive.fetchedAt || ensoLive.referenceDate || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "IRI/CCSR ENSO" && ensoProbLive && ensoProbLive.prob && typeof ensoProbLive.prob.elNino === "number") {
      return { ok: true, lastOk: ensoProbLive.probabilityFetchedAt || ensoProbLive.probabilityReferenceDate || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "CPTEC/INPE" && cptecProducts && (cptecProducts.ok === true || Array.isArray(cptecProducts.products))) {
      return { ok: true, lastOk: cptecProducts.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus Water" && copernicusWater && copernicusWater.ok === true && typeof copernicusWater.water_percent === "number") {
      return { ok: true, lastOk: copernicusWater.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus Sentinel-1" && copernicusS1 && (copernicusS1.status === "OK" || copernicusS1.ok === true) && typeof copernicusS1.water_like_percent === "number") {
      return { ok: true, lastOk: copernicusS1.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus NDVI" && copernicusNdvi && copernicusNdvi.ok === true && typeof copernicusNdvi.ndvi_mean === "number") {
      return { ok: true, lastOk: copernicusNdvi.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus EMS" && copernicusEms && copernicusEms.ok === true) {
      return { ok: true, lastOk: copernicusEms.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    return null;
  }

  function markSourceHealth(name, ok, startedAt, error = null) {
    const next = {
      ...sourceHealthRef.current,
      [name]: {
        ok: Boolean(ok),
        lastOk: ok ? new Date().toISOString() : sourceHealthRef.current[name]?.lastOk || null,
        latencyMs: Date.now() - startedAt,
        error,
      },
    };
    sourceHealthRef.current = next;
    setSourceHealth({ ...next });
  }

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const results = {};
    const newAlerts = [];
    const health = { ...sourceHealthRef.current };
    const t0 = Date.now();

    // ── fetch com rastreio de saúde ──────────────────────────────────────────
    async function tracked(key, fn) {
      const start = Date.now();
      try {
        const result = await fn();
        const latencyMs = Date.now() - start;
        health[key] = { ok: true, lastOk: new Date().toISOString(), latencyMs, error: null };
        return result;
      } catch (err) {
        health[key] = { ok: false, lastOk: health[key]?.lastOk || null, latencyMs: Date.now() - start, error: err?.message || "erro desconhecido" };
        return null;
      }
    }

    const [cemadenResult, lagoaRadarResult, hidrosensResult] = await Promise.allSettled([
      tracked("CEMADEN", fetchCemadenAccumulations),
      tracked("RADAR Lagoa", fetchLagoaRadarLevels),
      tracked("HidroSens", fetchHidroSensLaranjalLevel),
    ]);
    const cemadenMap = cemadenResult.status === "fulfilled" ? (cemadenResult.value || {}) : {};
    const lagoaRadarMap = lagoaRadarResult.status === "fulfilled" ? (lagoaRadarResult.value || {}) : {};
    const hidrosensLaranjal = hidrosensResult.status === "fulfilled" ? hidrosensResult.value : null;

    await mapWithConcurrency(ALL_STATIONS, 4, async (st) => {
      try {
        const weather = await (async () => {
          const start = Date.now();
          try {
            const r = await fetchWeather14Days(st.lat, st.lon);
            if (!health["Open-Meteo"]) health["Open-Meteo"] = { ok: true, lastOk: new Date().toISOString(), latencyMs: Date.now()-start, error: null };
            return r;
          } catch(err) {
            health["Open-Meteo"] = { ok: false, lastOk: health["Open-Meteo"]?.lastOk || null, latencyMs: Date.now()-start, error: err?.message };
            throw err;
          }
        })();
        let realLevel = null;
        if (st.anaCode) {
          const start = Date.now();
          realLevel = await fetchAnaLevel(st.anaCode);
          if (!health["ANA HidroWeb"]) health["ANA HidroWeb"] = { ok: realLevel !== null, lastOk: realLevel !== null ? new Date().toISOString() : health["ANA HidroWeb"]?.lastOk || null, latencyMs: Date.now()-start, error: realLevel === null ? "sem leitura" : null };
        }
        const radarLevel = lagoaRadarMap[st.id] || null;
        const hidrosensLevel = st.id === "lagoa_patos_pelotas" ? hidrosensLaranjal : null;
        const inmet = st.ibgeCode ? await (async () => {
          const start = Date.now();
          const r = await fetchInmetForecast(st.ibgeCode);
          if (!health["INMET"]) health["INMET"] = { ok: r !== null, lastOk: r !== null ? new Date().toISOString() : health["INMET"]?.lastOk || null, latencyMs: Date.now()-start, error: r === null ? "sem resposta" : null };
          return r;
        })() : null;
        const cemaden = cemadenMap[st.id] || null;
        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
        const tempMin  = Math.min(...(weather.daily?.temperature_2m_min||[20]));
        const windMax  = Math.max(...(weather.daily?.windspeed_10m_max||[0]));

        // Nível real disponível: prioriza RADAR da Lagoa quando houver sensor validado.
        // ANA permanece como fonte complementar/parcial.
        const lagoa = st.type==="lagoa" ? {
          atual: hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel,
          isReal: Boolean(hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel),
          source: hidrosensLevel ? "HIDROSENS" : (radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null)),
          operational: hidrosensLevel?.operational ?? radarLevel?.operational ?? (realLevel !== null),
          stale: Boolean(hidrosensLevel?.stale || radarLevel?.stale),
          age_minutes: hidrosensLevel?.age_minutes ?? radarLevel?.age_minutes ?? null,
          note: hidrosensLevel?.note ?? radarLevel?.note ?? null,
          isFallback: Boolean(hidrosensLevel?.fallback || radarLevel?.fallback),
          fallback_saved_at: hidrosensLevel?.fallback_saved_at || radarLevel?.fallback_saved_at || null,
          fallback_age_minutes: hidrosensLevel?.fallback_age_minutes ?? radarLevel?.fallback_age_minutes ?? null,
          radar: radarLevel,
          hidrosens: hidrosensLevel,
          anaLevel: realLevel,
          threshold_m: hidrosensLevel?.threshold_m ?? radarLevel?.threshold_m ?? null,
          critical_threshold_m: hidrosensLevel?.critical_threshold_m ?? null,
          levelStatus: hidrosensLevel?.status ?? radarLevel?.status ?? (realLevel !== null ? "SEM_LIMIAR" : "SEM_LEITURA"),
        } : null;

        // Não usa limiar único de 0,8m. Risco de nível só entra quando a fonte traz limiar próprio validado.
        // BLOCO B — registra histórico local
        if (lagoa?.isReal && lagoa.atual !== null) {
          appendHistory(st.id, lagoa.atual, getLagoaMeasuredAt(lagoa));
        }

        const baseRisk = getRiskLevel(precip, tempMin, windMax, null);
        const levelRisk = ((lagoa?.radar || lagoa?.hidrosens) && lagoa?.threshold_m && !lagoa?.isFallback && lagoa?.operational !== false) ? radarRiskToLevel(lagoa.levelStatus) : "NORMAL";
        const order = ["NORMAL","ATENCAO","ALERTA","EMERGENCIA","CRITICO"];
        const risk = order.indexOf(levelRisk) > order.indexOf(baseRisk) ? levelRisk : baseRisk;
        results[st.id] = { weather, inmet, cemaden, lagoa, precip, tempMin, windMax, risk, realLevel, radarLevel };
        // Só ALERTA, EMERGÊNCIA e CRÍTICO entram na aba Alertas.
        // ATENÇÃO permanece visível no card, mas não infla o contador de alertas ativos.
        if (["ALERTA", "EMERGENCIA", "CRITICO"].includes(risk)) {
          const parts=[];
          if (precip>80) parts.push(`chuva ${precip.toFixed(0)}mm/14d`);
          if (tempMin<5) parts.push(`temp. mín. ${tempMin.toFixed(1)}°C`);
          if (windMax>50) parts.push(`rajadas ${windMax.toFixed(0)}km/h`);
          if (lagoa?.radar && lagoa.levelStatus === "ALERTA") parts.push(`lagoa ${lagoa.atual.toFixed(2)}m / limiar ${lagoa.threshold_m.toFixed(2)}m (RADAR)`);
          const explain = st.type === "lagoa"
            ? explainLagoaRisk(st, lagoa)
            : explainCityRisk(st, results[st.id], ensoProbabilityText);
          newAlerts.push({
            id:`${st.id}_${Date.now()}`,
            station:st.name,
            risk_level:risk,
            message:parts.join(" · ") || "Clique para ver os parâmetros que elevaram o risco.",
            at:new Date(),
            official:false,
            explain,
          });
        }
      } catch { results[st.id]={ error:true, risk:"NORMAL" }; }
    });
    const defesaStart = Date.now();
    const officialAlerts = await fetchDefesaCivilAlerts();
    health["Defesa Civil RS"] = { ok: Array.isArray(officialAlerts), lastOk: Array.isArray(officialAlerts) ? new Date().toISOString() : health["Defesa Civil RS"]?.lastOk || null, latencyMs: Date.now()-defesaStart, error: null };

    sourceHealthRef.current = health;
    setSourceHealth({ ...health });
    setStationData(results);
    setAlerts([...officialAlerts, ...newAlerts]);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  const loadQueimadas = useCallback(async () => {
    setQLoading(true);
    const startedAt = Date.now();
    const [data, ucs] = await Promise.all([fetchQueimadas(), fetchIcmbioUcsRs()]);
    markSourceHealth("INPE BDQueimadas", Boolean(data?.ok), startedAt, data?.ok ? null : data?.error || "sem resposta operacional");
    markSourceHealth("ICMBio/MMA CNUC", Boolean(ucs?.ok), startedAt, ucs?.ok ? null : ucs?.error || "sem cadastro validado");
    setQueimadas(data);
    setIcmbioUcs(ucs);
    setQLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
    const iv = setInterval(loadAllData, 30*60*1000);
    return () => clearInterval(iv);
  }, [loadAllData]);




  useEffect(() => {
    let alive = true;

    async function loadNotificationHealth() {
      const data = await fetchNotificationHealth();
      if (!alive) return;
      setNotificationHealth(data);
    }

    loadNotificationHealth();
    const iv = setInterval(loadNotificationHealth, 5 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCptecProducts() {
      const startedAt = Date.now();
      const data = await fetchCptecInpeProducts();
      if (!alive) return;
      markSourceHealth("CPTEC/INPE", Boolean(data), startedAt, data ? null : "sem produto oficial validado");
      if (!data) return;
      setCptecProducts(data);
    }

    loadCptecProducts();
    const iv = setInterval(loadCptecProducts, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCopernicusWater() {
      const startedAt = Date.now();
      const data = await fetchCopernicusWater("lagoa_patos", 30);
      if (!alive) return;
      markSourceHealth("Copernicus Water", Boolean(data?.ok && typeof data?.water_percent === "number"), startedAt, data?.error || (data ? data.status : "sem resposta"));
      setCopernicusWater(data);
    }

    loadCopernicusWater();
    const iv = setInterval(loadCopernicusWater, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCopernicusSentinel1() {
      const startedAt = Date.now();
      const data = await fetchCopernicusSentinel1("lagoa_patos", 18);
      if (!alive) return;
      markSourceHealth("Copernicus Sentinel-1", Boolean(data?.water_like_percent !== undefined), startedAt, data?.error || (data ? data.status : "sem resposta"));
      setCopernicusS1(data);
    }

    loadCopernicusSentinel1();
    const iv = setInterval(loadCopernicusSentinel1, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCopernicusEms() {
      const startedAt = Date.now();
      const data = await fetchCopernicusEms();
      if (!alive) return;
      markSourceHealth("Copernicus EMS", Boolean(data?.ok), startedAt, data?.error || (data ? data.source : "sem resposta"));
      setCopernicusEms(data);
    }

    loadCopernicusEms();
    const iv = setInterval(loadCopernicusEms, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCopernicusNdvi() {
      const startedAt = Date.now();
      const data = await fetchCopernicusNdvi("entorno_lagoa_patos", 30);
      if (!alive) return;
      markSourceHealth("Copernicus NDVI", Boolean(data?.ok && typeof data?.ndvi_mean === "number"), startedAt, data?.error || (data ? data.status : "sem resposta"));
      setCopernicusNdvi(data);
    }

    loadCopernicusNdvi();
    const iv = setInterval(loadCopernicusNdvi, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadIriProbabilities() {
      const startedAt = Date.now();
      const live = await fetchIriEnsoProbabilities();
      if (!alive) return;
      markSourceHealth("IRI/CCSR ENSO", Boolean(live), startedAt, live ? null : "sem probabilidade validada");
      if (!live) return;
      setEnsoProbLive(live);
    }

    loadIriProbabilities();
    const iv = setInterval(loadIriProbabilities, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadEnsoLive() {
      const startedAt = Date.now();
      const live = await fetchNoaaEnso();
      if (!alive) return;
      markSourceHealth("NOAA/CPC ENSO", Boolean(live), startedAt, live ? null : "sem índice observado validado");
      if (!live) return;

      setEnsoLive(live);
    }

    loadEnsoLive();
    const iv = setInterval(loadEnsoLive, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "queimadas") loadQueimadas();
  }, [activeTab, loadQueimadas]);

  const overallRisk = Object.values(stationData).reduce((w,d) => {
    const o=["NORMAL","ATENCAO","ALERTA","EMERGENCIA","CRITICO"];
    return o.indexOf(d.risk)>o.indexOf(w)?d.risk:w;
  }, "NORMAL");

  const observedENSO = ensoLive || ENSO_UNAVAILABLE;
  const activeENSO = {
    ...observedENSO,
    prob: ensoProbLive?.prob || null,
    forecast: ensoProbLive?.forecast || [],
    probabilitySource: ensoProbLive?.probabilitySource || null,
    probabilityReferenceDate: ensoProbLive?.probabilityReferenceDate || null,
    probabilityDynamic: Boolean(ensoProbLive),
    probabilityFetchedAt: ensoProbLive?.probabilityFetchedAt || null,
    probabilityParsing: ensoProbLive?.probabilityParsing || null,
  };
  const ensoClass = classifyENSO(activeENSO.nino34);
  const ensoObservedAvailable = typeof activeENSO.nino34 === "number" && Number.isFinite(activeENSO.nino34);
  const ensoProbabilityAvailable = Boolean(getDominantEnsoPhase(activeENSO.prob));
  const ensoFirstForecast = safeEnsoForecast(activeENSO.forecast)[0] || null;
  const ensoDominantProb = getDominantEnsoPhase(activeENSO.prob);
  const ensoObservedText = ensoObservedAvailable
    ? `${ensoClass.icon} Condição observada: ${ensoClass.label} · Niño 3.4 ${formatSignedCelsius(activeENSO.nino34)}`
    : "ENSO observado indisponível";
  const ensoProbabilityText = ensoProbabilityAvailable
    ? `IRI/CCSR: ${formatDominantEnsoProbability(activeENSO.prob, ensoFirstForecast?.p || "")}`
    : "Probabilidade IRI/CCSR indisponível";
  const ensoBannerActive = ensoObservedAvailable || ensoProbabilityAvailable;
  const ensoBannerColor = ensoObservedAvailable ? ensoClass.color : (ensoDominantProb?.color || t.textMuted);
  const selData   = stationData[selStation.id];
  const lagoaSummary = getLagoaSummary(stationData);

  // TABS: previsão agora é 14 dias
  const TABS = [
    { key:"dashboard",  label:"📡 Dashboard" },
    { key:"previsao",   label:"📅 Previsão 14 Dias" },
    { key:"lagoa",      label:"🌊 Lagoa dos Patos" },
    { key:"enso",       label:"🌡️ ENSO" },
    { key:"cptec",      label:"🌦️ CPTEC/INPE" },
    { key:"copernicus", label:"🛰️ Copernicus" },
    { key:"queimadas",  label:"🔥 Queimadas / APAs" },
    { key:"alertas",    label:`🔔 Alertas${alerts.length?` (${alerts.length})`:""}`},
    { key:"apis",       label:"🔌 Fontes de Dados" },
  ];

  // ─── CARD DETALHE (modal inline) ─────────────────────────────────────────
  function CardDetail({ station, d, onClose }) {
    if (!d || d.error) return null;
    const risk = RISK_LEVELS[d.risk];
    const rColor = getRiskColor(d.risk);
    const rBg    = getRiskBg(d.risk);
    const days   = d.weather?.daily?.time || [];
    return (
      <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
        onClick={onClose}>
        <div onClick={e=>e.stopPropagation()} style={{ background: dark?"#0f172a":"#ffffff", border:`1px solid ${t.border}`, borderRadius:10, padding:22, maxWidth:560, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>{station.type.toUpperCase()} · {station.rioRef||station.anaCode||""}</div>
              <div style={{ fontSize:16, fontWeight:700, color:t.text, marginTop:2 }}>{station.name}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:10, fontWeight:700, padding:"3px 10px", border:`1px solid ${rColor}`, color:rColor, background:rBg, borderRadius:4 }}>{risk.icon} {risk.label}</div>
              <button onClick={onClose} style={{ background:"none", border:`1px solid ${t.border}`, color:t.textMuted, cursor:"pointer", fontSize:14, borderRadius:4, padding:"2px 8px", fontFamily:"inherit" }}>✕</button>
            </div>
          </div>

          {/* Parâmetros */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:14 }}>
            {[
              { l:"Precip. 14d", v:`${d.precip?.toFixed(0)} mm`,    alert: d.precip>80 },
              { l:"Temp. mínima", v:`${d.tempMin?.toFixed(1)} °C`,   alert: d.tempMin<5 },
              { l:"Vento máx.",   v:`${d.windMax?.toFixed(0)} km/h`, alert: d.windMax>50 },
              { l:"Contexto climático",v: ensoObservedAvailable ? `${ensoClass.label} · ${formatSignedCelsius(activeENSO.nino34)}` : "ENSO indisponível", alert:false },
              ...(d.lagoa ? [
                { l:"Nível lagoa", v: d.lagoa.isReal && d.lagoa.atual !== null ? `${d.lagoa.atual.toFixed(2)} m (${d.lagoa.source || "real"})` : "– (indisponível)", alert: false },
              ] : []),
            ].map(item=>(
              <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 11px", borderRadius:5, borderLeft:`3px solid ${item.alert?rColor:t.textFaint}` }}>
                <div style={{ fontSize:8, color:t.textMuted, marginBottom:2 }}>{item.l}</div>
                <div style={{ fontSize:14, fontWeight:700, color:item.alert?rColor:t.text }}>{item.v}</div>
              </div>
            ))}
          </div>

          {/* Previsão compacta dos 14 dias */}
          <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2, marginBottom:8 }}>PREVISÃO 14 DIAS</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
            {days.slice(0,14).map((date,i)=>{
              const dd=new Date(date+"T12:00:00");
              const p=d.weather.daily.precipitation_sum?.[i]||0;
              const tx=d.weather.daily.temperature_2m_max?.[i]||0;
              const tn=d.weather.daily.temperature_2m_min?.[i]||0;
              const c=d.weather.daily.weathercode?.[i]||0;
              return (
                <div key={date} style={{ padding:"6px 3px", background: dark?(i===0?"rgba(34,211,238,0.08)":"rgba(255,255,255,0.03)"):(i===0?"rgba(8,145,178,0.08)":"rgba(0,0,0,0.03)"), border:`1px solid ${i===0?t.accent+"55":t.border}`, borderRadius:4, textAlign:"center" }}>
                  <div style={{ fontSize:7, color:t.textMuted }}>{i===0?"HOJE":dayNames[dd.getDay()]}</div>
                  <div style={{ fontSize:16, margin:"3px 0 2px" }}>{wmoEmoji(c)}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#fbbf24" }}>{tx.toFixed(0)}°</div>
                  <div style={{ fontSize:9, color:"#60a5fa" }}>{tn.toFixed(0)}°</div>
                  <div style={{ fontSize:7, color:t.accent, marginTop:3 }}>{p.toFixed(0)}mm</div>
                </div>
              );
            })}
          </div>

          <button onClick={()=>{setSelStation(station);setActiveTab("previsao");onClose();}}
            style={{ marginTop:14, width:"100%", padding:"9px", background:"none", border:`1px solid ${t.accent}44`, color:t.accent, cursor:"pointer", borderRadius:5, fontFamily:"inherit", fontSize:10, letterSpacing:2 }}>
            VER PREVISÃO COMPLETA →
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────
  const notifyChannels = notificationHealth?.channels || {};
  const channelStatus = (channel, fallbackReady = false) => {
    const info = notifyChannels[channel];
    if (!notificationHealth) return { ok: fallbackReady, label: fallbackReady ? "Ativo" : "Verificando", color: fallbackReady ? "#22c55e" : "#eab308" };
    if (info?.configured) return { ok: true, label: "Ativo", color: "#22c55e" };
    return { ok: false, label: "Configurar", color: "#eab308" };
  };
  const notificationCards = [
    { i:"📱", n:"Push nativo (PWA)", status:channelStatus("push"), s: notifyChannels.push?.configured ? `Servidor pronto${Number.isFinite(notifyChannels.push?.subscriptions) ? ` · ${notifyChannels.push.subscriptions} inscrição(ões)` : ""}` : "Configurar VAPID", h: notifyChannels.push?.note || "Front-end registra o Service Worker e salva a assinatura em push_subscriptions. A Edge Function send-alerts envia via Web Push usando VAPID_PRIVATE_JWK." },
    { i:"🔔", n:"Alertas na tela", status:channelStatus("screen", true), s:"Ativo — cálculo local", h:"Canal local do app. Exibe alertas calculados na tela e não depende de provedor externo." },
    { i:"📧", n:"E-mail (Resend)", status:channelStatus("email"), s: notifyChannels.email?.configured ? "Secrets OK" : "Configurar secrets", h: notifyChannels.email?.note || "Secrets esperados no Supabase: RESEND_API_KEY, ALERT_EMAIL_TO e opcionalmente ALERT_EMAIL_FROM." },
    { i:"📢", n:"Defesa Civil RS", status:channelStatus("defesa_civil", Boolean(getValidatedSourceHealth("Defesa Civil RS")?.ok)), s: getValidatedSourceHealth("Defesa Civil RS")?.ok ? "RSS oficial OK" : "Verificando RSS", h:"Fonte oficial conectada via Supabase Edge Function. RSS: www.defesacivil.rs.gov.br/rss" },
    { i:"📲", n:"SMS (Twilio)", status:channelStatus("sms"), s: notifyChannels.sms?.configured ? "Emergência/crítico" : "Configurar Twilio", h: notifyChannels.sms?.note || "Secrets esperados no Supabase: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM e ALERT_SMS_TO. O envio só roda para EMERGENCIA ou CRITICO." },
    { i:"🔊", n:"Sirene IoT", status:channelStatus("sirene"), s: notifyChannels.sirene?.configured ? "Crítico com webhook" : "Aguardando hardware/webhook", h: notifyChannels.sirene?.note || "Secrets esperados no Supabase: SIRENE_WEBHOOK_URL e opcionalmente SIRENE_WEBHOOK_TOKEN. A sirene só recebe POST quando o alerta é CRITICO e houver hardware pronto." },
  ];

  return (
    <div style={{ minHeight:"100vh", background:t.bg, color:t.text, fontFamily:"'IBM Plex Mono','Courier New',monospace", transition:"background 0.3s,color 0.3s" }}>
      {/* Grid bg */}
      <div style={{ position:"fixed", inset:0, zIndex:0, backgroundImage:`linear-gradient(${t.grid} 1px,transparent 1px),linear-gradient(90deg,${t.grid} 1px,transparent 1px)`, backgroundSize:"40px 40px", pointerEvents:"none" }} />

      {/* Modal detalhe */}
      {expandedCard && stationData[expandedCard.id] && (
        <CardDetail station={expandedCard} d={stationData[expandedCard.id]} onClose={()=>setExpandedCard(null)} />
      )}

      <div style={{ position:"relative", zIndex:2, maxWidth:1320, margin:"0 auto", padding:"0 16px 40px" }}>

        {/* ── HEADER ── */}
        <header style={{ borderBottom:`1px solid ${dark?"rgba(34,211,238,0.2)":t.border}`, paddingBottom:14, marginBottom:20, paddingTop:18 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:loading?"#eab308":"#22c55e", boxShadow:`0 0 6px ${loading?"#eab308":"#22c55e"}` }} />
                <span style={{ fontSize:10, color:t.textMuted, letterSpacing:3 }}>SISTEMA ATIVO · RIO GRANDE DO SUL</span>
              </div>
              <h1 style={{ margin:"2px 0", fontSize:26, fontWeight:700, letterSpacing:-1, color:t.text }}>
                SENTINELA<span style={{ color:t.accent }}>·RS</span>
                <span style={{ fontSize:11, color:t.textMuted, fontWeight:400, letterSpacing:1, marginLeft:10 }}>v2.2</span>
              </h1>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
              <div style={{ padding:"5px 12px", borderRadius:4, border:`1px solid ${RISK_LEVELS[overallRisk].color}`, background:getRiskBg(overallRisk), color:getRiskColor(overallRisk), fontSize:12, fontWeight:700, letterSpacing:2 }}>
                {RISK_LEVELS[overallRisk].icon} RISCO GERAL: {RISK_LEVELS[overallRisk].label.toUpperCase()}
              </div>
              {/* ENSO badge — apenas evento mais próximo */}
              <div style={{ padding:"4px 10px", borderRadius:4, border:`1px solid ${ensoClass.color}55`, color:ensoClass.color, fontSize:10, fontWeight:700 }}>
                {ensoClass.icon} ENSO {ensoObservedAvailable ? `${ensoClass.label} · Niño 3.4 ${formatSignedCelsius(activeENSO.nino34)}` : "observado indisponível"}{ensoDominantProb ? ` · ${ensoDominantProb.label} ${formatProbability(ensoDominantProb.value)}` : ""}
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {/* Toggle modo claro/escuro */}
                <button onClick={()=>setDark(d=>!d)} title={dark?"Modo claro":"Modo escuro"}
                  style={{ padding:"6px 10px", borderRadius:4, fontFamily:"inherit", fontSize:11, cursor:"pointer", background: dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)", border:`1px solid ${t.border}`, color:t.textMuted }}>
                  {dark?"☀️":"🌙"}
                </button>
                <PushButton dark={dark} />
                <span style={{ fontSize:9, color:t.textFaint }}>{lastUpdate?lastUpdate.toLocaleTimeString("pt-BR"):"..."}</span>
                <button onClick={loadAllData} style={{ background:"none", border:"none", color:t.accent, cursor:"pointer", fontSize:12, padding:0 }}>↻</button>
              </div>
            </div>
          </div>

          {/* Banner ENSO */}
          <div style={{ marginTop:10, padding:"9px 14px", background: ensoBannerActive ? `${ensoBannerColor}12` : (dark?"rgba(100,116,139,0.10)":"rgba(100,116,139,0.08)"), border:`1px solid ${ensoBannerActive ? `${ensoBannerColor}55` : t.border}`, borderRadius:4, fontSize:11, color: ensoBannerActive ? ensoBannerColor : t.textMuted, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            ⚠️ <strong>ENSO — leitura observada e probabilidade</strong> — {ensoObservedText}. {ensoProbabilityText}.
            <button onClick={()=>setActiveTab("enso")} style={{ background:"none", border:"none", color:t.accent, cursor:"pointer", fontSize:11, padding:0, fontFamily:"inherit" }}>Ver dados completos →</button>
          </div>
        </header>

        {/* ── TABS ── */}
        <div style={{ display:"flex", gap:2, marginBottom:20, flexWrap:"wrap" }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{
              padding:"7px 13px", fontSize:11, fontFamily:"inherit", letterSpacing:1, cursor:"pointer", borderRadius:4,
              background: activeTab===tab.key ? t.tabActiveBg : "transparent",
              border: activeTab===tab.key ? `1px solid ${t.borderActive}` : `1px solid ${t.border}`,
              color: activeTab===tab.key ? t.tabActive : t.tabInactive,
              transition:"all 0.2s",
            }}>{tab.label}</button>
          ))}
        </div>

        {loading && activeTab!=="copernicus" && activeTab!=="enso" && activeTab!=="apis" && (
          <div style={{ textAlign:"center", padding:50, color:t.accent }}>
            <div style={{ fontSize:28, marginBottom:10, animation:"spin 1s linear infinite", display:"inline-block" }}>◌</div>
            <div style={{ fontSize:11, letterSpacing:4 }}>CONSULTANDO APIs...</div>
            <div style={{ fontSize:9, color:t.textMuted, marginTop:4 }}>Open-Meteo · ANA HidroWeb · INPE · NOAA</div>
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {!loading && activeTab==="dashboard" && (
          <div>
            <div
              onClick={() => setActiveTab("lagoa")}
              style={{ ...s.card, marginBottom:12, border:`1px solid ${lagoaSummary.above ? "#f9731655" : t.borderActive}`, cursor:"pointer" }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>LAGOA DOS PATOS</div>
                  <div style={{ fontSize:15, fontWeight:800, color:t.text, marginTop:2 }}>Monitoramento de nível</div>
                  <div style={{ fontSize:9, color:t.textMuted, marginTop:5 }}>
                    {lagoaSummary.monitored}/{lagoaSummary.total} pontos com leitura real · RADAR + HidroSens · ANA complementar
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(80px, 1fr))", gap:8, minWidth:260 }}>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Acima da cota</div>
                    <div style={{ fontSize:15, fontWeight:800, color:lagoaSummary.above ? "#f97316" : "#22c55e" }}>{lagoaSummary.above}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Atenção</div>
                    <div style={{ fontSize:15, fontWeight:800, color:lagoaSummary.attention ? "#eab308" : "#22c55e" }}>{lagoaSummary.attention}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 10px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Última leitura</div>
                    <div style={{ fontSize:10, fontWeight:700, color:t.text }}>{lagoaSummary.latest ? formatDateTimeBR(lagoaSummary.latest) : "—"}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop:8, fontSize:8, color:t.accent, textAlign:"right", opacity:0.75 }}>abrir aba Lagoa dos Patos →</div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))", gap:11 }}>
            {STATIONS.map(station => {
              const d = stationData[station.id];
              if (!d) return null;
              const risk  = RISK_LEVELS[d.risk];
              const rColor = getRiskColor(d.risk);
              return (
                <div key={station.id}
                  onClick={()=>setExpandedCard(station)}
                  style={{ ...s.card, border:`1px solid ${d.risk!=="NORMAL"?rColor+"55":t.border}`, cursor:"pointer", position:"relative", overflow:"hidden", transition:"transform 0.15s,box-shadow 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 6px 20px ${rColor}22`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=t.shadowCard;}}>
                  {d.risk!=="NORMAL" && <div style={{ position:"absolute", top:0, right:0, width:3, height:"100%", background:rColor, opacity:0.8 }} />}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>{station.type.toUpperCase()}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:t.text }}>{station.name}</div>
                      {station.rioRef && <div style={{ fontSize:8, color:t.textFaint, marginTop:1 }}>{station.rioRef}</div>}
                      {d.inmet && (
                        <div style={{ fontSize:8, color:t.accent, marginTop:3 }}>
                          ● INMET: {d.inmet.resumo}
                        </div>
                      )}
                      <div title={CEMADEN_ATTRIBUTION} style={{ fontSize:8, color:d.cemaden ? "#22c55e" : t.textFaint, marginTop:3 }}>
                        ● CEMADEN: {d.cemaden ? formatCemadenRain(d.cemaden) : "sem estação/acumulado validado"}
                      </div>
                    </div>
                    <button
                      onClick={(e)=>{ e.stopPropagation(); setRiskExplain(explainCityRisk(station, d, ensoProbabilityText)); }}
                      title="Clique para entender este status"
                      style={{ background:"none", fontSize:9, fontWeight:700, padding:"2px 7px", border:`1px solid ${rColor}`, color:rColor, borderRadius:3, cursor:"pointer", fontFamily:"inherit" }}
                    >
                      {risk.icon} {risk.label} ⓘ
                    </button>
                  </div>
                  {d.error ? <div style={{ fontSize:10, color:"#ef4444" }}>Erro ao carregar</div> : (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                      {[
                        { l:"Precip. 14d", v:`${d.precip?.toFixed(0)}mm` },
                        { l:"Temp. mín.",  v:`${d.tempMin?.toFixed(1)}°C` },
                        { l:"Vento",       v:`${d.windMax?.toFixed(0)}km/h` },
                        { l:"Contexto climático", v: ensoObservedAvailable ? `${ensoClass.icon} ${ensoClass.label}` : (ensoDominantProb ? `${ensoDominantProb.label} ${formatProbability(ensoDominantProb.value)}` : "ENSO indisponível"), highlight: ensoProbabilityAvailable || ensoObservedAvailable },
                      ].map(item => (
                        <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"5px 7px", borderRadius:3 }}>
                          <div style={{ fontSize:9, fontWeight:600, color:t.textMuted }}>{item.l}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:item.highlight?"#f97316":t.text }}>{item.v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {station.type==="lagoa" && d.lagoa && (
                    <div style={{ marginTop:7 }}>
                      <div style={{ fontSize:8, color:t.textMuted, marginBottom:3, display:"flex", justifyContent:"space-between" }}>
                        <span>NÍVEL {d.lagoa.isReal ? (dataStaleness(getLagoaMeasuredAt(d.lagoa)) === "stale" ? "DESATUALIZADO" : "REAL") : "INDISPONÍVEL"}</span>
                        {d.lagoa.isReal && <span style={{ color:"#22c55e" }}>● ANA</span>}
                      </div>
                      {d.lagoa.isReal && d.lagoa.atual !== null ? (
                        <>
                          <div style={{ height:4, background:t.barBg, borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${Math.min(100,(d.lagoa.atual/1.5)*100)}%`, background:lagoaStatusColor(d.lagoa.levelStatus), borderRadius:2 }} />
                          </div>
                          <div style={{ fontSize:8, color:t.textMuted, marginTop:2 }}>{d.lagoa.atual.toFixed(2)}m / limiar por estação</div>
                        </>
                      ) : (
                        <div style={{ fontSize:8, color:t.textFaint, marginTop:2 }}>Sem leitura operacional validada</div>
                      )}
                    </div>
                  )}
                  {/* Indicador clicável */}
                  <div style={{ marginTop:8, fontSize:8, color:t.accent, textAlign:"right", opacity:0.7 }}>clique para detalhes →</div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* ══ PREVISÃO 14 DIAS ══ */}
        {!loading && activeTab==="previsao" && (
          <div>
            {/* Select com seta visível, apenas cidades */}
            <div style={{ position:"relative", display:"inline-block", marginBottom:14 }}>
              <select value={selStation.id} onChange={e=>setSelStation(STATIONS_CIDADES.find(st=>st.id===e.target.value)||STATIONS_CIDADES[0])}
                style={{ appearance:"none", WebkitAppearance:"none", background:t.inputBg, border:`1px solid ${t.borderActive}`, color:t.text, padding:"8px 36px 8px 12px", borderRadius:5, fontFamily:"inherit", fontSize:11, cursor:"pointer", minWidth:200 }}>
                {STATIONS_CIDADES.map(st=><option key={st.id} value={st.id} style={{ background:dark?"#0f172a":"#fff" }}>{st.name}</option>)}
              </select>
              <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:t.accent, fontSize:12 }}>▼</div>
            </div>
            {selData?.weather?.daily ? (
              <div>
                {/* 14 cards dias */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:20 }}>
                  {selData.weather.daily.time?.slice(0,14).map((date,i) => {
                    const dd=new Date(date+"T12:00:00");
                    const p=selData.weather.daily.precipitation_sum?.[i]||0;
                    const tx=selData.weather.daily.temperature_2m_max?.[i]||0;
                    const tn=selData.weather.daily.temperature_2m_min?.[i]||0;
                    const w=selData.weather.daily.windspeed_10m_max?.[i]||0;
                    const c=selData.weather.daily.weathercode?.[i]||0;
                    const baseDr=getRiskLevel(p*1.5,tn,w);
                    const dr=["CRITICO","EMERGENCIA","ALERTA"].includes(baseDr) ? baseDr : ((p>=10||w>=30||tn<5) ? "ATENCAO" : baseDr);
                    const r=RISK_LEVELS[dr];
                    const rColor=getRiskColor(dr);
                    return (
                      <div key={date} style={{ padding:"10px 6px", background:i===0?(dark?"rgba(34,211,238,0.08)":"rgba(8,145,178,0.08)"):(dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)"), border:`1px solid ${i===0?t.accent+"44":(dr!=="NORMAL"?rColor+"55":t.border)}`, borderRadius:5, textAlign:"center" }}>
                        <div style={{ fontSize:8, color:t.textMuted }}>{i===0?"HOJE":dayNames[dd.getDay()]}</div>
                        <div style={{ fontSize:8, color:t.textFaint }}>{dd.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</div>
                        <div style={{ fontSize:22, margin:"6px 0 4px" }}>{wmoEmoji(c)}</div>
                        <div style={{ fontSize:7, color:t.textMuted, marginBottom:5, minHeight:18 }}>{wmoDesc(c)}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#fbbf24" }}>{tx.toFixed(0)}°</div>
                        <div style={{ fontSize:10, color:"#60a5fa" }}>{tn.toFixed(0)}°</div>
                        <div style={{ marginTop:5, paddingTop:5, borderTop:`1px solid ${t.border}`, fontSize:8 }}>
                          <div style={{ color:t.accent }}>🌧 {p.toFixed(0)}mm</div>
                          <div style={{ color:t.textMuted }}>💨 {w.toFixed(0)}km/h</div>
                        </div>
                        <button
                          onClick={()=>setRiskExplain(explainDailyRisk(selStation, date, p, tn, w, dr))}
                          title="Clique para entender este status diário"
                          style={{ marginTop:5, background:"none", fontSize:7, padding:"2px 3px", border:`1px solid ${rColor}`, color:rColor, borderRadius:3, cursor:"pointer", fontFamily:"inherit" }}
                        >
                          {r.label} ⓘ
                        </button>
                      </div>
                    );
                  })}
                </div>
                {/* Gráfico precipitação */}
                <div style={{ ...s.card, marginBottom:12 }}>
                  <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>PRECIPITAÇÃO (mm/dia)</div>
                  <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:80 }}>
                    {selData.weather.daily.precipitation_sum?.slice(0,14).map((p,i) => {
                      const mx=Math.max(...selData.weather.daily.precipitation_sum.slice(0,14),1);
                      const dd=new Date(selData.weather.daily.time[i]+"T12:00:00");
                      return (
                        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <div style={{ fontSize:7, color:t.accent }}>{p.toFixed(0)}</div>
                          <div style={{ width:"100%", height:(p/mx)*70, minHeight:p>0?3:0, background:p>50?"#ef4444":p>20?"#f97316":t.accent, borderRadius:"2px 2px 0 0", opacity:0.8 }} />
                          <div style={{ fontSize:7, color:t.textFaint }}>{dayNames[dd.getDay()]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  onClick={()=>setRiskExplain(explainCityRisk(selStation, selData, ensoProbabilityText))}
                  title="Clique para entender a análise de risco"
                  style={{ padding:14, background:getRiskBg(selData.risk), border:`1px solid ${getRiskColor(selData.risk)}44`, borderRadius:5, cursor:"pointer" }}
                >
                  <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:8 }}>ANÁLISE DE RISCO — 14 DIAS</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                    {[
                      { l:"Precipitação", v:`${selData.precip?.toFixed(0)} mm`, a:selData.precip>80 },
                      { l:"Temp. mínima", v:`${selData.tempMin?.toFixed(1)}°C`,  a:selData.tempMin<5 },
                      { l:"Vento máx.",   v:`${selData.windMax?.toFixed(0)} km/h`, a:selData.windMax>50 },
                      { l:"Contexto climático",v: ensoObservedAvailable ? `${ensoClass.label} (Niño 3.4 ${formatSignedCelsius(activeENSO.nino34)})` : (ensoDominantProb ? `${ensoDominantProb.label} ${formatProbability(ensoDominantProb.value)}` : "ENSO indisponível"), a:false },
                    ].map(item=>(
                      <div key={item.l} style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:10, color:t.textMuted }}>{item.l}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:item.a?getRiskColor(selData.risk):"#22c55e" }}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : <div style={{ color:"#ef4444", fontSize:11 }}>Dados não disponíveis.</div>}
          </div>
        )}
        {/* ══ LAGOA DOS PATOS — ordem operacional de escoamento ══ */}
        {!loading && activeTab==="lagoa" && (
          <div>
            <div style={{ ...s.card, marginBottom:12, border:`1px solid ${t.borderActive}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>LAGOA DOS PATOS</div>
                  <div style={{ fontSize:24, fontWeight:900, color:t.text, marginTop:2 }}>Monitoramento em ordem de escoamento</div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:5 }}>
                    Organização visual: Itapuã → Arambaré → São Lourenço do Sul → Pelotas / Laranjal → São José do Norte → Rio Grande.
                  </div>
                  <div style={{ fontSize:9, color:t.textMuted, marginTop:4 }}>
                    Limiares validados: {lagoaSummary.thresholdValidated ?? 0}/{lagoaSummary.monitored} · sem limiar: {lagoaSummary.withoutThreshold ?? 0}
                  </div>
                  <div style={{ fontSize:9, color:t.textMuted, marginTop:4, lineHeight:1.6, wordBreak:"break-word" }}>
                    APIs em uso: RADAR Lagoa dos Patos ({LAGOA_RADAR_FUNCTION_URL}) · HidroSens/UFPel ({HIDROSENS_LARANJAL_FUNCTION_URL}) · ANA HidroWeb complementar quando houver código de estação.
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(90px, 1fr))", gap:8 }}>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Pontos com leitura</div>
                    <div style={{ fontSize:18, fontWeight:800, color:t.accent }}>{lagoaSummary.monitored}/{lagoaSummary.total}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Acima da cota</div>
                    <div style={{ fontSize:18, fontWeight:800, color:lagoaSummary.above ? "#f97316" : "#22c55e" }}>{lagoaSummary.above}</div>
                  </div>
                  <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                    <div style={{ fontSize:8, color:t.textMuted }}>Atualização</div>
                    <div style={{ fontSize:10, fontWeight:700, color:t.text }}>{lagoaSummary.latest ? formatDateTimeBR(lagoaSummary.latest) : "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(418px,1fr))", gap:11 }}>
              {STATIONS_LAGOA.map((point) => {
                const d = getLagoaPointData(point, stationData);
                const lagoa = d?.lagoa;
                const rColor = lagoaStatusColor(lagoa?.levelStatus);
                const sourceText = getLagoaSourceText(lagoa);
                const measuredAt = getLagoaMeasuredAt(lagoa);
                const max2024 = getLagoaMaxMay2024(lagoa);
                const hasLevel = lagoa?.isReal && lagoa?.atual !== null && lagoa?.atual !== undefined;
                const threshold = lagoa?.threshold_m ?? null;
                const progressBase = Math.max(threshold || lagoa?.atual || 1, 1);
                const progress = hasLevel ? Math.min(100, (lagoa.atual / progressBase) * 100) : 0;

                return (
                  <div key={point.id} style={{ ...s.card, border:`1px solid ${hasLevel ? rColor+"55" : t.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>PONTO {point.ordemEscoamento} · ESTAÇÃO</div>
                        <div style={{ fontSize:20, fontWeight:900, color:t.text }}>{point.name}</div>
                        <div style={{ fontSize:8, color:t.textFaint, marginTop:2 }}>{point.displayName}</div>
                      </div>
                      <button
                         onClick={()=>setRiskExplain(explainLagoaRisk(point, lagoa))}
                         title="Clique para entender este status"
                         style={{ background:"none", fontSize:9, fontWeight:800, padding:"3px 7px", border:`1px solid ${rColor}`, color:rColor, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}
                       >
                         {lagoaStatusLabel(lagoa?.levelStatus)} ⓘ
                       </button>
                    </div>

                    {hasLevel ? (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:10 }}>
                          <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Cota atual</div>
                            <div style={{ fontSize:33, fontWeight:900, color:rColor }}>{(lagoa.atual*100).toFixed(1)} cm</div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{lagoa.atual.toFixed(3)} m</div>
                          </div>
                          <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Fonte</div>
                            <div style={{ fontSize:17, fontWeight:900, color:t.text }}>{sourceText}</div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{measuredAt ? formatDateTimeBR(measuredAt) : "horário não informado"}</div>
                            {lagoa?.isFallback && (
                              <div style={{ fontSize:8, color:"#eab308", marginTop:3 }}>
                                {getFallbackWarningText(sourceText, lagoa.fallback_age_minutes)}
                              </div>
                            )}
                            {point.id === "lagoa_patos_pelotas" && (
                              <div style={{ fontSize:8, color:t.textMuted, marginTop:3 }}>
                                Sensor HidroSens UFPel · alerta 1,20 m · crítica 1,40 m · máx. maio/2024 2,40 m
                              </div>
                            )}
                          </div>
                          <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Cota de alerta</div>
                            <div style={{ fontSize:20, fontWeight:900, color:threshold ? "#f97316" : t.textFaint }}>
                              {threshold ? `${(threshold*100).toFixed(0)} cm` : "não validada"}
                            </div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{threshold ? `${threshold.toFixed(2)} m` : "alerta automático conforme limiar"}</div>
                          </div>
                          <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Máx. maio/2024</div>
                            <div style={{ fontSize:20, fontWeight:900, color:max2024 ? "#60a5fa" : t.textFaint }}>
                              {max2024 ? `${(max2024*100).toFixed(0)} cm` : "–"}
                            </div>
                            <div style={{ fontSize:8, color:t.textMuted }}>{max2024 ? `${max2024.toFixed(2)} m` : "sem referência no sensor"}</div>
                          </div>
                        </div>

                        <div style={{ height:5, background:t.barBg, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ width:`${progress}%`, height:"100%", background:rColor, borderRadius:3 }} />
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:8, color:t.textMuted }}>
                          <span>{sourceText}</span>
                          <span>{threshold ? `limiar ${threshold.toFixed(2)} m` : "limiar não validado"}</span>
                        </div>
                        {/* BLOCO C — frescor do dado */}
                        <div style={{ marginTop:6 }}>
                          <StaleBadge
                            measuredAt={getLagoaMeasuredAt(lagoa)}
                            fallback={lagoa?.isFallback}
                            fallbackAgeMin={lagoa?.fallback_age_minutes}
                            t={t}
                          />
                        </div>
                        {/* BLOCO B — sparkline histórico */}
                        {(() => {
                          const hist = loadHistory()[point.id] || [];
                          return hist.length >= 2 ? (
                            <Sparkline points={hist} color={rColor} t={t} />
                          ) : null;
                        })()}
                      </>
                    ) : (
                      <div style={{ padding:12, background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:5, color:t.textMuted, fontSize:10 }}>
                        {point.sourceHint === "ANA" ? "Sem leitura ANA operacional validada no período." : "Sem leitura operacional validada no período."}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ ENSO — SITREP REAL NOAA/CPC + IRI/CCSR ══ */}
        {activeTab==="enso" && (
          <div style={{ display:"grid", gap:12 }}>
            <div style={{ padding:"12px 16px", background: dark?"rgba(34,211,238,0.08)":"rgba(8,145,178,0.06)", border:`1px solid ${t.borderActive}`, borderRadius:5, display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:24 }}>🌡️</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:3 }}>ENSO — SITREP OBSERVADO + PROBABILÍSTICO</div>
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  {ensoObservedText}. {ensoProbabilityText}. Sem valores simulados: quando a fonte não responde, o dado fica indisponível.
                </div>
              </div>
            </div>

            <div style={{ padding:"8px 14px", background: dark?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:4, fontSize:9, color: dark?"#bbf7d0":"#166534", display:"flex", gap:8, alignItems:"center" }}>
              ✅ <span><strong>Fontes ativas:</strong> observado por NOAA/CPC; probabilidade por IRI/CCSR. Consulta: {activeENSO.probabilityFetchedAt ? formatDateTimeBR(activeENSO.probabilityFetchedAt) : lastUpdate ? lastUpdate.toLocaleString("pt-BR") : "sem horário"}.</span>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:11 }}>
              {[
                { l:"Fase observada", v: ensoObservedAvailable ? `${ensoClass.icon} ${ensoClass.label}` : "indisponível", s: ensoObservedAvailable ? `Niño 3.4: ${formatSignedCelsius(activeENSO.nino34)}` : "NOAA/CPC sem leitura", c:ensoClass.color },
                { l:"ONI trimestral", v: formatSignedCelsius(activeENSO.oni3m), s:"NOAA/CPC observado", c: ensoObservedAvailable ? "#f97316" : "#64748b" },
                { l:"Prob. El Niño", v: formatProbability(activeENSO.prob?.elNino), s: ensoFirstForecast?.p ? `IRI/CCSR · ${ensoFirstForecast.p}` : "IRI/CCSR", c:"#f97316" },
                { l:"Prob. Neutro", v: formatProbability(activeENSO.prob?.neutral), s:"IRI/CCSR", c:"#22c55e" },
                { l:"Prob. La Niña", v: formatProbability(activeENSO.prob?.laNina), s:"IRI/CCSR", c:"#3b82f6" },
                { l:"Tipo de uso", v:"Contexto climático", s:"não dispara alerta sozinho", c:"#eab308" },
              ].map(item=>(
                <div key={item.l} style={{ padding:"12px 14px", background:t.cardBg, border:`1px solid ${item.c}44`, borderTop:`3px solid ${item.c}`, borderRadius:5, boxShadow:t.shadowCard }}>
                  <div style={{ fontSize:8, color:t.textMuted, letterSpacing:2, marginBottom:5 }}>{item.l.toUpperCase()}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:item.c, marginBottom:3 }}>{item.v}</div>
                  <div style={{ fontSize:8, color:t.textFaint }}>{item.s}</div>
                </div>
              ))}
            </div>

            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>ESCALA NIÑO 3.4 — OBSERVADO NOAA/CPC</div>
              <div style={{ position:"relative", height:24, borderRadius:3, overflow:"hidden", background:t.barBg }}>
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#1e3a8a 0%,#3b82f6 20%,#22c55e 38%,#22c55e 62%,#f97316 76%,#ef4444 88%,#dc2626 100%)", opacity:0.75 }} />
                {[
                  {l:"La Niña Forte",pos:"10%"},{l:"La Niña",pos:"28%"},{l:"Neutro",pos:"50%"},{l:"El Niño",pos:"70%"},{l:"Super",pos:"90%"}
                ].map(lb=>(
                  <div key={lb.l} style={{ position:"absolute", top:0, left:lb.pos, transform:"translateX(-50%)", fontSize:7, color:"rgba(255,255,255,0.8)", height:"100%", display:"flex", alignItems:"center" }}>{lb.l}</div>
                ))}
                {ensoObservedAvailable && (
                  <div style={{ position:"absolute", top:0, left:`${Math.min(97,Math.max(3,((activeENSO.nino34+3)/6)*100))}%`, transform:"translateX(-50%)", width:3, height:"100%", background:"#fff", boxShadow:"0 0 6px #fff" }} />
                )}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:8, color:t.textMuted }}>
                <span>-3°C</span>
                <span style={{ color:ensoClass.color, fontWeight:700 }}>{ensoObservedAvailable ? `▲ ATUAL: ${formatSignedCelsius(activeENSO.nino34)} → ${ensoClass.label}` : "NOAA/CPC indisponível"}</span>
                <span>+3°C</span>
              </div>
            </div>

            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>PREVISÃO PROBABILÍSTICA IRI/CCSR — CURVAS DE EVOLUÇÃO</div>
              <div style={{ fontSize:9, color:t.textFaint, marginBottom:12 }}>
                Cada linha mostra como a probabilidade de cada fase ENSO sobe ou cai mês a mês. O cruzamento das curvas indica transição de fase.
              </div>
              {safeEnsoForecast(activeENSO.forecast).length >= 2 ? (() => {
                const pts = safeEnsoForecast(activeENSO.forecast);
                const W = 520, H = 160, padL = 36, padR = 12, padT = 10, padB = 28;
                const innerW = W - padL - padR;
                const innerH = H - padT - padB;
                const xOf = (i) => padL + (i / (pts.length - 1)) * innerW;
                const yOf = (v) => padT + innerH - (typeof v === "number" && Number.isFinite(v) ? v * innerH : 0);
                const mkLine = (key, color) => {
                  const d = pts.map((f,i) => `${i===0?"M":"L"}${xOf(i).toFixed(1)},${yOf(f[key]).toFixed(1)}`).join(" ");
                  const lastV = pts[pts.length-1][key];
                  const lastX = xOf(pts.length-1);
                  const lastY = yOf(lastV);
                  return { d, color, lastV, lastX, lastY };
                };
                const lines = [
                  { key:"en", label:"El Niño",  ...mkLine("en","#f97316") },
                  { key:"nu", label:"Neutro",   ...mkLine("nu","#22c55e") },
                  { key:"ln", label:"La Niña",  ...mkLine("ln","#3b82f6") },
                ];
                const yGridVals = [0, 0.25, 0.5, 0.75, 1.0];
                return (
                  <div>
                    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible", display:"block" }}>
                      {/* grid horizontal */}
                      {yGridVals.map(v => (
                        <g key={v}>
                          <line x1={padL} x2={W-padR} y1={yOf(v)} y2={yOf(v)} stroke={dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.07)"} strokeWidth="1"/>
                          <text x={padL-4} y={yOf(v)+3} textAnchor="end" fontSize="7" fill={dark?"#64748b":"#94a3b8"}>{Math.round(v*100)}%</text>
                        </g>
                      ))}
                      {/* grid vertical por período */}
                      {pts.map((f,i) => (
                        <g key={i}>
                          <line x1={xOf(i)} x2={xOf(i)} y1={padT} y2={padT+innerH} stroke={dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"} strokeWidth="1"/>
                          <text x={xOf(i)} y={padT+innerH+14} textAnchor="middle" fontSize="7" fill={dark?"#64748b":"#94a3b8"}>{f.p}</text>
                        </g>
                      ))}
                      {/* limiar 50% */}
                      <line x1={padL} x2={W-padR} y1={yOf(0.5)} y2={yOf(0.5)} stroke="#eab30855" strokeWidth="1" strokeDasharray="4 3"/>
                      {/* linhas das fases */}
                      {lines.map(ln => (
                        <g key={ln.key}>
                          <path d={ln.d} fill="none" stroke={ln.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9"/>
                          {pts.map((f,i) => (
                            <circle key={i} cx={xOf(i)} cy={yOf(f[ln.key])} r="3" fill={ln.color} opacity="0.85"/>
                          ))}
                          {/* label no final */}
                          <text x={ln.lastX + 6} y={ln.lastY + 3} fontSize="8" fill={ln.color} fontWeight="700">{ln.label} {typeof ln.lastV === "number" ? Math.round(ln.lastV*100)+"%" : ""}</text>
                        </g>
                      ))}
                    </svg>
                    {/* tabela compacta abaixo */}
                    <div style={{ display:"grid", gap:5, marginTop:10 }}>
                      {pts.map((f,i) => (
                        <div key={i} style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 1fr", gap:6, alignItems:"center", padding:"4px 6px", background: i===0?(dark?"rgba(34,211,238,0.06)":"rgba(8,145,178,0.05)"):"transparent", borderRadius:3 }}>
                          <div style={{ fontSize:9, fontWeight: i===0?700:400, color: i===0?t.accent:t.textMuted }}>{f.p}{i===0?" (próximo)":""}</div>
                          {[{l:"El Niño",v:f.en,c:"#f97316"},{l:"Neutro",v:f.nu,c:"#22c55e"},{l:"La Niña",v:f.ln,c:"#3b82f6"}].map(bar=>(
                            <div key={bar.l} style={{ fontSize:9, color:bar.c, fontWeight:600 }}>{bar.l} {formatProbability(bar.v)}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })() : (
                <div style={{ fontSize:10, color:t.textMuted }}>Sem previsão probabilística validada no momento. A curva aparece quando a Edge Function IRI/CCSR retornar dados.</div>
              )}
              <div style={{ fontSize:8, color:t.textFaint, marginTop:8 }}>
                Fonte: {activeENSO.probabilitySource || "IRI/CCSR"} · Referência: {activeENSO.probabilityReferenceDate || "indisponível"} · Consulta: {activeENSO.probabilityFetchedAt ? formatDateTimeBR(activeENSO.probabilityFetchedAt) : "sem horário"}
              </div>
            </div>

            <div style={{ padding:12, background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:5 }}>
              <div style={{ fontSize:10, color:"#eab308", letterSpacing:2, marginBottom:6 }}>REGRA OPERACIONAL</div>
              <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                ENSO e CPTEC são contexto climático. Não geram alerta local sozinhos. Alertas operacionais dependem de Defesa Civil, chuva observada CEMADEN, previsão oficial INMET/Open-Meteo e níveis reais da Lagoa/RADAR/HidroSens.
              </div>
            </div>
          </div>
        )}

        {/* ══ CPTEC / INPE ══ */}
        {!loading && activeTab==="cptec" && (
          <div>
            <div style={{ ...s.card, marginBottom:12, border:`1px solid ${t.borderActive}` }}>
              <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>CPTEC/INPE</div>
              <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>Produtos sazonais e subsazonais oficiais</div>
              <div style={{ fontSize:10, color:t.textMuted, marginTop:5 }}>
                Mapas oficiais do CPTEC/INPE para tendência climática. Eles ajudam a entender o cenário das próximas semanas ou meses, mas não substituem alerta local da Defesa Civil, CEMADEN, INMET ou sensores de nível.
              </div>
              <div style={{ marginTop:8, display:"flex", gap:8, flexWrap:"wrap", fontSize:9 }}>
                <span style={{ padding:"4px 8px", border:`1px solid ${cptecProducts?.ok ? "#22c55e" : "#64748b"}`, color:cptecProducts?.ok ? "#22c55e" : t.textMuted, borderRadius:4 }}>
                  {cptecProducts?.ok ? "ATIVO" : "CARREGANDO"}
                </span>
                <span style={{ padding:"4px 8px", border:`1px solid ${t.border}`, color:t.textMuted, borderRadius:4 }}>
                  Produtos válidos: {cptecProducts?.available ?? 0}/{cptecProducts?.total ?? 0}
                </span>
                <span style={{ padding:"4px 8px", border:`1px solid ${t.border}`, color:t.textMuted, borderRadius:4 }}>
                  Última consulta: {cptecProducts?.fetched_at ? formatDateTimeBR(cptecProducts.fetched_at) : "—"}
                </span>
              </div>
            </div>

            <div style={{ padding:"10px 14px", background: dark?"rgba(34,211,238,0.05)":"rgba(8,145,178,0.04)", border:`1px solid ${t.border}`, borderRadius:5, fontSize:10, color:t.textMuted, lineHeight:1.6, marginBottom:12 }}>
              <strong style={{ color:t.text }}>Como ler estes mapas:</strong> todos mostram tendência, não previsão exata para um dia específico. Precipitação indica tendência de chuva acumulada; temperatura compara frio/calor com o padrão histórico; ENSO mostra influência oceânica; produtos sazonais olham cerca de 3 meses; subsazonais olham algumas semanas.
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:12 }}>
              {(cptecProducts?.products || []).filter((p) => p.ok).map((p) => (
                <div key={p.id} style={{ ...s.card, overflow:"hidden" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:8, color:t.textMuted, letterSpacing:2 }}>{p.group?.toUpperCase()} · {p.period}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:t.text }}>{p.title}</div>
                    </div>
                    <div style={{ fontSize:8, color:"#22c55e", border:"1px solid #22c55e55", borderRadius:4, padding:"3px 6px" }}>OK</div>
                  </div>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt={p.title} style={{ width:"100%", borderRadius:6, border:`1px solid ${t.border}`, background:"#fff" }} />
                  </a>
                  <div style={{ marginTop:7, fontSize:8, color:t.textMuted }}>
                    Fonte: CPTEC/INPE · produto gráfico oficial · {p.contentLength ? `${Math.round(p.contentLength/1024)} KB` : "tamanho não informado"}
                  </div>
                  {/* Rodapé explicativo por tipo de produto */}
                  <div style={{ marginTop:6, padding:"7px 10px", background: dark?"rgba(34,211,238,0.04)":"rgba(8,145,178,0.03)", border:`1px solid ${t.border}`, borderRadius:4, fontSize:8, color:t.textMuted, lineHeight:1.6 }}>
                    {p.group?.toLowerCase().includes("precipitacao") || p.group?.toLowerCase().includes("chuva") ? (
                      <span>🌧 <strong style={{color:t.text}}>Chuva:</strong> indica onde o modelo espera mais ou menos chuva no período do mapa. Serve para tendência regional, não para decidir chuva diária por município.</span>
                    ) : p.group?.toLowerCase().includes("temperatura") || p.group?.toLowerCase().includes("temp") ? (
                      <span>🌡 <strong style={{color:t.text}}>Temperatura:</strong> compara a temperatura esperada com o padrão histórico. Vermelho costuma indicar mais quente que o normal; azul, mais frio que o normal.</span>
                    ) : p.group?.toLowerCase().includes("enso") || p.group?.toLowerCase().includes("el ni") ? (
                      <span>🌊 <strong style={{color:t.text}}>ENSO:</strong> mostra como El Niño, La Niña ou neutralidade podem influenciar chuva e temperatura. É contexto climático, não alerta local.</span>
                    ) : p.group?.toLowerCase().includes("saz") || p.title?.toLowerCase().includes("sazonal") ? (
                      <span>📅 <strong style={{color:t.text}}>Sazonal:</strong> resume a tendência provável para cerca de 3 meses, usando modelos climáticos e condições dos oceanos. Não informa o tempo de um dia específico.</span>
                    ) : p.title?.toLowerCase().includes("subsaz") || p.group?.toLowerCase().includes("subsaz") ? (
                      <span>📆 <strong style={{color:t.text}}>Subsazonal:</strong> olha as próximas semanas. É mais próximo que a sazonal, mas a incerteza aumenta quanto mais distante estiver a semana analisada.</span>
                    ) : (
                      <span>🛰 <strong style={{color:t.text}}>Produto CPTEC/INPE:</strong> imagem oficial de previsão ou monitoramento climático. Clique para ampliar. Use como contexto regional, sem acionar alerta sozinho.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {cptecProducts && !cptecProducts.ok && (
              <div style={{ ...s.card, color:t.textMuted, fontSize:11 }}>
                Nenhum produto CPTEC/INPE validado no momento.
              </div>
            )}
          </div>
        )}

        {/* ══ COPERNICUS ══ */}
        {activeTab==="copernicus" && (
          <div style={{ display:"grid", gap:12 }}>
            <div style={{ padding:"10px 14px", background: dark?"rgba(139,92,246,0.08)":"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.3)", borderRadius:5, fontSize:10, color: dark?"#c4b5fd":"#7c3aed" }}>
              🛰️ <strong>Copernicus — produtos reais ativos.</strong> Sentinel-2 observa água e vegetação quando há céu útil. Sentinel-1 usa radar e ajuda mesmo com nuvens ou à noite. As cores dos números destacam o tipo do indicador e a qualidade da leitura; não são alerta oficial. A decisão operacional continua dependendo de Defesa Civil, CEMADEN, RADAR Lagoa, HidroSens e demais fontes responsáveis.
            </div>

            <div style={{ ...s.card, border:`1px solid ${copernicusEms?.ok ? "#22c55e55" : "#eab30855"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS EMS / CEMS</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>Rapid Mapping + Risk and Recovery</div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    API pública oficial. Uso no Sentinela-RS: resposta pós-evento e referência histórica validada; não aciona alerta automático sozinho.
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:`1px solid ${copernicusEms?.ok ? "#22c55e" : "#eab308"}`, color:copernicusEms?.ok ? "#22c55e" : "#eab308" }}>
                  {copernicusEms?.ok ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusEms?.ok ? (
                <div style={{ display:"grid", gap:10 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:8 }}>
                    <div style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                      <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>ATIVAÇÕES BRASIL/FLOOD</div>
                      <div style={{ fontSize:22, fontWeight:900, color:"#22c55e" }}>{copernicusEms.rapid_mapping?.recent_brazil_floods?.length ?? 0}</div>
                      <div style={{ fontSize:8, color:t.textMuted }}>consulta pública Rapid Mapping</div>
                    </div>
                    <div style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                      <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>EMSR720</div>
                      <div style={{ fontSize:15, fontWeight:900, color:t.text }}>{copernicusEms.rapid_mapping?.rs_2024?.aois?.length ?? 0} áreas</div>
                      <div style={{ fontSize:8, color:t.textMuted }}>RS 2024 · Rapid Mapping</div>
                    </div>
                    <div style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                      <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>EMSN194</div>
                      <div style={{ fontSize:15, fontWeight:900, color:t.text }}>{copernicusEms.risk_recovery?.rs_2024?.products?.length ?? 0} produtos</div>
                      <div style={{ fontSize:8, color:t.textMuted }}>Porto Alegre · Risk and Recovery</div>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:8 }}>
                    {(copernicusEms.risk_recovery?.rs_2024?.products || []).map((p) => (
                      <div key={p.productName} style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:14, fontWeight:900, color:t.text }}>{p.productName} · {p.productAcronym}</div>
                        <div style={{ fontSize:10, color:t.textMuted, marginTop:3 }}>{p.analysisName}</div>
                        <div style={{ fontSize:8, color:t.textFaint, marginTop:5 }}>
                          AOIs: {(p.aois || []).map(a=>a.aoiName).join(", ") || "não informado"} · Camadas ArcGIS: {p.arcgisLayers?.length || 0}
                        </div>
                        {p.arcgisLayers?.[0]?.[1] && (
                          <a href={p.arcgisLayers[0][1]} target="_blank" rel="noreferrer" style={{ display:"inline-block", marginTop:7, fontSize:9, color:t.accent }}>
                            abrir camada ArcGIS →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize:9, color:t.textMuted, lineHeight:1.55 }}>
                    EMSR720 cobre áreas mapeadas no evento de maio/2024 como Guaporé, Encantado, Das Antas Dam e Santa Tereza. EMSN194 cobre Porto Alegre, Canoas, Porto Alegre North e Porto Alegre South em produtos de delineação, análise temporal, danos e exposição.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted }}>Copernicus EMS ainda não carregado nesta sessão.</div>
              )}
            </div>

            <div style={{ ...s.card, border:`1px solid ${copernicusWater?.ok ? "#22c55e55" : "#eab30855"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS WATER</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>
                    {copernicusWater?.aoi || "Lagoa dos Patos"}
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    {copernicusWater?.product || "Sentinel-2 L2A NDWI water indicator"}
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:`1px solid ${copernicusWater?.ok ? "#22c55e" : "#eab308"}`, color:copernicusWater?.ok ? "#22c55e" : "#eab308" }}>
                  {copernicusWater?.ok ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusWater?.ok ? (
                <>
                  {/* BLOCO: aviso de cobertura insuficiente */}
                  {typeof copernicusWater.valid_coverage_percent === "number" && copernicusWater.valid_coverage_percent < 30 && (
                    <div style={{ marginBottom:10, padding:"8px 10px", background: dark?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:4, fontSize:9, color:dark?"#fca5a5":"#b91c1c", lineHeight:1.5 }}>
                      ⛅ <strong>Cobertura válida insuficiente: {copernicusWater.valid_coverage_percent}%</strong> — alta nebulosidade no período. O indicador de água superficial ({copernicusWater.water_percent}%) pode não ser representativo. Use Sentinel-1 SAR como referência complementar e confirme com Defesa Civil, CEMADEN e RADAR Lagoa.
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
                    {[
                      { l:"Água superficial", v:`${copernicusWater.water_percent}%`, c: typeof copernicusWater.valid_coverage_percent === "number" && copernicusWater.valid_coverage_percent < 30 ? "#64748b" : "#22d3ee" },
                      { l:"NDWI médio", v: typeof copernicusWater.ndwi_mean === "number" ? copernicusWater.ndwi_mean.toFixed(3) : "–", c:"#60a5fa" },
                      { l:"Cobertura válida", v: typeof copernicusWater.valid_coverage_percent === "number" ? `${copernicusWater.valid_coverage_percent}%` : "–", c:"#22c55e" },
                      { l:"Amostras", v: copernicusWater.sample_count?.toLocaleString("pt-BR") || "–", c:t.text },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>{item.l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:item.c, marginTop:3 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
                    Período: {copernicusWater.period?.from ? formatDateTimeBR(copernicusWater.period.from) : "–"} → {copernicusWater.period?.to ? formatDateTimeBR(copernicusWater.period.to) : "–"} · Consulta: {copernicusWater.fetched_at ? formatDateTimeBR(copernicusWater.fetched_at) : "sem horário"}
                  </div>

                  {/* Explicação em linguagem clara */}
                  <div style={{ marginTop:10, padding:"9px 12px", background: dark?"rgba(34,211,238,0.05)":"rgba(8,145,178,0.04)", border:`1px solid ${t.border}`, borderRadius:4, fontSize:9, color:t.textMuted, lineHeight:1.65 }}>
                    <strong style={{ color:t.text, display:"block", marginBottom:4 }}>Como interpretar:</strong>
                    O app compara os pixels válidos da imagem com um índice de água. Se a cobertura válida for baixa, havia nuvem, sombra ou outro bloqueio e o resultado fica menos confiável. Água superficial e NDWI ajudam a ver a presença de água na imagem, mas não confirmam inundação sozinhos.
                  </div>
                  <div style={{ marginTop:8, padding:"8px 10px", background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color:dark?"#fef08a":"#854d0e", lineHeight:1.5 }}>
                    ⚠ Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, o Sentinel-1 SAR abaixo funciona mesmo à noite e com céu fechado.
                  </div>
                  <div style={{ marginTop:6, fontSize:8, color:t.textFaint }}>
                    Fonte: {copernicusWater.source} · Regra: {copernicusWater.threshold}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  Produto real ainda não carregado nesta sessão. A função Copernicus Water já existe; se persistir, verificar a aba Fontes de Dados ou rodar o auditor.
                </div>
              )}
            </div>

            <div style={{ ...s.card, border:`1px solid ${copernicusS1?.water_like_percent !== undefined ? "#8b5cf655" : "#eab30855"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS SENTINEL-1</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>
                    {copernicusS1?.aoi || "Lagoa dos Patos"}
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    Radar SAR · água/alagamento sob nuvens/noite
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:`1px solid ${copernicusS1?.water_like_percent !== undefined ? "#8b5cf6" : "#eab308"}`, color:copernicusS1?.water_like_percent !== undefined ? "#8b5cf6" : "#eab308" }}>
                  {copernicusS1?.water_like_percent !== undefined ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusS1?.water_like_percent !== undefined ? (
                <>
                  {/* BLOCO: aviso cobertura SAR insuficiente */}
                  {typeof copernicusS1.valid_coverage_percent === "number" && copernicusS1.valid_coverage_percent < 30 && (
                    <div style={{ marginBottom:10, padding:"8px 10px", background: dark?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:4, fontSize:9, color:dark?"#fca5a5":"#b91c1c", lineHeight:1.5 }}>
                      📡 <strong>Cobertura SAR válida: {copernicusS1.valid_coverage_percent}%</strong> — dados insuficientes para o período. O Sentinel-1 é radar (funciona com nuvens), mas baixa cobertura indica ausência de passagens no intervalo. Interprete com cautela.
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
                    {[
                      { l:"Indicador SAR água", v:`${copernicusS1.water_like_percent}%`, c: typeof copernicusS1.valid_coverage_percent === "number" && copernicusS1.valid_coverage_percent < 30 ? "#64748b" : "#8b5cf6" },
                      { l:"VV médio", v: typeof copernicusS1.vv_db_mean === "number" ? `${copernicusS1.vv_db_mean.toFixed(2)} dB` : "–", c:"#60a5fa" },
                      { l:"VH médio", v: typeof copernicusS1.vh_db_mean === "number" ? `${copernicusS1.vh_db_mean.toFixed(2)} dB` : "–", c:"#22d3ee" },
                      { l:"Cobertura válida", v: typeof copernicusS1.valid_coverage_percent === "number" ? `${copernicusS1.valid_coverage_percent}%` : "–", c:"#22c55e" },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>{item.l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:item.c, marginTop:3 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
                    Período: {copernicusS1.period?.from ? formatDateTimeBR(copernicusS1.period.from) : "–"} → {copernicusS1.period?.to ? formatDateTimeBR(copernicusS1.period.to) : "–"} · Consulta: {copernicusS1.fetched_at ? formatDateTimeBR(copernicusS1.fetched_at) : "sem horário"}
                  </div>

                  {/* Explicação em linguagem clara */}
                  <div style={{ marginTop:10, padding:"9px 12px", background: dark?"rgba(139,92,246,0.05)":"rgba(139,92,246,0.04)", border:`1px solid ${t.border}`, borderRadius:4, fontSize:9, color:t.textMuted, lineHeight:1.65 }}>
                    <strong style={{ color:t.text, display:"block", marginBottom:4 }}>Como interpretar:</strong>
                    O Sentinel-1 mede o retorno do sinal de radar. Superfícies de água costumam devolver pouco sinal, por isso aparecem como “compatíveis com água”. Esse é um bom apoio quando há nuvens, mas pode confundir áreas urbanas, vegetação inundada, vento sobre a água e sombras de relevo.
                  </div>
                  <div style={{ marginTop:8, padding:"8px 10px", background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color:dark?"#fef08a":"#854d0e", lineHeight:1.5 }}>
                    ⚠ {copernicusS1.limitation || "Indicador SAR de baixa retroespalhamento compatível com água. Pode falhar em áreas urbanas, vegetação inundada, vento forte sobre água e sombras de relevo. Confirmar com Defesa Civil, CEMADEN, RADAR Lagoa e HidroSens."}
                  </div>
                  <div style={{ marginTop:6, fontSize:8, color:t.textFaint }}>
                    Fonte: {copernicusS1.source} · Método: {copernicusS1.method}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  Produto Sentinel-1 ainda não carregado nesta sessão. Se persistir, rode o diagnóstico do endpoint.
                </div>
              )}
            </div>

            <div style={{ ...s.card, border:`1px solid ${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e55" : "#eab30855"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>COPERNICUS NDVI</div>
                  <div style={{ fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>
                    {copernicusNdvi?.aoi || "Entorno terrestre da Lagoa dos Patos"}
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>
                    Vegetação/estiagem · Sentinel-2 L2A
                  </div>
                </div>
                <div style={{ fontSize:9, padding:"4px 8px", borderRadius:4, border:`1px solid ${copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308"}`, color:copernicusNdvi?.ndvi_mean !== undefined ? "#22c55e" : "#eab308" }}>
                  {copernicusNdvi?.ndvi_mean !== undefined ? "ATIVO" : "AGUARDANDO"}
                </div>
              </div>

              {copernicusNdvi?.ndvi_mean !== undefined ? (
                <>
                  {/* BLOCO: aviso cobertura NDVI insuficiente */}
                  {typeof copernicusNdvi.valid_coverage_percent === "number" && copernicusNdvi.valid_coverage_percent < 30 && (
                    <div style={{ marginBottom:10, padding:"8px 10px", background: dark?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:4, fontSize:9, color:dark?"#fca5a5":"#b91c1c", lineHeight:1.5 }}>
                      🌿 <strong>Cobertura válida insuficiente: {copernicusNdvi.valid_coverage_percent}%</strong> — alta nebulosidade no período. O NDVI ({copernicusNdvi.ndvi_mean.toFixed(3)}) pode não ser representativo do estado atual da vegetação.
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
                    {[
                      { l:"NDVI médio", v:copernicusNdvi.ndvi_mean.toFixed(3), c: typeof copernicusNdvi.valid_coverage_percent === "number" && copernicusNdvi.valid_coverage_percent < 30 ? "#64748b" : "#22c55e" },
                      { l:"Vegetação saudável", v: typeof copernicusNdvi.vegetation_percent === "number" ? `${copernicusNdvi.vegetation_percent}%` : "–", c:"#16a34a" },
                      { l:"Vegetação baixa", v: typeof copernicusNdvi.low_vegetation_percent === "number" ? `${copernicusNdvi.low_vegetation_percent}%` : "–", c:"#eab308" },
                      { l:"Cobertura válida", v: typeof copernicusNdvi.valid_coverage_percent === "number" ? `${copernicusNdvi.valid_coverage_percent}%` : "–", c:"#22d3ee" },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                        <div style={{ fontSize:8, color:t.textMuted, letterSpacing:1.5 }}>{item.l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:item.c, marginTop:3 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, fontSize:9, color:t.textMuted, lineHeight:1.6 }}>
                    Período: {copernicusNdvi.period?.from ? formatDateTimeBR(copernicusNdvi.period.from) : "–"} → {copernicusNdvi.period?.to ? formatDateTimeBR(copernicusNdvi.period.to) : "–"} · Consulta: {copernicusNdvi.fetched_at ? formatDateTimeBR(copernicusNdvi.fetched_at) : "sem horário"}
                  </div>

                  <div style={{ marginTop:8, padding:"8px 10px", background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color:dark?"#fef08a":"#854d0e", lineHeight:1.5 }}>
                    ⚠ {copernicusNdvi.limitation || "NDVI ajuda a acompanhar vigor da vegetação e sinais de estiagem. É contexto ambiental e não gera alerta automático sozinho."}
                  </div>

                  <div style={{ marginTop:6, fontSize:8, color:t.textFaint }}>
                    Fonte: {copernicusNdvi.source} · Método: {copernicusNdvi.method}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  Produto NDVI ainda não carregado nesta sessão. Se persistir, rode o diagnóstico do endpoint.
                </div>
              )}
            </div>

            {COPERNICUS_REFERENCE.themes.length > 0 && (
              <>
              <div style={{ padding:"8px 14px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color: dark?"#fef08a":"#854d0e" }}>
                🗓 <strong>Referências históricas:</strong> os cartões abaixo não são SITREP operacional. São contexto técnico/histórico separado da leitura Copernicus Water acima.
              </div>

              <div style={{ display:"grid", gap:8 }}>
                {COPERNICUS_REFERENCE.themes.map(theme=>(
                <div key={theme.id} style={{ background:t.cardBg, border:`1px solid ${theme.color}44`, borderLeft:`4px solid ${theme.color}`, borderRadius:5, overflow:"hidden", boxShadow:t.shadowCard }}>
                  <div style={{ padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:11 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:20 }}>{theme.icon}</span>
                        <div style={{ fontSize:13, fontWeight:600, color:t.text }}>{theme.name}</div>
                        <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${theme.color}`, color:theme.color, borderRadius:3, letterSpacing:2 }}>REFERÊNCIA</div>
                      </div>
                      <div style={{ fontSize:10, color:t.textMuted, marginBottom:4, lineHeight:1.5 }}><strong style={{ color:t.text }}>Histórico RS:</strong> {theme.rsHistory}</div>
                      <div style={{ fontSize:9, color:t.textFaint }}>📡 {theme.copSource}</div>
                    </div>
                    <div style={{ flexShrink:0, textAlign:"right", maxWidth:170 }}>
                      <div style={{ fontSize:8, color:"#eab308", marginBottom:4 }}>○ NÃO OPERACIONAL</div>
                      <div style={{ fontSize:9, color:theme.color, fontWeight:600, textAlign:"right", lineHeight:1.4 }}>{theme.indicator}</div>
                    </div>
                  </div>
                </div>
                ))}
              </div>
              </>
            )}
          </div>
        )}

        {/* ══ QUEIMADAS / APAs ══ */}
        {activeTab==="queimadas" && (
          <div style={{ display:"grid", gap:12 }}>
            <div style={{ padding:"10px 14px", background: dark?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:5, fontSize:10, color: dark?"#fdba74":"#c2410c", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <span>🔥 Focos via <strong>INPE BDQueimadas</strong> (48h). <strong>EFFIS/Copernicus</strong> fica como integração complementar possível para perigo de fogo, focos ativos e área queimada, sem acionar alerta enquanto não houver endpoint validado.</span>
              <button onClick={loadQueimadas} disabled={qLoading} style={{ background:"none", border:"1px solid rgba(249,115,22,0.5)", color:"#fdba74", padding:"5px 12px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:9, letterSpacing:1 }}>{qLoading ? "⏳ Consultando..." : "↻ Atualizar"}</button>
            </div>
            {!queimadas && !qLoading && (
              <div style={{ padding:"10px 14px", background: dark?"rgba(0,0,0,0.2)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, fontSize:10, color:t.textMuted }}>
                ℹ️ A API INPE BDQueimadas pode estar temporariamente indisponível. Isso é frequente fora do período de seca (maio/inverno). Clique em <strong>Atualizar</strong> para tentar novamente. Dados históricos de referência: RS registrou focos concentrados em outubro–novembro, com pico em anos de estiagem.
              </div>
            )}

            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>ÁREAS MONITORADAS — PORTO ALEGRE AO CHUÍ</div>
              <div style={{ fontSize:9, color:t.textMuted, marginBottom:12, lineHeight:1.5 }}>
                Corredor costeiro e lagunar para cruzar focos INPE, unidades de conservação, fumaça e camadas futuras EFFIS. Estes cards indicam área de monitoramento; só viram alerta quando houver foco real ou endpoint de risco validado.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:8 }}>
                {FIRE_MONITORED_AREAS_RS.map((area, idx)=>(
                  <div key={area.id} style={{ background:dark?"rgba(0,0,0,0.25)":t.bg, border:`1px solid ${t.border}`, borderRadius:5, padding:"10px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:8, color:t.textFaint, letterSpacing:1.5 }}>TRECHO {idx+1}</div>
                        <div style={{ fontSize:13, fontWeight:900, color:t.text }}>{area.name}</div>
                      </div>
                      <div style={{ fontSize:8, color:"#eab308", border:"1px solid rgba(234,179,8,0.45)", borderRadius:3, padding:"2px 6px" }}>monitorar</div>
                    </div>
                    <div style={{ fontSize:9, color:t.textMuted, lineHeight:1.45, marginTop:6 }}>{area.focus}</div>
                    <div style={{ fontSize:8, color:t.textFaint, marginTop:7 }}>{area.lat.toFixed(2)}°, {area.lon.toFixed(2)}° · INPE/EFFIS quando integrado</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Focos INPE */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>FOCOS INPE — RS (últimas 48h)</div>
              {qLoading ? (
                <div style={{ textAlign:"center", padding:30, color:"#f97316", fontSize:12 }}>🔥 Consultando INPE...</div>
              ) : queimadas ? (
                <div>
                  <div style={{ fontSize:22, fontWeight:700, color:"#f97316", marginBottom:4 }}>
                    {Array.isArray(queimadas)?queimadas.length:queimadas?.count ?? "–"} focos
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted }}>
                    detectados no RS nas últimas 48h · INPE BDQueimadas
                    {queimadas?.latest ? ` · último foco: ${formatDateTimeBR(queimadas.latest)}` : ""}
                  </div>
                  {queimadas?.files && (
                    <div style={{ marginTop:8, fontSize:8, color:t.textFaint }}>
                      Fonte consultada via Supabase: CSV diário INPE/Dados Abertos · arquivos OK: {queimadas.files.filter(f=>f.ok).length}/{queimadas.files.length}
                    </div>
                  )}
                  {/* Nota sobre probabilidades queimadas */}
                  <div style={{ marginTop:10, padding:"8px 12px", background: dark?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.25)", borderRadius:4, fontSize:9, color:dark?"#fdba74":"#c2410c" }}>
                    ℹ️ <strong>EFFIS nesta versão:</strong> integração complementar ainda não operacional. O alerta de queimadas só considera foco real retornado pelo INPE ou outro endpoint validado, com fonte e horário.
                  </div>
                  {(Array.isArray(queimadas) ? queimadas : queimadas?.records)?.length > 0 && (
                    <div style={{ marginTop:10, display:"grid", gap:5, maxHeight:200, overflowY:"auto" }}>
                      {(Array.isArray(queimadas) ? queimadas : queimadas.records).slice(0,10).map((f,i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 8px", background: dark?"rgba(0,0,0,0.3)":t.bg, borderRadius:3, fontSize:9, color:t.textMuted }}>
                          <span>🔥 {f.municipio||f.properties?.municipio||"RS"}</span>
                          <span>{f.datahora||f.properties?.datahora||"–"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {queimadas?.ok && queimadas?.count === 0 && (
                    <div style={{ marginTop:10, padding:"8px 12px", background: dark?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.22)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                      Consulta operacional OK. Nenhum foco detectado no RS no período consultado.
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:11, color:t.textMuted, marginBottom:8 }}>
                    API INPE BDQueimadas indisponível no momento. Sem dado operacional de focos nas últimas 48h. Verifique junto ao INPE BDQueimadas.
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                    <div style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:3 }}>
                      <div style={{ fontSize:8, color:t.textMuted }}>Fonte primária</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#eab308" }}>indisponível</div>
                    </div>
                    <div style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:3 }}>
                      <div style={{ fontSize:8, color:t.textMuted }}>Uso operacional</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#eab308" }}>não aciona alerta</div>
                    </div>
                  </div>
                  <div style={{ marginTop:10, padding:"8px 12px", background: dark?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.04)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                    ℹ️ EFFIS não está conectado em tempo real nesta versão. Não usar camada complementar como alerta operacional até existir endpoint validado.
                  </div>
                  <button onClick={loadQueimadas} style={{ marginTop:10, background: dark?"rgba(249,115,22,0.1)":"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.4)", color:"#fdba74", padding:"7px 14px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:10 }}>
                    ↻ Tentar novamente
                  </button>
                </div>
              )}
            </div>

            {/* APAs */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>UNIDADES DE CONSERVACAO - RS</div>
              <div style={{ fontSize:9, color: dark?"#eab308":"#a16207", marginBottom:12, padding:"6px 10px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.2)", borderRadius:4 }}>
                Cadastro oficial CNUC/MMA conectado. E camada complementar de contexto; risco por UC em tempo real ainda exige cruzar foco INPE com geocerca/poligono validado.
              </div>
              <div style={{ display:"grid", gap:7 }}>
                {(icmbioUcs?.ok ? icmbioUcs.records : APAS_RS).map((apa)=>(
                  <div key={apa.id || apa.name} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"center", padding:"9px 12px", background: dark?"rgba(0,0,0,0.2)":t.bg, border:`1px solid ${t.border}`, borderRadius:4 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:t.text }}>{apa.name}</div>
                      <div style={{ fontSize:9, color:t.textMuted }}>{apa.municipio || apa.municipios || apa.categoria}</div>
                    </div>
                    <div style={{ fontSize:9, color:t.textFaint }}>{apa.area_ha ? `${Math.round(apa.area_ha).toLocaleString("pt-BR")} ha` : apa.lat ? `${apa.lat.toFixed(2)}S` : "CNUC"}</div>
                    <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${icmbioUcs?.ok ? "#22c55e66" : t.textFaint}`, color:icmbioUcs?.ok ? "#22c55e" : t.textMuted, borderRadius:3 }}>{icmbioUcs?.ok ? "oficial" : "sem dado"}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, padding:"9px 11px", background: dark?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.04)", border:"1px solid rgba(249,115,22,0.15)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                {icmbioUcs?.ok ? `Fonte: MMA/ICMBio CNUC via CKAN Dados Abertos - ${icmbioUcs.total_rs} UCs no RS - exibindo ${icmbioUcs.count} prioritarias.` : "Cadastro local exibido porque a fonte CNUC/MMA nao respondeu agora."}
              </div>
            </div>
            {/* EFFIS */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>COPERNICUS EFFIS — INTEGRAÇÃO COMPLEMENTAR</div>
              <div style={{ fontSize:9, color: dark?"#fef08a":"#854d0e", marginBottom:10, padding:"5px 10px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.2)", borderRadius:4 }}>
                🗓 EFFIS não está conectado em tempo real nesta versão. Não aciona alerta operacional.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                {[
                  { l:"Fire Danger Forecast",  v:"1 a 10 dias", c:"#f97316", d:"Perigo meteorológico de fogo. É previsão de condição favorável, não confirmação de incêndio." },
                  { l:"Active Fires",  v:"MODIS/VIIRS", c:"#eab308", d:"Focos ativos detectados por satélite. Pode complementar o INPE após endpoint validado." },
                  { l:"Burnt Areas",    v:"Área queimada", c:"#22c55e", d:"Perímetros/áreas queimadas para análise pós-evento." },
                  { l:"Data request",       v:"Sob demanda", c:"#8b5cf6", d:"Produtos históricos ou brutos podem exigir solicitação específica ao EFFIS." },
                ].map(item=>(
                  <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"10px 12px", borderRadius:4, borderTop:`3px solid ${item.c}` }}>
                    <div style={{ fontSize:9, color:t.textMuted, marginBottom:4 }}>{item.l}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:item.c, marginBottom:3 }}>{item.v}</div>
                    <div style={{ fontSize:8, color:t.textFaint }}>{item.d}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:8, color:t.textFaint, marginTop:8 }}>
                Copernicus EFFIS — European Forest Fire Information System · Referência estrutural · Para dados em tempo real: <a href="https://effis.jrc.ec.europa.eu/" target="_blank" rel="noreferrer" style={{ color:t.accent }}>effis.jrc.ec.europa.eu</a>
              </div>
            </div>
          </div>
        )}

        {/* ══ ALERTAS ══ */}
        {!loading && activeTab==="alertas" && (
          <div>
            <div style={{ marginBottom:12, padding:"10px 14px", background: dark?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:5, fontSize:10, color: dark?"#fdba74":"#c2410c" }}>
              🌡️ <strong>ENSO — contexto climático:</strong> {ensoObservedAvailable ? `${ensoClass.label} · Niño 3.4 ${formatSignedCelsius(activeENSO.nino34)}.` : "leitura NOAA/CPC indisponível."} {ensoDominantProb ? `${ensoDominantProb.label}: ${formatProbability(ensoDominantProb.value)} (IRI/CCSR).` : "Probabilidade IRI/CCSR indisponível."} ENSO é contexto climático e não aciona alerta local sozinho.
            </div>
            {alerts.length===0 ? (
              <div style={{ textAlign:"center", padding:50, border:"1px solid rgba(34,197,94,0.3)", borderRadius:5, background:"rgba(34,197,94,0.05)" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>✓</div>
                <div style={{ fontSize:13, color:"#22c55e", letterSpacing:2 }}>NENHUM ALERTA ATIVO</div>
                <div style={{ fontSize:10, color:t.textMuted, marginTop:5 }}>Sem alertas operacionais severos. Condições de atenção podem aparecer no Dashboard.</div>
              </div>
            ) : (
              <div style={{ display:"grid", gap:8 }}>
                {[...alerts].sort((a,b)=>["CRITICO","EMERGENCIA","ALERTA","ATENCAO","NORMAL"].indexOf(a.risk_level)-["CRITICO","EMERGENCIA","ALERTA","ATENCAO","NORMAL"].indexOf(b.risk_level)).map((alert,i)=>{
                  const r=RISK_LEVELS[alert.risk_level];
                  const rColor=getRiskColor(alert.risk_level);
                  const rBg=getRiskBg(alert.risk_level);
                  return (
                    <div
                      key={i}
                      onClick={() => alert.explain && setRiskExplain(alert.explain)}
                      title={alert.explain ? "Clique para ver os parâmetros deste alerta" : "Alerta oficial ou externo"}
                      style={{ padding:"12px 14px", background:rBg, border:`1px solid ${rColor}55`, borderLeft:`4px solid ${rColor}`, borderRadius:5, cursor:alert.explain?"pointer":"default" }}
                    >
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:rColor }}>{r.icon} {r.label.toUpperCase()} — {alert.station}</div>
                        <div style={{ fontSize:9, color:t.textMuted }}>detectado {new Date(alert.at).toLocaleString("pt-BR")}</div>
                      </div>
                      <div style={{ fontSize:11, color:t.textMuted }}>{alert.message}</div>
                      {alert.explain && (
                        <div style={{ marginTop:6, fontSize:8, color:t.accent, textAlign:"right", opacity:0.75 }}>ver parâmetros →</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Canais */}
            <div style={{ marginTop:16, ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:10 }}>CANAIS DE NOTIFICAÇÃO</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:8 }}>
                {notificationCards.map(c=>(
                  <div key={c.n} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, borderRadius:4, border:`1px solid ${t.border}`, overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px" }}>
                      <span style={{ fontSize:18 }}>{c.i}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, color:t.text }}>{c.n}</div>
                        <div style={{ fontSize:9, color:c.status.ok ? c.status.color : c.status.color }}>{c.status.label} · {c.s}</div>
                      </div>
                      {c.h && <button onClick={()=>setExpanded(expanded===c.n?null:c.n)} style={{ background:"none", border:`1px solid ${t.accent}44`, color:t.accent, cursor:"pointer", fontSize:8, padding:"2px 6px", borderRadius:3, fontFamily:"inherit" }}>{expanded===c.n?"▲":"▼"}</button>}
                    </div>
                    {c.h && expanded===c.n && <div style={{ padding:"8px 11px", borderTop:`1px solid ${t.border}`, fontSize:9, color:t.textMuted, lineHeight:1.7, whiteSpace:"pre-line" }}>{c.h}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ FONTES DE DADOS ══ */}
        {activeTab==="apis" && (
          <div style={{ display:"grid", gap:12 }}>

            <div style={{ ...s.card, border:"1px solid rgba(34,211,238,0.35)" }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:8 }}>POLÍTICA OPERACIONAL — FONTE REAL E FALLBACK</div>
              <div style={{ display:"grid", gap:6, fontSize:10, color:t.textMuted, lineHeight:1.55 }}>
                <div><strong style={{ color:t.text }}>O Sentinela·RS utiliza fontes reais ativas e indicadores derivados identificados.</strong> Alertas operacionais dependem de fontes oficiais, dados observados e regras explícitas. Camadas climáticas, satelitais, históricas e complementares não disparam alerta automático sozinhas.</div>
                <div>✅ Dado operacional só é exibido como atual quando vem de endpoint real ativo, com fonte e horário.</div>
                <div>⚠️ Fallback só é permitido quando já existe endpoint real configurado e a fonte primária falha.</div>
                <div>📌 Quando fallback aparecer, o card deve informar que é última leitura válida salva e orientar verificação junto ao órgão responsável.</div>
                <div>🚫 Fallback vencido, CSV manual, referência histórica e dado complementar não disparam novo alerta automático.</div>
              </div>
            </div>

            {/* BLOCO D — Saúde das fontes em tempo real */}
            <div style={{ ...s.card, border:`1px solid ${t.borderActive}` }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:10 }}>SAÚDE DAS FONTES — ÚLTIMA VERIFICAÇÃO</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
                {[
                  "Open-Meteo","INMET","CEMADEN","RADAR Lagoa","HidroSens","Defesa Civil RS",
                  "NOAA/CPC ENSO","IRI/CCSR ENSO","CPTEC/INPE","INPE BDQueimadas","Copernicus Water","Copernicus Sentinel-1","Copernicus NDVI","Copernicus EMS","ANA HidroWeb",
                ].map(name => {
                  const h = getValidatedSourceHealth(name);
                  const ok   = h?.ok;
                  const never = !h;
                  const anaComplementar = name === "ANA HidroWeb" && (!h || !ok);
                  const color = never ? (anaComplementar ? "#eab308" : "#64748b") : anaComplementar ? "#eab308" : ok ? "#22c55e" : "#ef4444";
                  const label = anaComplementar ? "Configurar/sem leitura" : never ? "Carregando" : ok ? "OK" : "Falhou";
                  return (
                    <div key={name} style={{ padding:"9px 12px", background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:5, border:`1px solid ${color}33`, borderLeft:`3px solid ${color}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:10, fontWeight:600, color:t.text }}>{name}</span>
                        <span style={{ fontSize:8, fontWeight:700, color }}>{label}</span>
                      </div>
                      {h && (
                        <>
                          <div style={{ fontSize:8, color:t.textMuted }}>Latência: {typeof h.latencyMs === "number" ? h.latencyMs + "ms" : "OK"}</div>
                          {h.lastOk && <div style={{ fontSize:8, color:t.textFaint }}>Último OK: {formatDateTimeBR(h.lastOk)}</div>}
                          {h.error && !ok && (
                            <div style={{ fontSize:8, color:anaComplementar ? "#eab308" : "#ef4444", marginTop:2 }}>
                              {anaComplementar ? "sem leitura operacional validada da ANA" : h.error}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:8, fontSize:8, color:t.textFaint }}>
                Atualizado junto com os dados de cada fonte. Latência medida no navegador. Fontes complementares ou sem leitura validada não reprovam o SITREP operacional.
              </div>
            </div>

            {/* Detalhes estáticos por fonte */}
            <div style={{ display:"grid", gap:8 }}>
            {[
              { n:"Open-Meteo",               st:"ATIVO",     c:"#22c55e", d:"Previsão meteorológica 14 dias — temperatura, precipitação, vento. Atualização automática.", a:"Gratuita, sem chave", h:null },
              (() => {
                const hAna = getValidatedSourceHealth("ANA HidroWeb");
                const anaOk = Boolean(hAna?.ok);
                return {
                  n:"ANA HidroWeb (Telemetria)",
                  st: anaOk ? "ATIVO" : "AGUARDANDO CONFIGURACAO",
                  c: anaOk ? "#22c55e" : "#eab308",
                  d:"API oficial Hidro Webservice REST da ANA para série telemétrica adotada de nível, chuva e vazão. Uso complementar quando houver estação validada; não aciona alerta automático sozinho.",
                  a:"Requer secrets ANA_HIDROWEB_IDENTIFICADOR e ANA_HIDROWEB_SENHA no Supabase",
                  h:"Endpoint: ana-rs. A função autentica no Hidro Webservice, consulta HidroinfoanaSerieTelemetricaAdotada e considera operacional apenas leitura real com horário, fonte e menos de 24h."
                };
              })(),
              { n:"NOAA/CPC + IRI — ENSO",   st:"ATIVO",  c:"#22c55e", d:"ENSO: Niño 3.4, ONI e cenário probabilístico dominante. Índices observados e probabilidades atualizados via Edge Functions.", a:"Dados públicos, atualização mensal", h:"1. iri.columbia.edu/our-expertise/climate/forecasts/enso/current/\n2. Atualizar valores activeENSO.nino34, oni3m, prob e forecast no código\n3. Publicação NOAA/IRI: primeira semana de cada mês" },
              { n:"INPE BDQueimadas",          st:"ATIVO",     c:"#22c55e", d:"Focos de fogo ativo no RS via dados abertos CSV do INPE. Consulta últimos 2 dias, filtra RS no Supabase e aceita retorno vazio como operação normal.", a:"Sem chave", h:"Endpoint: inpe-queimadas-rs. Fonte pública: dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil. Vazio significa sem foco no período, não falha." },
              { n:"Copernicus Water / Sentinel-2", st:"ATIVO", c:"#22c55e", d:"Indicador real de água superficial por Sentinel-2 L2A/NDWI para a Lagoa dos Patos. Contexto hidrológico por satélite; não aciona alerta sozinho.", a:"Copernicus Data Space / Sentinel Hub", h:"Endpoint: copernicus-water. Produto óptico: depende de baixa nebulosidade. Usar como contexto junto com Defesa Civil, CEMADEN, RADAR Lagoa e HidroSens." },
              { n:"Copernicus Sentinel-1 SAR", st:"ATIVO", c:"#22c55e", d:"Indicador real SAR de água/alagamento sob nuvens/noite. Contexto remoto por radar; não é alerta oficial nem máscara validada de inundação.", a:"Copernicus Data Space / Sentinel Hub", h:"Endpoint: copernicus-sentinel1-water. Método: Sentinel-1 GRD IW/DV. Pode falhar em áreas urbanas, vegetação inundada, vento forte sobre água e sombras de relevo. Confirmar com órgãos responsáveis." },
              { n:"Copernicus NDVI / Vegetação", st:"ATIVO", c:"#22c55e", d:"Indicador real de vegetação/estiagem por Sentinel-2 L2A/NDVI. Contexto ambiental; não aciona alerta sozinho.", a:"Copernicus Data Space / Sentinel Hub", h:"Endpoint: copernicus-ndvi. Produto óptico: depende de baixa nebulosidade. Usar como contexto, não como alerta automático." },
              { n:"INMET",                     st:"ATIVO",     c:"#22c55e", d:"Previsão oficial por município via proxy Supabase da API apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Complementa a previsão 14 dias; se falhar, verificar junto ao INMET.", a:"API pública, sem chave", h:"Endpoint validado: https://apiprevmet3.inmet.gov.br/previsao/4315602" },
              { n:"CPTEC/INPE",                st:"ATIVO", c:"#22c55e", d:"Produtos sazonais/subsazonais oficiais por imagem via Edge Function. Uso: contexto climático, não alerta local imediato.", a:"API pública via Supabase Edge Function", h:"Endpoint: cptec-inpe-produtos. Produtos gráficos oficiais sazonais/subsazonais. Não são série numérica JSON e não disparam alerta local sozinhos." },
              { n:"Defesa Civil RS",           st:"ATIVO",     c:"#22c55e", d:"Avisos oficiais via RSS da Defesa Civil do Rio Grande do Sul, consumidos por Supabase Edge Function para evitar bloqueio CORS.", a:"RSS oficial via proxy", h:"Endpoint ativo: https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs" },
              { n:"CEMADEN",                   st:"ATIVO",     c:"#22c55e", d:"Chuva observada por acumulados recentes das PCDs CEMADEN. Fonte obrigatória: DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC.", a:"Token PED via Supabase Secret", h:"Endpoint: cemaden-rs. Cache: 10 min. Limite PED para usuário externo: até 12 requisições/minuto." },
              { n:"RADAR Lagoa dos Patos",     st:"ATIVO",     c:"#22c55e", d:"Sensores RADAR em 5 pontos da Lagoa (Itapuã, Arambaré, São Lourenço, São José do Norte, Rio Grande).", a:"API pública via proxy Supabase", h:"Endpoint: lagoa-patos-radar. Fallback local só entra após falha da fonte primária real, exibido como última leitura salva, com orientação de verificar junto à Rede RADAR Lagoa dos Patos. Fallback vencido não dispara novo alerta automático." },
              { n:"HidroSens / UFPel",         st:"ATIVO",     c:"#22c55e", d:"Sensor ultrassônico em Laranjal (Pelotas). Limiares: ALERTA 1,20m · CRÍTICO 1,40m · máx mai/2024: 2,40m.", a:"ThingsBoard público via Supabase", h:"Endpoint: hidrosens-laranjal. Altura do sensor: 5,06m. Fallback local só entra após falha da fonte primária real, exibido como última leitura salva, com orientação de verificar junto ao HidroSens/UFPel. Fallback vencido não dispara novo alerta automático." },
              { n:"Copernicus Emergency / Produtos avançados", st:copernicusEms?.ok ? "ATIVO" : "AGUARDANDO DEPLOY", c:copernicusEms?.ok ? "#22c55e" : "#eab308", d:"Copernicus EMS por API pública: Rapid Mapping EMSR720 e Risk and Recovery EMSN194 para o RS 2024, além de ativações recentes de Flood/Brazil. Camada oficial pós-evento; não aciona alerta automático sozinha.", a:"API pública CEMS / ArcGIS REST layers", h:null },
            ].map(api=>(
              <div key={api.n} style={{ background:t.cardBg, border:`1px solid ${t.border}`, borderRadius:5, overflow:"hidden", boxShadow:t.shadowCard }}>
                <div style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:11 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:t.text }}>{api.n}</div>
                      {/* badge de saúde ao vivo */}
                      {sourceHealth[api.n] !== undefined && (
                        <span style={{ fontSize:7, padding:"1px 5px", borderRadius:3, border:`1px solid ${sourceHealth[api.n].ok?"#22c55e":"#ef4444"}`, color:sourceHealth[api.n].ok?"#22c55e":"#ef4444" }}>
                          {sourceHealth[api.n].ok ? "● LIVE OK" : "○ FALHOU"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:t.textMuted, marginBottom:3 }}>{api.d}</div>
                    <div style={{ fontSize:9, color:t.textFaint }}>🔑 {api.a}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                    <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${api.c}`, color:api.c, borderRadius:3, letterSpacing:2 }}>{api.st}</div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {riskExplain && (
          <div
            onClick={()=>setRiskExplain(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          >
            <div
              onClick={(e)=>e.stopPropagation()}
              style={{ width:"min(520px, 100%)", background:dark?"#0f172a":"#ffffff", border:`1px solid ${t.borderActive}`, borderRadius:8, boxShadow:"0 20px 60px rgba(0,0,0,0.35)", padding:16 }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>EXPLICAÇÃO DO STATUS</div>
                  <div style={{ fontSize:17, fontWeight:900, color:t.text, marginTop:3 }}>{riskExplain.title}</div>
                </div>
                <button onClick={()=>setRiskExplain(null)} style={{ background:"none", border:`1px solid ${t.border}`, color:t.textMuted, borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:11, padding:"4px 8px" }}>fechar</button>
              </div>

              <div style={{ display:"grid", gap:7, marginTop:8 }}>
                {riskExplain.lines?.map((line, i)=>(
                  <div key={i} style={{ fontSize:10, color:t.textMuted, lineHeight:1.5, padding:"7px 9px", background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:4 }}>
                    {line}
                  </div>
                ))}
              </div>

              {riskExplain.note && (
                <div style={{ marginTop:10, padding:"8px 10px", background:dark?"rgba(34,211,238,0.07)":"rgba(8,145,178,0.06)", border:"1px solid rgba(34,211,238,0.25)", borderRadius:4, fontSize:9, color:t.textMuted, lineHeight:1.55 }}>
                  {riskExplain.note}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop:28, borderTop:`1px solid ${t.border}`, paddingTop:12, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
          <div style={{ fontSize:9, color:t.textFaint }}>SENTINELA·RS v2.2 · Open-Meteo + INMET + CEMADEN + Lagoa RADAR + HidroSens + ANA complementar/aguardando API + NOAA ENSO + INPE + Copernicus · Fonte CEMADEN: {CEMADEN_ATTRIBUTION}</div>
          <div style={{ fontSize:9, color:t.textFaint }}>Atualização: 30 min · PWA · github.com/cobradeca/sentinela-rs</div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
      `}</style>
    </div>
  );
}
