import {
  ANA_RS_FUNCTION_URL,
  CEMADEN_RS_FUNCTION_URL,
  COPERNICUS_EMS_FUNCTION_URL,
  COPERNICUS_EMS_RAPID_DETAIL_URL,
  COPERNICUS_EMS_RAPID_INFO_URL,
  COPERNICUS_EMS_RRM_URL,
  COPERNICUS_NDVI_FUNCTION_URL,
  COPERNICUS_SENTINEL1_FUNCTION_URL,
  COPERNICUS_WATER_FUNCTION_URL,
  CPTEC_INPE_PRODUCTS_FUNCTION_URL,
  CENSIPAM_FIRE_EVENTS_RS_FUNCTION_URL,
  DEFESA_CIVIL_RS_FUNCTION_URL,
  ENSO_NOTICIAS_FUNCTION_URL,
  EFFIS_WMS_HEALTH_FUNCTION_URL,
  HIDROSENS_LARANJAL_FUNCTION_URL,
  ICMBIO_UCS_RS_FUNCTION_URL,
  INMET_PREVISAO_FUNCTION_URL,
  INPE_FIRE_EVENTS_RS_FUNCTION_URL,
  INPE_QUEIMADAS_RS_FUNCTION_URL,
  IRI_ENSO_PROB_FUNCTION_URL,
  LAGOA_RADAR_FUNCTION_URL,
  NOAA_ENSO_FUNCTION_URL,
} from "../config/sources";

export const CEMADEN_ATTRIBUTION = "DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC";

export const ENSO_UNAVAILABLE = {
  nino34: null,
  oni3m: null,
  phase: "UNAVAILABLE",
  referenceDate: null,
  referenceSource: "NOAA/CPC indisponível",
  prob: null,
  superThreshold: 1.5,
  forecast: [],
};

export const COPERNICUS_REFERENCE = {
  themes: [],
};

const COPERNICUS_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function readJsonCache(key, maxAgeMs = COPERNICUS_CACHE_MAX_AGE_MS) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const savedAtMs = new Date(parsed.saved_at || 0).getTime();
    if (!savedAtMs || Date.now() - savedAtMs > maxAgeMs) return null;
    return {
      ...parsed.data,
      cached: true,
      cache_saved_at: parsed.saved_at,
      cache_age_minutes: Math.round((Date.now() - savedAtMs) / 60000),
    };
  } catch {
    return null;
  }
}

function saveJsonCache(key, data) {
  try {
    if (typeof window === "undefined" || !window.localStorage || !data) return;
    window.localStorage.setItem(key, JSON.stringify({
      saved_at: new Date().toISOString(),
      data,
    }));
  } catch {}
}

async function readJsonOrServiceError(response, source) {
  if (!response.ok) {
    return {
      ok: false,
      source,
      status: response.status,
      error: `${source} HTTP ${response.status}`,
      fetched_at: new Date().toISOString(),
    };
  }

  try {
    return await response.json();
  } catch {
    return {
      ok: false,
      source,
      status: response.status,
      error: `${source} retornou JSON invalido`,
      fetched_at: new Date().toISOString(),
    };
  }
}

export async function fetchNoaaEnso() {
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

export async function fetchCptecInpeProducts() {
  try {
    const res = await fetch(CPTEC_INPE_PRODUCTS_FUNCTION_URL, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { ok: false, products: [], error: `CPTEC/INPE HTTP ${res.status}`, fetched_at: new Date().toISOString() };

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data?.products)) {
      return { ok: false, products: [], error: data?.error || "CPTEC/INPE sem produtos validos", fetched_at: data?.fetched_at || new Date().toISOString() };
    }

    return data;
  } catch (err) {
    return { ok: false, products: [], error: err?.message || "timeout", fetched_at: new Date().toISOString() };
  }
}

