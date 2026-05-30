// supabase/functions/poll-apis/index.ts
// Coleta periódica para histórico operacional. Nível da Lagoa só é gravado quando
// vem de fonte real validada: RADAR Lagoa dos Patos ou HidroSens/UFPel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey =
  Deno.env.get("SENTINELA_SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);
const functionsBaseUrl = `${supabaseUrl}/functions/v1`;

type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: "lagoa" | "cidade";
};

type LagoaReading = {
  station_id: string;
  level_m: number;
  measured_at?: string | null;
  source?: string | null;
  status?: string | null;
  threshold_m?: number | null;
  operational?: boolean;
  stale?: boolean;
};

const STATIONS: Station[] = [
  { id: "lagoa_patos_poa", name: "Lagoa dos Patos - Itapua", lat: -30.36, lon: -51.03, type: "lagoa" },
  { id: "lagoa_patos_arambare", name: "Lagoa dos Patos - Arambare", lat: -30.91, lon: -51.50, type: "lagoa" },
  { id: "lagoa_sao_lourenco", name: "Lagoa dos Patos - Sao Lourenco do Sul", lat: -31.36, lon: -51.98, type: "lagoa" },
  { id: "lagoa_patos_pelotas", name: "Lagoa dos Patos - Pelotas / Laranjal", lat: -31.77, lon: -52.34, type: "lagoa" },
  { id: "lagoa_sao_jose_norte", name: "Lagoa dos Patos - Sao Jose do Norte", lat: -32.02, lon: -52.04, type: "lagoa" },
  { id: "lagoa_rio_grande", name: "Lagoa dos Patos - Rio Grande / Barra", lat: -32.03, lon: -52.10, type: "lagoa" },
  { id: "rs_porto_alegre", name: "Porto Alegre", lat: -30.03, lon: -51.23, type: "cidade" },
  { id: "rs_canoas", name: "Canoas", lat: -29.92, lon: -51.18, type: "cidade" },
  { id: "rs_sao_leopoldo", name: "Sao Leopoldo", lat: -29.76, lon: -51.14, type: "cidade" },
  { id: "rs_lajeado", name: "Lajeado", lat: -29.47, lon: -51.96, type: "cidade" },
  { id: "rs_caxias_sul", name: "Caxias do Sul", lat: -29.17, lon: -51.17, type: "cidade" },
  { id: "rs_passo_fundo", name: "Passo Fundo", lat: -28.26, lon: -52.41, type: "cidade" },
  { id: "rs_pelotas", name: "Pelotas", lat: -31.77, lon: -52.34, type: "cidade" },
  { id: "rs_santa_maria", name: "Santa Maria", lat: -29.68, lon: -53.81, type: "cidade" },
  { id: "rs_rio_grande", name: "Rio Grande", lat: -32.03, lon: -52.10, type: "cidade" },
  { id: "rs_cachoeira_sul", name: "Cachoeira do Sul", lat: -29.88, lon: -52.89, type: "cidade" },
];

function isFresh(measuredAt?: string | null) {
  if (!measuredAt) return true;
  const ageMs = Date.now() - new Date(measuredAt).getTime();
  return Number.isFinite(ageMs) && ageMs <= 24 * 60 * 60 * 1000;
}

function normalizeLevel(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const obj = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const parts = [obj.message, obj.code, obj.details, obj.hint]
      .filter(Boolean)
      .map(String);
    return parts.length ? parts.join(" | ") : JSON.stringify(err);
  }
  return String(err || "falha");
}

function classifyWeatherRisk(precipAccum: number, tempMin: number, windMax: number): string {
  let score = 0;
  if (precipAccum > 150) score += 4;
  else if (precipAccum > 80) score += 3;
  else if (precipAccum > 40) score += 2;
  else if (precipAccum > 20) score += 1;

  if (tempMin < 0) score += 3;
  else if (tempMin < 5) score += 2;

  if (windMax > 80) score += 3;
  else if (windMax > 50) score += 2;
  else if (windMax > 30) score += 1;

  if (score >= 9) return "CRITICO";
  if (score >= 6) return "EMERGENCIA";
  if (score >= 4) return "ALERTA";
  if (score >= 2) return "ATENCAO";
  return "NORMAL";
}

function classifyLagoaRisk(reading: LagoaReading | null): string {
  if (!reading || typeof reading.level_m !== "number") return "NORMAL";

  const status = String(reading.status || "").toUpperCase();
  if (["CRITICO", "EMERGENCIA", "ALERTA", "ATENCAO"].includes(status)) {
    return status === "CRITICO" ? "CRITICO" : status;
  }

  const threshold = normalizeLevel(reading.threshold_m);
  if (threshold !== null && reading.level_m >= threshold) return "ALERTA";

  return "NORMAL";
}

function maxRisk(a: string, b: string) {
  const order = ["NORMAL", "ATENCAO", "ALERTA", "EMERGENCIA", "CRITICO"];
  return order.indexOf(b) > order.indexOf(a) ? b : a;
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.json();
}

