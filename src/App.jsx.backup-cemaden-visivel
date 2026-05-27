import { useState, useEffect, useCallback, useRef } from "react";

// ─── BLOCO C: frescor do dado ─────────────────────────────────────────────────
function dataStaleness(measuredAt) {
  if (!measuredAt) return "unknown";
  const ageMin = (Date.now() - new Date(measuredAt).getTime()) / 60000;
  if (ageMin <= 90)  return "fresh";
  if (ageMin <= 180) return "attention";
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
  { id: "lagoa_patos_poa",      name: "Itapuã",                   displayName: "Lagoa dos Patos — Itapuã",              lat: -30.36, lon: -51.03, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 1 },
  { id: "lagoa_patos_arambare", name: "Arambaré",                 displayName: "Lagoa dos Patos — Arambaré",            lat: -30.91, lon: -51.50, type: "lagoa", anaCode: "87540000", sourceHint: "RADAR", ordemEscoamento: 2 },
  { id: "lagoa_sao_lourenco",   name: "São Lourenço do Sul",      displayName: "Lagoa dos Patos — São Lourenço do Sul", lat: -31.36, lon: -51.98, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 3 },
  { id: "lagoa_patos_pelotas",  name: "Pelotas / Laranjal",       displayName: "Lagoa dos Patos — Pelotas / Laranjal",  lat: -31.77, lon: -52.34, type: "lagoa", anaCode: "87955000", sourceHint: "HIDROSENS", ordemEscoamento: 4 },
  { id: "lagoa_sao_jose_norte", name: "São José do Norte",        displayName: "Lagoa dos Patos — São José do Norte",   lat: -32.02, lon: -52.04, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 5 },
  { id: "lagoa_rio_grande",     name: "Rio Grande / FURG CCMAR",  displayName: "Lagoa dos Patos — Rio Grande / Barra",  lat: -32.03, lon: -52.10, type: "lagoa", anaCode: "87980000", sourceHint: "RADAR", ordemEscoamento: 6 },
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
const CEMADEN_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cemaden-rs";
const CEMADEN_ATTRIBUTION = "DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC";
const ANA_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/ana-rs";
const LAGOA_RADAR_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/lagoa-patos-radar";
const HIDROSENS_LARANJAL_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/hidrosens-laranjal";
const NOAA_ENSO_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/noaa-enso";
const IRI_ENSO_PROB_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/iri-enso-probabilidades";
const CPTEC_INPE_PRODUCTS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cptec-inpe-produtos";

// ENSO — dados reais NOAA/IRI mai 2026
// ⚠ Estes valores são ATIVO PARCIALS — publicados pelo NOAA/IRI em mai/2026.
// Para atualização automática, integrar: https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/
const ENSO = {
  nino34: +0.9,
  oni3m: +0.47,
  phase: "EL_NINO_DEVELOPING",
  referenceDate: "mai 2026",            // data de publicação NOAA/IRI
  referenceSource: "NOAA/CPC + IRI/CCSR — Atualização mensal",
  prob: { elNino: 0.98, neutral: 0.02, laNina: 0.00 },
  superThreshold: 1.5,
  forecast: [
    { p:"Mai–Jul 2026", en:0.98, nu:0.02, ln:0.00 },
    { p:"Jun–Ago 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Jul–Set 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Ago–Out 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Set–Nov 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Out–Dez 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Nov–Jan 2027", en:0.96, nu:0.04, ln:0.00 },
    { p:"Dez–Fev 2027", en:0.96, nu:0.04, ln:0.00 },
  ],
  historical: [
    { y:"1982–83", peak:+2.2, cat:"Super El Niño",    rs:"Enchentes severas no RS" },
    { y:"1997–98", peak:+2.4, cat:"Super El Niño",    rs:"Enchentes históricas" },
    { y:"2009–10", peak:+1.6, cat:"El Niño Forte",    rs:"Chuvas acima da média" },
    { y:"2015–16", peak:+2.3, cat:"Super El Niño",    rs:"Chuvas extremas RS" },
    { y:"2023–24", peak:+2.0, cat:"El Niño Forte",    rs:"Enchente mai 2024 — maior desastre RS" },
    { y:"2026–??", peak:null, cat:"El Niño Emergindo", rs:"EM DESENVOLVIMENTO — RISCO ALTO" },
  ],
};

// Copernicus — indicadores de referência (dados históricos/publicados, NÃO tempo real)
// Cada indicator está marcado com a data de referência da publicação.
const COPERNICUS_DATA = {
  lastUpdate: "mai 2026",
  referenceNote: "Indicadores abaixo são dados de referência publicados — não atualizados em tempo real.",
  themes: [
    { id:"enchentes",   icon:"🌊", name:"Enchentes / Inundações",     status:"CRITICO",  color:"#ef4444", rsHistory:"Maio 2024: 2,4 milhões afetados, 478 municípios, 154 mortes. Maior desastre climático gaúcho.", current:"El Niño emergindo (+0,9°C) eleva risco de recorrência em 2026/27.", copSource:"Copernicus EMS — EMSR728 (RS 2024)", indicator:"Área inundada 2024: ~540 km² · Fonte: Copernicus EMS EMSR728", indicatorIsRealtime: false },
    { id:"queimadas",   icon:"🔥", name:"Queimadas / Incêndios",      status:"ALERTA",   color:"#f97316", rsHistory:"2022: recorde de focos no RS (3.200+ focos INPE). Pampa e Serra Gaúcha mais afetados.", current:"El Niño aumenta risco de seca e queimadas no verão 2026/27.", copSource:"Copernicus EFFIS + INPE BDQueimadas", indicator:"Focos consultados em tempo real via INPE BDQueimadas (aba Queimadas)", indicatorIsRealtime: true },
    { id:"desmatamento",icon:"🌳", name:"Desmatamento / Vegetação",   status:"ATENCAO",  color:"#eab308", rsHistory:"Pampa: bioma com maior taxa de perda no BR. Mata Atlântica RS: <12% da cobertura original.", current:"Sentinel-2 monitora NDVI mensal. Alertas automáticos de supressão.", copSource:"Copernicus Land — Sentinel-2 MSI", indicator:"NDVI RS médio: 0.48 · Referência: MapBiomas RS 2024", indicatorIsRealtime: false },
    { id:"clima",       icon:"🌡️", name:"Clima / Temperatura",       status:"ALERTA",   color:"#f97316", rsHistory:"RS registrou +1,8°C acima da média no verão 2023/24. Ondas de calor mais frequentes.", current:"Anomalia TSM Atlântico Sul: +0,6°C. El Niño potencializa aquecimento.", copSource:"Copernicus C3S — ERA5 Reanalysis", indicator:"Anomalia +0,4°C acima da média · Ref: ERA5 mai/2026", indicatorIsRealtime: false },
    { id:"oceanos",     icon:"🌊", name:"Oceanos / Nível do Mar",    status:"ATENCAO",  color:"#eab308", rsHistory:"Nível médio em Rio Grande subiu ~3,2mm/ano (1993–2023). Surtos de maré associados a El Niño.", current:"Maré meteorológica + El Niño = risco costeiro elevado.", copSource:"Copernicus Marine — CMEMS", indicator:"Anomalia +12cm vs 1993-2023 · Ref: CMEMS Altimetry 2023", indicatorIsRealtime: false },
    { id:"poluicao",    icon:"💨", name:"Poluição / Qualidade do Ar", status:"ATENCAO",  color:"#eab308", rsHistory:"POA: episódios de qualidade do ar ruim por queimadas (2020, 2022).", current:"Sentinel-5P TROPOMI monitora NO₂, CO, aerossóis diariamente.", copSource:"Copernicus Atmosphere — CAMS + Sentinel-5P", indicator:"IQA POA: ref. histórica — integrar QUALAR/IBAMA para dado em tempo real", indicatorIsRealtime: false },
    { id:"uso_solo",    icon:"🗺️", name:"Uso do Solo",               status:"NORMAL",   color:"#22c55e", rsHistory:"RS: 60% agropecuária, 12% vegetação nativa, 28% outros. Expansão da soja pressiona Pampa.", current:"Mapeamento anual via Sentinel-2 + MapBiomas RS.", copSource:"Copernicus Land — CORINE adapted + MapBiomas", indicator:"Área agrícola RS 2025: 14,8 milhões ha · Fonte: MapBiomas 2025", indicatorIsRealtime: false },
    { id:"seca",        icon:"🏜️", name:"Seca / Estiagem",          status:"ATENCAO",  color:"#eab308", rsHistory:"2021/22: pior seca em 91 anos no RS. Prejuízo de R$ 19 bilhões.", current:"Índice SPI-3: -0,4 (próximo da normalidade). El Niño deve aumentar chuvas no RS.", copSource:"Copernicus Emergency — EDO (European Drought Observatory)", indicator:"SPI-3 RS: -0,4 · Ref: EDO mai/2026 — integrar SPI dinâmico via CHIRPS para atualização", indicatorIsRealtime: false },
  ],
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function getRiskLevel(precipAccum, tempMin, windMax, lagoaLevel = null) {
  let score = 0;
  if (precipAccum > 150) score += 4; else if (precipAccum > 80) score += 3;
  else if (precipAccum > 40) score += 2; else if (precipAccum > 20) score += 1;
  if (tempMin < 0) score += 3; else if (tempMin < 5) score += 2; else if (tempMin < 10) score += 1;
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
  if (a === null) return { label:"Emergindo",       color:"#8b5cf6", icon:"📈" };
  if (a >= 2.0)   return { label:"Super El Niño",   color:"#dc2626", icon:"🔴" };
  if (a >= 1.5)   return { label:"El Niño Forte",   color:"#ef4444", icon:"🟠" };
  if (a >= 0.5)   return { label:"El Niño",         color:"#f97316", icon:"🟡" };
  if (a > -0.5)   return { label:"Neutro",          color:"#22c55e", icon:"🟢" };
  if (a > -1.5)   return { label:"La Niña",         color:"#3b82f6", icon:"🔵" };
  if (a > -2.0)   return { label:"La Niña Forte",   color:"#1d4ed8", icon:"🟣" };
  return           { label:"Super La Niña",         color:"#1e3a8a", icon:"⚫" };
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
  const res = await fetch(url);
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
    const res = await fetch(HIDROSENS_LARANJAL_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return cached || null;

    const data = await res.json();
    if (!data?.ok || typeof data.level_m !== "number") return cached || null;

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
      threshold_m: data.threshold_m ?? 1.20,
      threshold_cm: data.threshold_cm ?? 120,
      critical_threshold_m: data.critical_threshold_m ?? 1.40,
      critical_threshold_cm: data.critical_threshold_cm ?? 140,
      max_may_2024_m: data.max_may_2024_m ?? 2.40,
      max_may_2024_cm: data.max_may_2024_cm ?? 240,
      status: data.status || (data.level_m >= 1.40 ? "ALERTA" : data.level_m >= 1.20 ? "ATENCAO" : "NORMAL"),
      note: data.note,
    };

    saveFallbackCache(HIDROSENS_LARANJAL_CACHE_KEY, live);
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
    const url = "https://queimadas.dgi.inpe.br/api/focos/?pais_id=33&estado_id=43&quantidade=100";
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}



// CEMADEN — chuva observada por acumulados recentes.
// O token fica no Supabase Secret CEMADEN_PED_TOKEN, nunca no App.jsx.
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
    const res = await fetch(`${INMET_FORECAST_BASE_URL}/${ibgeCode}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const raw = await res.json();
    return normalizeInmetForecast(raw, ibgeCode);
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

  if (text.includes("RISCO MUITO ALTO") || text.includes("CRÍTICO") || text.includes("CRITICO")) {
    return "CRITICO";
  }

  if (text.includes("ALERTA") || text.includes("RISCO ALTO")) {
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

const wmoDesc  = (c) => c<=3?"Céu claro":c<=9?"Neblina":c<=29?"Chuva":c<=39?"Neve":c<=59?"Garoa":c<=79?"Neve intensa":c<=84?"Pancadas":c<=94?"Tempestade":"Tempestade severa";
const wmoEmoji = (c) => c<=3?"☀️":c<=9?"🌫️":c<=29?"🌧️":c<=39?"❄️":c<=59?"🌧️":c<=79?"❄️":c<=84?"⛈️":"🌪️";

// ─── PUSH ────────────────────────────────────────────────────────────────────
function PushButton({ dark }) {
  const [state, setState] = useState("idle");
  const [msg, setMsg] = useState("");
  async function subscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setMsg("Não suportado"); setState("error"); return; }
    setState("requesting");
    try {
      const reg = await navigator.serviceWorker.register("/sentinela-rs/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setMsg("Negado"); setState("error"); return; }
      const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!VAPID) { setMsg("VAPID ausente"); setState("error"); return; }
      const pad = "=".repeat((4 - VAPID.length % 4) % 4);
      const key = Uint8Array.from([...atob((VAPID + pad).replace(/-/g,"+").replace(/_/g,"/"))].map(c=>c.charCodeAt(0)));
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      setState("subscribed"); setMsg("Ativo!");
    } catch(e) { setMsg(e.message.slice(0,25)); setState("error"); }
  }
  const c = { idle:"#22d3ee", requesting:"#eab308", subscribed:"#22c55e", error:"#ef4444" };
  return (
    <button onClick={subscribe} disabled={state==="subscribed"||state==="requesting"}
      style={{ padding:"6px 12px", borderRadius:4, fontFamily:"inherit", fontSize:10, cursor:"pointer",
        background: dark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.6)",
        border:`1px solid ${c[state]}44`, color:c[state] }}>
      {state==="idle"&&"🔔 Push"}{state==="requesting"&&"⏳..."}{state==="subscribed"&&`✓ ${msg}`}{state==="error"&&`✗ ${msg}`}
    </button>
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
  const [qLoading, setQLoading]         = useState(false);
  const [expanded, setExpanded]         = useState(null);
  const [dark, setDark]                 = useState(true);
  const [ensoLive, setEnsoLive]         = useState(null);
  const [ensoProbLive, setEnsoProbLive]     = useState(null);
  const [cptecProducts, setCptecProducts]   = useState(null);
  const [expandedCard, setExpandedCard] = useState(null); // para detalhe do card
  // BLOCO D — saúde das fontes
  const [sourceHealth, setSourceHealth] = useState({});
  const sourceHealthRef = useRef({});

  // Cores dinâmicas por tema
  const t = dark ? {
    bg: "#070b12",
    surface: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)",
    borderActive: "rgba(34,211,238,0.5)",
    text: "#e2e8f0",
    textMuted: "#64748b",
    textFaint: "#334155",
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
        return typeof fn() === "object" ? {} : null;
      }
    }

    const cemadenByCityId       = await tracked("CEMADEN",    fetchCemadenAccumulations);
    const lagoaRadarByStationId = await tracked("RADAR Lagoa", fetchLagoaRadarLevels);
    const hidrosensLaranjal     = await tracked("HidroSens",  fetchHidroSensLaranjalLevel);

    for (const st of ALL_STATIONS) {
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
        const radarLevel = lagoaRadarByStationId[st.id] || null;
        const hidrosensLevel = st.id === "lagoa_patos_pelotas" ? hidrosensLaranjal : null;
        const inmet = st.ibgeCode ? await (async () => {
          const start = Date.now();
          const r = await fetchInmetForecast(st.ibgeCode);
          if (!health["INMET"]) health["INMET"] = { ok: r !== null, lastOk: r !== null ? new Date().toISOString() : health["INMET"]?.lastOk || null, latencyMs: Date.now()-start, error: r === null ? "sem resposta" : null };
          return r;
        })() : null;
        const cemaden = cemadenByCityId[st.id] || null;
        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
        const tempMin  = Math.min(...(weather.daily?.temperature_2m_min||[20]));
        const windMax  = Math.max(...(weather.daily?.windspeed_10m_max||[0]));

        // Nível real disponível: prioriza RADAR da Lagoa quando houver sensor validado.
        // ANA permanece como fonte complementar/parcial.
        const lagoa = st.type==="lagoa" ? {
          atual: hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel,
          isReal: Boolean(hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel),
          source: hidrosensLevel ? "HIDROSENS" : (radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null)),
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
        const levelRisk = ((lagoa?.radar || lagoa?.hidrosens) && lagoa?.threshold_m && !lagoa?.isFallback) ? radarRiskToLevel(lagoa.levelStatus) : "NORMAL";
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
          newAlerts.push({ id:`${st.id}_${Date.now()}`, station:st.name, risk_level:risk, message:parts.join(" · ")||"Parâmetros acima do normal", at:new Date(), official:false });
        }
      } catch { results[st.id]={ error:true, risk:"NORMAL" }; }
    }
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
    const data = await fetchQueimadas();
    setQueimadas(data);
    setQLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
    const iv = setInterval(loadAllData, 30*60*1000);
    return () => clearInterval(iv);
  }, [loadAllData]);




  useEffect(() => {
    let alive = true;

    async function loadCptecProducts() {
      const data = await fetchCptecInpeProducts();
      if (!alive || !data) return;
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

    async function loadIriProbabilities() {
      const live = await fetchIriEnsoProbabilities();
      if (!alive || !live) return;
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
      const live = await fetchNoaaEnso();
      if (!alive || !live) return;

      // Mantém forecast/probabilidade do objeto estático até a integração IRI específica.
      setEnsoLive({ ...ENSO, ...live, prob: activeENSO.prob, forecast: activeENSO.forecast });
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

  const observedENSO = ensoLive || ENSO;
  const activeENSO = ensoProbLive ? {
    ...observedENSO,
    prob: ensoProbLive.prob || observedENSO.prob,
    forecast: ensoProbLive.forecast || observedENSO.forecast,
    probabilitySource: ensoProbLive.probabilitySource,
    probabilityReferenceDate: ensoProbLive.probabilityReferenceDate,
    probabilityDynamic: true,
    probabilityFetchedAt: ensoProbLive.probabilityFetchedAt,
    probabilityParsing: ensoProbLive.probabilityParsing,
  } : observedENSO;
  const ensoClass = classifyENSO(activeENSO.nino34);
  const selData   = stationData[selStation.id];
  const lagoaSummary = getLagoaSummary(stationData);

  // TABS: previsão agora é 14 dias
  const TABS = [
    { key:"dashboard",  label:"📡 Dashboard" },
    { key:"previsao",   label:"📅 Previsão 14 Dias" },
    { key:"lagoa",      label:"🌊 Lagoa dos Patos" },
    { key:"enso",       label:"🌡️ El Niño / La Niña" },
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
              { l:"Contexto ENSO",v:`${(activeENSO.prob.elNino*100).toFixed(0)}%`, alert:false },
              ...(d.lagoa ? [
                { l:"Nível lagoa", v: d.lagoa.isReal && d.lagoa.atual !== null ? `${d.lagoa.atual.toFixed(2)} m (ANA)` : "– (ANA indisponível)", alert: false },
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
                {ensoClass.icon} El Niño em Desenvolvimento · +{activeENSO.nino34}°C · {(activeENSO.prob.elNino*100).toFixed(0)}% prob.
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

          {/* Banner El Niño */}
          <div style={{ marginTop:10, padding:"9px 14px", background: dark?"rgba(220,38,38,0.08)":"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.3)", borderRadius:4, fontSize:11, color: dark?"#fca5a5":"#b91c1c", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            ⚠️ <strong>EL NIÑO EMERGINDO (98% prob. NOAA/IRI)</strong> — Niño 3.4: +0,9°C. Risco de enchentes e queimadas elevado no RS em 2026/27.
            <button onClick={()=>setActiveTab("enso")} style={{ background:"none", border:"none", color:t.accent, cursor:"pointer", fontSize:11, padding:0, fontFamily:"inherit" }}>Ver análise completa →</button>
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
                      <div style={{ fontSize:12, fontWeight:600, color:t.text }}>{station.name}</div>
                      {station.rioRef && <div style={{ fontSize:8, color:t.textFaint, marginTop:1 }}>{station.rioRef}</div>}
                      {d.inmet && (
                        <div style={{ fontSize:8, color:t.accent, marginTop:3 }}>
                          ● INMET: {d.inmet.resumo}
                        </div>
                      )}
                      {d.cemaden && (
                        <div title={CEMADEN_ATTRIBUTION} style={{ fontSize:8, color:"#22c55e", marginTop:3 }}>
                          ● CEMADEN: {formatCemadenRain(d.cemaden)}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:9, fontWeight:700, padding:"2px 7px", border:`1px solid ${rColor}`, color:rColor, borderRadius:3 }}>{risk.icon} {risk.label}</div>
                  </div>
                  {d.error ? <div style={{ fontSize:10, color:"#ef4444" }}>Erro ao carregar</div> : (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                      {[
                        { l:"Precip. 14d", v:`${d.precip?.toFixed(0)}mm` },
                        { l:"Temp. mín.",  v:`${d.tempMin?.toFixed(1)}°C` },
                        { l:"Vento",       v:`${d.windMax?.toFixed(0)}km/h` },
                        { l:"Contexto ENSO", v:`${(activeENSO.prob.elNino*100).toFixed(0)}%`, highlight:true },
                      ].map(item => (
                        <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"5px 7px", borderRadius:3 }}>
                          <div style={{ fontSize:8, color:t.textMuted }}>{item.l}</div>
                          <div style={{ fontSize:11, fontWeight:600, color:item.highlight?"#f97316":t.text }}>{item.v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {station.type==="lagoa" && d.lagoa && (
                    <div style={{ marginTop:7 }}>
                      <div style={{ fontSize:8, color:t.textMuted, marginBottom:3, display:"flex", justifyContent:"space-between" }}>
                        <span>NÍVEL {d.lagoa.isReal ? "REAL" : "INDISPONÍVEL"}</span>
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
                    const dr=getRiskLevel(p*1.5,tn,w);
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
                        <div style={{ marginTop:5, fontSize:7, padding:"2px 3px", border:`1px solid ${rColor}`, color:rColor, borderRadius:3 }}>{r.label}</div>
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
                <div style={{ padding:14, background:getRiskBg(selData.risk), border:`1px solid ${getRiskColor(selData.risk)}44`, borderRadius:5 }}>
                  <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:8 }}>ANÁLISE DE RISCO — 14 DIAS</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                    {[
                      { l:"Precipitação", v:`${selData.precip?.toFixed(0)} mm`, a:selData.precip>80 },
                      { l:"Temp. mínima", v:`${selData.tempMin?.toFixed(1)}°C`,  a:selData.tempMin<5 },
                      { l:"Vento máx.",   v:`${selData.windMax?.toFixed(0)} km/h`, a:selData.windMax>50 },
                      { l:"Contexto ENSO",v:`${(activeENSO.prob.elNino*100).toFixed(0)}%`, a:false },
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
                      <div style={{ fontSize:9, fontWeight:800, padding:"3px 7px", border:`1px solid ${rColor}`, color:rColor, borderRadius:4 }}>
                        {lagoaStatusLabel(lagoa?.levelStatus)}
                      </div>
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
                                fallback local · última leitura salva{lagoa.fallback_age_minutes ? ` há ${lagoa.fallback_age_minutes} min` : ""}
                              </div>
                            )}
                            {point.id === "lagoa_patos_pelotas" && (
                              <div style={{ fontSize:8, color:t.textMuted, marginTop:3 }}>
                                Sensor HidroSens UFPel · alerta 1,20 m · crítica 1,40 m · máx. maio/2024 2,40 m
                              </div>
                            )}
                          </div>
                          <div style={{ background:dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:5 }}>
                            <div style={{ fontSize:8, color:t.textMuted }}>Cota de inundação</div>
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

        {/* ══ ENSO — El Niño / La Niña ══ */}
        {activeTab==="enso" && (
          <div style={{ display:"grid", gap:12 }}>
            {/* Banner — apenas evento mais próximo */}
            <div style={{ padding:"12px 16px", background: dark?"rgba(220,38,38,0.1)":"rgba(220,38,38,0.05)", border:"1px solid rgba(220,38,38,0.4)", borderRadius:5, display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:24 }}>⚠️</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color: dark?"#fca5a5":"#b91c1c", marginBottom:3 }}>EL NIÑO EM DESENVOLVIMENTO</div>
                <div style={{ fontSize:10, color: dark?"#fca5a5":"#b91c1c", opacity:0.85, lineHeight:1.6 }}>
                  Índice Niño 3.4: <strong>+0,9°C</strong> · IRI/CCSR: <strong>98%</strong> de prob. mai–jul 2026 · NOAA: <em>El Niño Watch</em> ativo
                </div>
              </div>
            </div>
            {/* Aviso de dados estáticos */}
            <div style={{ padding:"8px 14px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color: dark?"#fef08a":"#854d0e", display:"flex", gap:8, alignItems:"center" }}>
              🗓 <span><strong>Dados de referência: {activeENSO.referenceDate}</strong> — {activeENSO.referenceSource}. Estes valores são estáticos e refletem a publicação mais recente disponível. Para dados em tempo real, acesse <a href="https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/" target="_blank" rel="noreferrer" style={{ color:"#22d3ee" }}>IRI/CCSR</a> ou <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/" target="_blank" rel="noreferrer" style={{ color:"#22d3ee" }}>NOAA/CPC</a>.</span>
            </div>

            {/* Cards status */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:11 }}>
              {[
                { l:"Fase atual",             v:`${ensoClass.icon} ${ensoClass.label}`, s:`Niño 3.4: +${activeENSO.nino34}°C`, c:ensoClass.color },
                { l:"ONI trimestral",         v:`+${activeENSO.oni3m}°C`,                    s:"Limiar El Niño: +0,5°C",        c:"#f97316" },
                { l:"Prob. El Niño mai–jul",  v:`${(activeENSO.prob.elNino*100).toFixed(0)}%`, s:"IRI/CCSR mai 2026",           c:"#ef4444" },
                { l:"Prob. La Niña",          v:`${(activeENSO.prob.laNina*100).toFixed(0)}%`, s:"Confirmado: NÃO é La Niña",   c:"#22c55e" },
                { l:"Status NOAA",            v:"El Niño Watch",                         s:"96% até dez 2026–fev 2027",   c:"#f97316" },
                { l:"Limiar Super El Niño",   v:`+${(activeENSO.superThreshold-activeENSO.nino34).toFixed(1)}°C restam`, s:`Limiar: +${activeENSO.superThreshold}°C`, c:"#eab308" },
              ].map(item=>(
                <div key={item.l} style={{ padding:"12px 14px", background:t.cardBg, border:`1px solid ${item.c}44`, borderTop:`3px solid ${item.c}`, borderRadius:5, boxShadow:t.shadowCard }}>
                  <div style={{ fontSize:8, color:t.textMuted, letterSpacing:2, marginBottom:5 }}>{item.l.toUpperCase()}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:item.c, marginBottom:3 }}>{item.v}</div>
                  <div style={{ fontSize:8, color:t.textFaint }}>{item.s}</div>
                </div>
              ))}
            </div>

            {/* Termômetro ONI */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>ESCALA ONI — POSIÇÃO ATUAL (+0,9°C)</div>
              <div style={{ position:"relative", height:24, borderRadius:3, overflow:"hidden", background:t.barBg }}>
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#1e3a8a 0%,#3b82f6 20%,#22c55e 38%,#22c55e 62%,#f97316 76%,#ef4444 88%,#dc2626 100%)", opacity:0.75 }} />
                {[
                  {l:"La Niña Forte",pos:"10%"},{l:"La Niña",pos:"28%"},{l:"Neutro",pos:"50%"},{l:"El Niño",pos:"70%"},{l:"Super",pos:"90%"}
                ].map(lb=>(
                  <div key={lb.l} style={{ position:"absolute", top:0, left:lb.pos, transform:"translateX(-50%)", fontSize:7, color:"rgba(255,255,255,0.8)", height:"100%", display:"flex", alignItems:"center" }}>{lb.l}</div>
                ))}
                <div style={{ position:"absolute", top:0, left:`${Math.min(97,Math.max(3,((activeENSO.nino34+3)/6)*100))}%`, transform:"translateX(-50%)", width:3, height:"100%", background:"#fff", boxShadow:"0 0 6px #fff" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:8, color:t.textMuted }}>
                <span>-3°C</span>
                <span style={{ color:ensoClass.color, fontWeight:700 }}>▲ ATUAL: +{activeENSO.nino34}°C → {ensoClass.label}</span>
                <span>+3°C</span>
              </div>
            </div>

            {/* Previsão probabilística */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>PREVISÃO PROBABILÍSTICA IRI/CCSR — 8 MESES</div>
              <div style={{ display:"grid", gap:7 }}>
                {activeENSO.forecast.map((f,i)=>(
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"100px 1fr 1fr 1fr", gap:6, alignItems:"center" }}>
                    <div style={{ fontSize:9, color:t.textMuted }}>{f.p}</div>
                    {[{l:"El Niño",v:f.en,c:"#f97316"},{l:"Neutro",v:f.nu,c:"#22c55e"},{l:"La Niña",v:f.ln,c:"#3b82f6"}].map(bar=>(
                      <div key={bar.l}>
                        <div style={{ fontSize:7, color:bar.c, marginBottom:2 }}>{bar.l} {(bar.v*100).toFixed(0)}%</div>
                        <div style={{ height:4, background:t.barBg, borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${bar.v*100}%`, background:bar.c }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:8, color:t.textFaint, marginTop:8 }}>Fonte: IRI/CCSR Columbia University + NOAA/CPC · Referência: {activeENSO.referenceDate} · Dados estáticos — atualização manual necessária</div>
            </div>

            {/* Histórico */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>EVENTOS EL NIÑO — IMPACTO HISTÓRICO NO RS</div>
              <div style={{ display:"grid", gap:7 }}>
                {activeENSO.historical.map((ev,i)=>{
                  const cls=classifyENSO(ev.peak);
                  const isCur=ev.peak===null;
                  return (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"72px 1fr 1fr 60px", gap:8, alignItems:"center", padding:"9px 10px", background:isCur?getRiskBg("ALERTA"):dark?"rgba(0,0,0,0.2)":t.bg, border:`1px solid ${isCur?"rgba(220,38,38,0.35)":t.border}`, borderRadius:4 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:isCur?"#fca5a5":t.textMuted }}>{ev.y}</div>
                      <div style={{ fontSize:10, color:cls.color, fontWeight:600 }}>{cls.icon} {ev.cat}</div>
                      <div style={{ fontSize:9, color:t.textMuted }}>{ev.rs}</div>
                      <div style={{ fontSize:11, fontWeight:700, color:cls.color, textAlign:"right" }}>{ev.peak!==null?`+${ev.peak}°C`:"↑ dev."}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Impactos */}
            <div style={{ padding:16, background: dark?"rgba(249,115,22,0.05)":"rgba(249,115,22,0.04)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:5 }}>
              <div style={{ fontSize:10, color:"#f97316", letterSpacing:2, marginBottom:12 }}>IMPACTOS ESPERADOS — EL NIÑO 2026/27 NO RS</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:11 }}>
                {[
                  { i:"🌧️", t:"Chuvas 30–50% acima da média",  d:"Primavera/verão 2026/27. Bacias do Jacuí, Taquari e Pelotas em risco." },
                  { i:"🌊", t:"Inundações costeiras",           d:"Ventos do Norte + El Niño = empilhamento na Lagoa dos Patos. Rio Grande em alerta." },
                  { i:"🔥", t:"Risco de queimadas no verão",    d:"Inversão de padrão: El Niño traz mais chuva no RS mas seca extrema no outono." },
                  { i:"🌡️", t:"Ondas de calor intensas",        d:"Verão mais quente, maior evapotranspiração, estresse hídrico no Pampa." },
                ].map(item=>(
                  <div key={item.t} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                    <span style={{ fontSize:18 }}>{item.i}</span>
                    <div>
                      <div style={{ fontSize:10, fontWeight:600, color:"#fdba74", marginBottom:3 }}>{item.t}</div>
                      <div style={{ fontSize:9, color:t.textMuted, lineHeight:1.5 }}>{item.d}</div>
                    </div>
                  </div>
                ))}
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
                Produtos gráficos reais do CPTEC/INPE. Atualização verificada via Edge Function. Uso operacional: contexto climático, não alerta local imediato.
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
          <div style={{ display:"grid", gap:11 }}>
            <div style={{ padding:"10px 14px", background: dark?"rgba(139,92,246,0.08)":"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.3)", borderRadius:5, fontSize:10, color: dark?"#c4b5fd":"#7c3aed" }}>
              🛰️ <strong>Programa Copernicus (UE)</strong> — Monitoramento por satélite. Dados: Sentinel-1, 2, 3, 5P, 6. Última atualização: {COPERNICUS_DATA.lastUpdate}.
            </div>
            {/* Aviso de dados de referência */}
            <div style={{ padding:"8px 14px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:4, fontSize:9, color: dark?"#fef08a":"#854d0e" }}>
              🗓 <strong>Atenção:</strong> {COPERNICUS_DATA.referenceNote} Cada indicador exibe sua fonte e data de referência. Exceção: focos de queimada são consultados em tempo real via INPE BDQueimadas (aba Queimadas).
            </div>
            <div style={{ display:"grid", gap:8 }}>
              {COPERNICUS_DATA.themes.map(theme=>(
                <div key={theme.id} style={{ background:t.cardBg, border:`1px solid ${theme.color}44`, borderLeft:`4px solid ${theme.color}`, borderRadius:5, overflow:"hidden", boxShadow:t.shadowCard }}>
                  <div style={{ padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:11 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:20 }}>{theme.icon}</span>
                        <div style={{ fontSize:13, fontWeight:600, color:t.text }}>{theme.name}</div>
                        <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${theme.color}`, color:theme.color, borderRadius:3, letterSpacing:2 }}>{theme.status}</div>
                      </div>
                      <div style={{ fontSize:10, color:t.textMuted, marginBottom:4, lineHeight:1.5 }}><strong style={{ color:t.text }}>Histórico RS:</strong> {theme.rsHistory}</div>
                      <div style={{ fontSize:10, color:t.textMuted, marginBottom:4 }}><strong style={{ color:t.text }}>Atual:</strong> {theme.current}</div>
                      <div style={{ fontSize:9, color:t.textFaint }}>📡 {theme.copSource}</div>
                    </div>
                    <div style={{ flexShrink:0, textAlign:"right", maxWidth:170 }}>
                      <div style={{ fontSize:8, color:t.textMuted, marginBottom:4, display:"flex", justifyContent:"flex-end", alignItems:"center", gap:4 }}>
                        {theme.indicatorIsRealtime
                          ? <span style={{ color:"#22c55e" }}>● TEMPO REAL</span>
                          : <span style={{ color:"#eab308" }}>○ REFERÊNCIA</span>
                        }
                      </div>
                      <div style={{ fontSize:9, color:theme.color, fontWeight:600, textAlign:"right", lineHeight:1.4 }}>{theme.indicator}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ QUEIMADAS / APAs ══ */}
        {activeTab==="queimadas" && (
          <div style={{ display:"grid", gap:12 }}>
            <div style={{ padding:"10px 14px", background: dark?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:5, fontSize:10, color: dark?"#fdba74":"#c2410c" }}>
              🔥 Focos via <strong>INPE BDQueimadas</strong> (48h) + <strong>Copernicus EFFIS</strong> (risco incêndio).
            </div>

            {/* Focos INPE */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>FOCOS INPE — RS (últimas 48h)</div>
              {qLoading ? (
                <div style={{ textAlign:"center", padding:30, color:"#f97316", fontSize:12 }}>🔥 Consultando INPE...</div>
              ) : queimadas ? (
                <div>
                  <div style={{ fontSize:22, fontWeight:700, color:"#f97316", marginBottom:4 }}>
                    {Array.isArray(queimadas)?queimadas.length:queimadas?.count||"–"} focos
                  </div>
                  <div style={{ fontSize:10, color:t.textMuted }}>detectados no RS nas últimas 48h · INPE BDQueimadas</div>
                  {/* Nota sobre probabilidades queimadas */}
                  <div style={{ marginTop:10, padding:"8px 12px", background: dark?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.25)", borderRadius:4, fontSize:9, color:dark?"#fdba74":"#c2410c" }}>
                    ℹ️ <strong>Probabilidades EFFIS:</strong> baseadas em risco estrutural por bioma (vegetação seca, histórico). Números são consistentes com dados Copernicus EFFIS para o RS no período. El Niño (+0,9°C) amplifica risco no Pampa e Serra Gaúcha.
                  </div>
                  {Array.isArray(queimadas) && queimadas.length > 0 && (
                    <div style={{ marginTop:10, display:"grid", gap:5, maxHeight:200, overflowY:"auto" }}>
                      {queimadas.slice(0,10).map((f,i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 8px", background: dark?"rgba(0,0,0,0.3)":t.bg, borderRadius:3, fontSize:9, color:t.textMuted }}>
                          <span>🔥 {f.municipio||f.properties?.municipio||"RS"}</span>
                          <span>{f.datahora||f.properties?.datahora||"–"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:11, color:t.textMuted, marginBottom:8 }}>API INPE indisponível — dados de referência histórica:</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:8 }}>
                    {[
                      { l:"Focos 2022 (recorde)", v:"3.200+", c:"#ef4444" },
                      { l:"Focos 2023", v:"~1.800", c:"#f97316" },
                      { l:"Focos 2024", v:"~900",   c:"#eab308" },
                      { l:"Risco 2026/27", v:"ALTO", c:"#f97316" },
                    ].map(item=>(
                      <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:3 }}>
                        <div style={{ fontSize:8, color:t.textMuted }}>{item.l}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:item.c }}>{item.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:10, padding:"8px 12px", background: dark?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.04)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                    ℹ️ Probabilidades EFFIS (Pampa Médio-Alto, Serra Médio) são estimativas estruturais baseadas em bioma + El Niño + sazonalidade. Consistentes com registros históricos INPE/Copernicus.
                  </div>
                  <button onClick={loadQueimadas} style={{ marginTop:10, background: dark?"rgba(249,115,22,0.1)":"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.4)", color:"#fdba74", padding:"7px 14px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:10 }}>
                    ↻ Tentar novamente
                  </button>
                </div>
              )}
            </div>

            {/* APAs */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>UNIDADES DE CONSERVAÇÃO — RS</div>
              <div style={{ fontSize:9, color: dark?"#eab308":"#a16207", marginBottom:12, padding:"6px 10px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.2)", borderRadius:4 }}>
                ⚠ Risco por UC não disponível nesta versão — exigiria integração com API ICMBio (tempo real de focos por UC). Os dados abaixo são de cadastro georreferenciado oficial.
              </div>
              <div style={{ display:"grid", gap:7 }}>
                {APAS_RS.map(apa=>(
                  <div key={apa.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"center", padding:"9px 12px", background: dark?"rgba(0,0,0,0.2)":t.bg, border:`1px solid ${t.border}`, borderRadius:4 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:t.text }}>{apa.name}</div>
                      <div style={{ fontSize:9, color:t.textMuted }}>{apa.municipio}</div>
                    </div>
                    <div style={{ fontSize:9, color:t.textFaint }}>{apa.lat.toFixed(2)}°S</div>
                    <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${t.textFaint}`, color:t.textMuted, borderRadius:3 }}>sem dado</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, padding:"9px 11px", background: dark?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.04)", border:"1px solid rgba(249,115,22,0.15)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                Para risco em tempo real por UC, integre: <span style={{ color:t.accent }}>geo.icmbio.gov.br/portal</span> (WFS focos) + INPE BDQueimadas filtrado por geocerca.
              </div>
            </div>

            {/* EFFIS */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:4 }}>COPERNICUS EFFIS — RISCO ESTRUTURAL DE INCÊNDIO RS</div>
              <div style={{ fontSize:9, color: dark?"#fef08a":"#854d0e", marginBottom:10, padding:"5px 10px", background: dark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.2)", borderRadius:4 }}>
                🗓 Risco estrutural por bioma — dado de referência EFFIS, não tempo real. Valores reflectem histórico + sazonalidade + El Niño.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                {[
                  { l:"Pampa Gaúcho",  v:"Médio-Alto", c:"#f97316", d:"Vegetação seca · bioma Pampa" },
                  { l:"Serra Gaúcha",  v:"Médio",       c:"#eab308", d:"Mata Atlântica úmida" },
                  { l:"Litoral RS",    v:"Baixo",        c:"#22c55e", d:"Restinga úmida" },
                  { l:"Missões",       v:"Médio",        c:"#eab308", d:"Campos e matas" },
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
              🌡️ <strong>El Niño (+0,9°C) em desenvolvimento.</strong> Prob. mai–jul 2026: 98% (NOAA/IRI). Risco elevado no RS.
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
                    <div key={i} style={{ padding:"12px 14px", background:rBg, border:`1px solid ${rColor}55`, borderLeft:`4px solid ${rColor}`, borderRadius:5 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:rColor }}>{r.icon} {r.label.toUpperCase()} — {alert.station}</div>
                        <div style={{ fontSize:9, color:t.textMuted }}>detectado {new Date(alert.at).toLocaleString("pt-BR")}</div>
                      </div>
                      <div style={{ fontSize:11, color:t.textMuted }}>{alert.message}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Canais */}
            <div style={{ marginTop:16, ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:10 }}>CANAIS DE NOTIFICAÇÃO</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:8 }}>
                {[
                  { i:"📱", n:"Push nativo (PWA)",  s:"Ativo — botão no header",  ok:true,  h:null },
                  { i:"🔔", n:"Alertas na tela",    s:"Ativo — 30min",            ok:true,  h:null },
                  { i:"📧", n:"E-mail (Resend)",    s:"Configurar",               ok:false, h:"1. resend.com → API key\n2. RESEND_API_KEY nos secrets Supabase\n3. Chamar resend.emails.send() no send-alerts" },
                  { i:"📢", n:"Defesa Civil RS",    s:"Ativo — RSS oficial",      ok:true,  h:"Fonte oficial conectada via Supabase Edge Function. RSS: www.defesacivil.rs.gov.br/rss" },
                  { i:"📲", n:"SMS (Twilio)",       s:"Configurar",               ok:false, h:"1. twilio.com → Account SID + Token\n2. Secrets no Supabase\n3. SMS só para EMERGENCIA/CRITICO" },
                  { i:"🔊", n:"Sirene IoT",         s:"Requer hardware",          ok:false, h:"1. ESP32 + relê\n2. Webhook Supabase → POST /trigger\n3. Ativa em CRITICO" },
                ].map(c=>(
                  <div key={c.n} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, borderRadius:4, border:`1px solid ${t.border}`, overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px" }}>
                      <span style={{ fontSize:18 }}>{c.i}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, color:t.text }}>{c.n}</div>
                        <div style={{ fontSize:9, color:c.ok?"#22c55e":t.textFaint }}>{c.s}</div>
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

            {/* BLOCO D — Saúde das fontes em tempo real */}
            <div style={{ ...s.card, border:`1px solid ${t.borderActive}` }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:10 }}>SAÚDE DAS FONTES — ÚLTIMA VERIFICAÇÃO</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
                {[
                  "Open-Meteo","ANA HidroWeb","INMET","CEMADEN","RADAR Lagoa","HidroSens","Defesa Civil RS",
                ].map(name => {
                  const h = sourceHealth[name];
                  const ok   = h?.ok;
                  const never = !h;
                  const color = never ? "#64748b" : ok ? "#22c55e" : "#ef4444";
                  const label = never ? "Aguardando" : ok ? "OK" : "Falhou";
                  return (
                    <div key={name} style={{ padding:"9px 12px", background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:5, border:`1px solid ${color}33`, borderLeft:`3px solid ${color}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:10, fontWeight:600, color:t.text }}>{name}</span>
                        <span style={{ fontSize:8, fontWeight:700, color }}>{label}</span>
                      </div>
                      {h && (
                        <>
                          <div style={{ fontSize:8, color:t.textMuted }}>Latência: {h.latencyMs}ms</div>
                          {h.lastOk && <div style={{ fontSize:8, color:t.textFaint }}>Último OK: {formatDateTimeBR(h.lastOk)}</div>}
                          {h.error && !ok && <div style={{ fontSize:8, color:"#ef4444", marginTop:2 }}>{h.error}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:8, fontSize:8, color:t.textFaint }}>
                Atualizado a cada 30min junto com os dados. Latência medida no navegador.
              </div>
            </div>

            {/* Detalhes estáticos por fonte */}
            <div style={{ display:"grid", gap:8 }}>
            {[
              { n:"Open-Meteo",               st:"ATIVO",     c:"#22c55e", d:"Previsão meteorológica 14 dias — temperatura, precipitação, vento. Atualização automática.", a:"Gratuita, sem chave", h:null },
              { n:"ANA HidroWeb (Telemetria)", st:"ATIVO",     c:"#22c55e", d:"Nível real da Lagoa dos Patos em 4 pontos. Exibe '–' quando indisponível — sem simulação.",  a:"API pública, sem chave", h:null },
              { n:"NOAA/CPC + IRI — ENSO",   st:"ATIVO",  c:"#eab308", d:"El Niño/La Niña: Niño 3.4, ONI, probabilidades 8 meses. Niño 3.4, ONI e probabilidades ENSO atualizados via Edge Functions.", a:"Dados públicos, atualização mensal", h:"1. iri.columbia.edu/our-expertise/climate/forecasts/enso/current/\n2. Atualizar valores activeENSO.nino34, oni3m, prob e forecast no código\n3. Publicação NOAA/IRI: primeira semana de cada mês" },
              { n:"INPE BDQueimadas",          st:"ATIVO",     c:"#22c55e", d:"Focos de queimada últimas 48h no RS — API pública. Exibe histórico de referência quando API indisponível.", a:"Sem chave", h:null },
              { n:"Copernicus — Indicadores de referência",  st:"ATIVO PARCIAL",  c:"#eab308", d:"NDVI, SPI-3, IQA e nível do mar permanecem como referência estática; APIs reais exigem cadastro/token.", a:"Registro gratuito para APIs reais", h:"Para tempo real:\n- NDVI: Sentinel-2 via dataspace.copernicus.eu\n- SPI-3: CHIRPS + cálculo local\n- IQA: QUALAR/IBAMA\n- Nível mar: CMEMS altimetry API" },
              { n:"INMET",                     st:"ATIVO",     c:"#22c55e", d:"Previsão oficial por município via apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Conectado diretamente no navegador.", a:"API pública, sem chave", h:"Endpoint validado: https://apiprevmet3.inmet.gov.br/previsao/4315602" },
              { n:"CPTEC/INPE",                st:"PLANEJADO", c:"#eab308", d:"Produtos sazonais/subsazonais oficiais por imagem via Edge Function.",           a:"API pública", h:"1. servicos.cptec.inpe.br/XML/cidade/{id}/previsao.xml\n2. Proxy via Supabase Edge Function (CORS)" },
              { n:"Defesa Civil RS",           st:"ATIVO",     c:"#22c55e", d:"Avisos oficiais via RSS da Defesa Civil do Rio Grande do Sul, consumidos por Supabase Edge Function para evitar bloqueio CORS.", a:"RSS oficial via proxy", h:"Endpoint ativo: https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs" },
              { n:"CEMADEN",                   st:"ATIVO",     c:"#22c55e", d:"Chuva observada por acumulados recentes das PCDs CEMADEN. Fonte obrigatória: DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC.", a:"Token PED via Supabase Secret", h:"Endpoint: cemaden-rs. Cache: 10 min. Limite PED para usuário externo: até 12 requisições/minuto." },
              { n:"RADAR Lagoa dos Patos",     st:"ATIVO",     c:"#22c55e", d:"Sensores RADAR em 5 pontos da Lagoa (Itapuã, Arambaré, São Lourenço, São José do Norte, Rio Grande).", a:"API pública via proxy Supabase", h:"Endpoint: lagoa-patos-radar. Fallback local 6h ativado automaticamente." },
              { n:"HidroSens / UFPel",         st:"ATIVO",     c:"#22c55e", d:"Sensor ultrassônico em Laranjal (Pelotas). Limiares: ALERTA 1,20m · CRÍTICO 1,40m · máx mai/2024: 2,40m.", a:"ThingsBoard público via Supabase", h:"Endpoint: hidrosens-laranjal. Altura do sensor: 5,06m. Fallback local 6h." },
              { n:"Copernicus Emergency (EU)", st:"FUTURO",    c:"#8b5cf6", d:"Sentinel-1 SAR para detecção de alagamentos.",                     a:"Registro gratuito", h:"1. dataspace.copernicus.eu → cadastro\n2. API STAC Sentinel-1" },
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
                    {api.h && <button onClick={()=>setExpanded(expanded===api.n?null:api.n)} style={{ background:"none", border:`1px solid ${t.accent}44`, color:t.accent, cursor:"pointer", fontSize:8, padding:"2px 6px", borderRadius:3, fontFamily:"inherit" }}>{expanded===api.n?"▲ fechar":"▼ como"}</button>}
                  </div>
                </div>
                {api.h && expanded===api.n && <div style={{ padding:"10px 14px", borderTop:`1px solid ${t.border}`, background: dark?"rgba(0,0,0,0.2)":t.bg, fontSize:10, color:t.textMuted, lineHeight:1.8, whiteSpace:"pre-line" }}>{api.h}</div>}
              </div>
            ))}
            </div>
          </div>
        )}

        <div style={{ marginTop:28, borderTop:`1px solid ${t.border}`, paddingTop:12, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
          <div style={{ fontSize:9, color:t.textFaint }}>SENTINELA·RS v2.2 · Open-Meteo + INMET + CEMADEN + Lagoa RADAR + HidroSens + ANA HidroWeb + NOAA ENSO + INPE + Copernicus · Fonte CEMADEN: {CEMADEN_ATTRIBUTION}</div>
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