export async function fetchCopernicusWater(aoi = "lagoa_patos", days = 30) {
  const cacheKey = `sentinela_rs_copernicus_water_${aoi}_${days}`;
  const cached = readJsonCache(cacheKey);
  try {
    const url = `${COPERNICUS_WATER_FUNCTION_URL}?aoi=${encodeURIComponent(aoi)}&days=${encodeURIComponent(days)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(35000), cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return cached || null;

    const data = await res.json();
    if (!data || data.ok !== true || typeof data.water_percent !== "number") return data || cached || null;

    saveJsonCache(cacheKey, data);
    return data;
  } catch {
    return cached || null;
  }
}

export async function fetchCopernicusSentinel1(aoi = "lagoa_patos", days = 18) {
  const cacheKey = `sentinela_rs_copernicus_s1_${aoi}_${days}`;
  const cached = readJsonCache(cacheKey);
  try {
    const url = `${COPERNICUS_SENTINEL1_FUNCTION_URL}?aoi=${encodeURIComponent(aoi)}&days=${encodeURIComponent(days)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(35000), cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return cached || null;

    const data = await res.json();
    if (!data || typeof data.water_like_percent !== "number") return data || cached || null;

    saveJsonCache(cacheKey, data);
    return data;
  } catch {
    return cached || null;
  }
}

export async function fetchCopernicusNdvi(aoi = "entorno_lagoa_patos", days = 30) {
  const cacheKey = `sentinela_rs_copernicus_ndvi_${aoi}_${days}`;
  const cached = readJsonCache(cacheKey);
  try {
    const url = `${COPERNICUS_NDVI_FUNCTION_URL}?aoi=${encodeURIComponent(aoi)}&days=${encodeURIComponent(days)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(35000), cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return cached || null;

    const data = await res.json();
    if (!data || typeof data.ndvi_mean !== "number") return data || cached || null;

    saveJsonCache(cacheKey, data);
    return data;
  } catch {
    return cached || null;
  }
}

export async function fetchCopernicusEms() {
  try {
    const res = await fetch(COPERNICUS_EMS_FUNCTION_URL, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;

    const data = await res.json();
    return data?.ok ? data : null;
  } catch {
    return fetchCopernicusEmsDirect();
  }
}

export async function fetchCopernicusEmsDirect() {
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

export async function fetchIriEnsoProbabilities() {
  try {
    const res = await fetch(IRI_ENSO_PROB_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { ok: false, error: `IRI/CCSR HTTP ${res.status}`, prob: null, forecast: [], probabilityFetchedAt: new Date().toISOString() };

    const data = await res.json();
    if (!data?.ok || !data?.prob || !Array.isArray(data?.forecast)) {
      return { ok: false, error: data?.error || "IRI/CCSR sem probabilidade validada", prob: null, forecast: [], probabilityFetchedAt: data?.fetched_at || new Date().toISOString() };
    }

    return {
      ok: true,
      prob: data.prob,
      forecast: data.forecast,
      probabilitySource: data.source,
      probabilityReferenceDate: data.referenceDate,
      probabilityDynamic: true,
      probabilityFetchedAt: data.fetched_at,
      probabilityParsing: data.parsing,
    };
  } catch (err) {
    return { ok: false, error: err?.message || "timeout", prob: null, forecast: [], probabilityFetchedAt: new Date().toISOString() };
  }
}

export async function fetchWeather14Days(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=America%2FSao_Paulo&forecast_days=14`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error("Open-Meteo indisponível");
  return res.json();
}

const LAGOA_FALLBACK_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const LAGOA_RADAR_CACHE_KEY = "sentinela_rs_lagoa_radar_last_valid_v1";
const HIDROSENS_LARANJAL_CACHE_KEY = "sentinela_rs_hidrosens_laranjal_last_valid_v1";

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

export async function fetchHidroSensLaranjalLevel() {
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

export async function fetchLagoaRadarLevels() {
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

export async function fetchAnaLevel(anaCode) {
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

export async function fetchQueimadas() {
  try {
    const res = await fetch(`${INPE_QUEIMADAS_RS_FUNCTION_URL}?days=2&limit=100`, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readJsonOrServiceError(res, "INPE BDQueimadas");
  } catch (err) {
    return { ok: false, source: "INPE BDQueimadas", error: err?.message || "timeout", fetched_at: new Date().toISOString() };
  }
}

export async function fetchCensipamFireEventsRs() {
  try {
    const res = await fetch(CENSIPAM_FIRE_EVENTS_RS_FUNCTION_URL, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readJsonOrServiceError(res, "CENSIPAM Painel do Fogo");
  } catch (err) {
    return { ok: false, source: "CENSIPAM Painel do Fogo", error: err?.message || "timeout", fetched_at: new Date().toISOString() };
  }
}

export async function fetchInpeFireEventsRs() {
  try {
    const res = await fetch(INPE_FIRE_EVENTS_RS_FUNCTION_URL, {
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readJsonOrServiceError(res, "INPE Eventos de Fogo");
  } catch (err) {
    return { ok: false, source: "INPE Eventos de Fogo", error: err?.message || "timeout", fetched_at: new Date().toISOString() };
  }
}

export async function fetchIcmbioUcsRs() {
  try {
    const res = await fetch(`${ICMBIO_UCS_RS_FUNCTION_URL}?priority=true&limit=30`, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readJsonOrServiceError(res, "ICMBio/MMA CNUC");
  } catch (err) {
    return { ok: false, source: "ICMBio/MMA CNUC", error: err?.message || "timeout", fetched_at: new Date().toISOString() };
  }
}

export async function fetchEffisWmsHealth() {
  try {
    const res = await fetch(EFFIS_WMS_HEALTH_FUNCTION_URL, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readJsonOrServiceError(res, "Copernicus EFFIS");
  } catch (err) {
    return { ok: false, source: "Copernicus EFFIS", error: err?.message || "timeout", fetched_at: new Date().toISOString() };
  }
}

export async function fetchCemadenAccumulations() {
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

export async function fetchInmetForecast(ibgeCode) {
  if (!ibgeCode) return null;

  try {
    const res = await fetch(`${INMET_PREVISAO_FUNCTION_URL}?codigo_ibge=${encodeURIComponent(ibgeCode)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { ok: false, error: `INMET HTTP ${res.status}`, fetched_at: new Date().toISOString() };

    const data = await res.json();
    if (!data?.ok || !data?.latest) {
      return { ok: false, error: data?.error || "INMET sem previsao validada", fetched_at: data?.fetched_at || new Date().toISOString() };
    }

    return {
      ...data.latest,
      ok: true,
      proxied: true,
      fetched_at: data.fetched_at,
    };
  } catch (err) {
    return { ok: false, error: err?.message || "timeout", fetched_at: new Date().toISOString() };
  }
}

function normalizeOfficialRiskLevel(alert) {
  const text = `${alert?.title || ""} ${alert?.message || ""}`.toUpperCase();

  if (text.includes("RISCO EXTREMO") || text.includes("EMERGENCIA METEOROLOGICA")) {
    return "EMERGENCIA";
  }

  if (text.includes("RISCO MUITO NAO USAR COMO ALERTA") || text.includes("CRITICO")) {
    return "CRITICO";
  }

  if (text.includes("ALERTA") || text.includes("RISCO NAO USAR COMO ALERTA")) {
    return "ALERTA";
  }

  return alert?.risk_level || "ATENCAO";
}

export async function fetchDefesaCivilAlerts() {
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

export async function fetchEnsoNoticias() {
  try {
    const res = await fetch(ENSO_NOTICIAS_FUNCTION_URL, {
      signal: AbortSignal.timeout(25000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { ok: false, items: [], sources: [], error: `HTTP ${res.status}` };

    const data = await res.json();
    if (!data?.ok) {
      return {
        ok: false,
        items: [],
        sources: data?.sources || [],
        error: data?.error || "sem dados",
      };
    }

    return {
      ok: true,
      items: data.items || [],
      sources: data.sources || [],
      fetched_at: data.fetched_at || null,
      translation: data.translation || "none",
      total: data.total || 0,
    };
  } catch (err) {
    return { ok: false, items: [], sources: [], error: err?.message || "timeout" };
  }
}