async function fetchLagoaReadings() {
  const readings = new Map<string, LagoaReading>();
  const errors: string[] = [];

  try {
    const radar = await fetchJson(`${functionsBaseUrl}/lagoa-patos-radar`);
    for (const sensor of radar?.sensors || []) {
      const level = normalizeLevel(sensor?.level_m);
      const stationId = String(sensor?.station_id || "");
      const operational = sensor?.operational !== false && sensor?.stale !== true && isFresh(sensor?.measured_at);
      if (!stationId || level === null || !operational) continue;
      readings.set(stationId, {
        station_id: stationId,
        level_m: level,
        measured_at: sensor.measured_at || sensor.fetched_at || null,
        source: "RADAR Lagoa dos Patos",
        status: sensor.status || null,
        threshold_m: normalizeLevel(sensor.threshold_m),
        operational,
        stale: false,
      });
    }
  } catch (err) {
    errors.push(`RADAR: ${errorMessage(err)}`);
  }

  try {
    const hidrosens = await fetchJson(`${functionsBaseUrl}/hidrosens-laranjal`);
    const level = normalizeLevel(hidrosens?.level_m);
    const stationId = String(hidrosens?.station_id || "lagoa_patos_pelotas");
    const operational = hidrosens?.operational !== false && hidrosens?.stale !== true && isFresh(hidrosens?.measured_at);
    if (level !== null && operational) {
      readings.set(stationId, {
        station_id: stationId,
        level_m: level,
        measured_at: hidrosens.measured_at || hidrosens.fetched_at || null,
        source: "HidroSens/UFPel",
        status: hidrosens.status || null,
        threshold_m: normalizeLevel(hidrosens.threshold_m ?? 1.2),
        operational,
        stale: false,
      });
    }
  } catch (err) {
    errors.push(`HidroSens: ${errorMessage(err)}`);
  }

  return { readings, errors };
}

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth?.includes(serviceRoleKey)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const lagoaResult = await fetchLagoaReadings();
  const results = {
    ok: true,
    success: 0,
    errors: 0,
    alerts: 0,
    lagoa_real_readings: lagoaResult.readings.size,
    lagoa_source_errors: lagoaResult.errors,
    station_errors: [] as Array<{ station_id: string; error: string }>,
  };

  for (const station of STATIONS) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=America%2FSao_Paulo&forecast_days=7`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

      const data = await res.json();
      const daily = data.daily || {};
      const precipAccum = (daily.precipitation_sum || []).reduce((a: number, b: number) => a + Number(b || 0), 0);
      const tempMin = Math.min(...(daily.temperature_2m_min || [20]).map(Number));
      const tempMax = Math.max(...(daily.temperature_2m_max || [30]).map(Number));
      const windMax = Math.max(...(daily.windspeed_10m_max || [0]).map(Number));
      const lagoaReading = station.type === "lagoa" ? lagoaResult.readings.get(station.id) || null : null;
      const lagoaLevel = lagoaReading?.level_m ?? null;
      const weatherRisk = classifyWeatherRisk(precipAccum, tempMin, windMax);
      const riskLevel = maxRisk(weatherRisk, classifyLagoaRisk(lagoaReading));

      const { error: readingError } = await supabase.from("readings").insert({
        station_id: station.id,
        station_name: station.name,
        precip_mm: precipAccum,
        temp_min: tempMin,
        temp_max: tempMax,
        wind_max: windMax,
        weather_code: daily.weathercode?.[0] ?? null,
        lagoa_level: lagoaLevel,
        ninha_prob: null,
        risk_level: riskLevel,
      });
      if (readingError) throw readingError;

      if (riskLevel !== "NORMAL") {
        const parts: string[] = [];
        if (precipAccum > 80) parts.push(`chuva ${precipAccum.toFixed(0)}mm/7d`);
        if (tempMin < 5) parts.push(`temp. min. ${tempMin.toFixed(1)}C`);
        if (windMax > 50) parts.push(`vento ${windMax.toFixed(0)}km/h`);
        if (lagoaReading && lagoaLevel !== null) {
          const source = lagoaReading.source ? ` (${lagoaReading.source})` : "";
          parts.push(`lagoa ${lagoaLevel.toFixed(2)}m${source}`);
        }

        const { data: existing } = await supabase
          .from("alerts")
          .select("id")
          .eq("station_id", station.id)
          .eq("active", true)
          .eq("risk_level", riskLevel)
          .maybeSingle();

        if (!existing) {
          const { error: alertError } = await supabase.from("alerts").insert({
            station_id: station.id,
            station_name: station.name,
            risk_level: riskLevel,
            message: parts.join(" · "),
            precip_7d: precipAccum,
            temp_min: tempMin,
            wind_max: windMax,
            lagoa_level: lagoaLevel,
          });
          if (alertError) throw alertError;
          results.alerts++;
        }
      }

      results.success++;
    } catch (err) {
      console.error(`Erro ${station.id}:`, err);
      results.station_errors.push({ station_id: station.id, error: errorMessage(err) });
      results.errors++;
    }
  }

  return new Response(JSON.stringify(results), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
});
