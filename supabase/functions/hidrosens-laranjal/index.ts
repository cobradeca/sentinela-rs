const TB_BASE_URL = "https://tb.labhidrosens.com";
const HIDROSENS_PUBLIC_ID = "0a869e80-d9e8-11f0-ac7c-456d9a25fe9a";
const LARANJAL_DEVICE_ID = "a3e1d520-b438-11f0-ac7c-456d9a25fe9a";

const SENSOR_HEIGHT_M = 5.06;
const LARANJAL_ALERT_THRESHOLD_M = 1.20;
const LARANJAL_CRITICAL_THRESHOLD_M = 1.40;
const LARANJAL_MAX_MAY_2024_M = 2.40;

// O ThingsBoard pode publicar payloads de telemetria sem Distance.
// Por isso buscamos uma janela histórica e escolhemos a leitura mais recente que contenha Distance.
const LOOKBACK_HOURS = 24;
const MAX_OPERATIONAL_AGE_MINUTES = 24 * 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function numberFromValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!match?.[0]) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function extractDistanceMeters(payloadValue: unknown): number | null {
  const seen = new Set<unknown>();

  function walk(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    if (typeof value === "object") {
      if (seen.has(value)) return null;
      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = walk(item);
          if (found !== null) return found;
        }
        return null;
      }

      const obj = value as Record<string, unknown>;

      for (const key of [
        "distance_m",
        "distance",
        "Distance",
        "distancia",
        "distância",
        "Distancia",
        "Distância",
        "dist",
      ]) {
        if (key in obj) {
          const n = numberFromValue(obj[key]);
          if (n !== null) return n;
        }
      }

      for (const key of ["text", "value", "payload", "data", "message"]) {
        if (typeof obj[key] === "string") {
          const found = walk(obj[key]);
          if (found !== null) return found;
        }
      }

      return null;
    }

    let text = String(value ?? "");

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        const found = walk(parsed);
        if (found !== null) return found;
      } catch {
        // texto livre
      }
    }

    text = text.replace(",", ".");

    const distanceMatch = text.match(/(?:distance|dist[aâ]ncia|distancia|distância|dist)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (distanceMatch?.[1]) {
      const n = Number(distanceMatch[1]);
      if (Number.isFinite(n)) return n;
    }

    const cleaned = text.replace(/WL-?\d+/gi, "");
    const meterMatch = cleaned.match(/([0-9]+(?:\.[0-9]+)?)\s*m\b/i);
    if (meterMatch?.[1]) {
      const n = Number(meterMatch[1]);
      if (Number.isFinite(n)) return n;
    }

    return null;
  }

  return walk(payloadValue);
}

function classifyLaranjal(levelM: number | null, ageMinutes: number | null) {
  if (typeof levelM !== "number") return "SEM_LEITURA";

  // Leitura antiga continua informativa, mas não pode acionar alerta automático.
  if (typeof ageMinutes === "number" && ageMinutes > MAX_OPERATIONAL_AGE_MINUTES) {
    return "SEM_LEITURA";
  }

  if (levelM >= LARANJAL_CRITICAL_THRESHOLD_M) return "ALERTA";
  if (levelM >= LARANJAL_ALERT_THRESHOLD_M) return "ATENCAO";
  return "NORMAL";
}

async function publicLogin() {
  const response = await fetch(`${TB_BASE_URL}/api/auth/login/public`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "SentinelaRS/1.0",
    },
    body: JSON.stringify({ publicId: HIDROSENS_PUBLIC_ID }),
  });

  if (!response.ok) {
    throw new Error(`ThingsBoard public login returned ${response.status}`);
  }

  const data = await response.json();

  if (!data?.token) {
    throw new Error("ThingsBoard public login did not return token");
  }

  return data.token;
}

async function fetchPayloadSeries(token: string) {
  const endTs = Date.now();
  const startTs = endTs - LOOKBACK_HOURS * 60 * 60 * 1000;

  const url = new URL(`${TB_BASE_URL}/api/plugins/telemetry/DEVICE/${LARANJAL_DEVICE_ID}/values/timeseries`);
  url.searchParams.set("keys", "payload");
  url.searchParams.set("startTs", String(startTs));
  url.searchParams.set("endTs", String(endTs));
  url.searchParams.set("interval", "0");
  url.searchParams.set("limit", "1000");
  url.searchParams.set("agg", "NONE");
  url.searchParams.set("orderBy", "DESC");

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "X-Authorization": `Bearer ${token}`,
      "User-Agent": "SentinelaRS/1.0",
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`ThingsBoard telemetry returned ${response.status}: ${text.slice(0, 200)}`);
  }

  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.payload) ? parsed.payload : [];
}

function findLatestDistanceReading(series: Array<{ ts?: number | string; value?: unknown }>) {
  const sorted = [...series].sort((a, b) => Number(b?.ts || 0) - Number(a?.ts || 0));

  for (const item of sorted) {
    const distanceM = extractDistanceMeters(item?.value);
    if (typeof distanceM === "number") {
      return { item, distanceM };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const token = await publicLogin();
    const series = await fetchPayloadSeries(token);
    const found = findLatestDistanceReading(series);

    if (!found) {
      return new Response(JSON.stringify({
        ok: false,
        source: "HidroSens/UFPel ThingsBoard",
        station_id: "lagoa_patos_pelotas",
        name: "Pelotas / Laranjal",
        error: `Nenhum payload com Distance encontrado nas últimas ${LOOKBACK_HOURS}h`,
        samples_checked: series.length,
        latest_raw: series[0] || null,
        fetched_at: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const latest = found.item;
    const distanceM = found.distanceM;
    const measuredAtMs = Number(latest.ts);
    const measuredAt = new Date(measuredAtMs).toISOString();
    const ageMinutes = Math.round((Date.now() - measuredAtMs) / 60000);

    const levelM = Number(Math.max(0, SENSOR_HEIGHT_M - distanceM).toFixed(2));
    const status = classifyLaranjal(levelM, ageMinutes);
    const stale = ageMinutes > MAX_OPERATIONAL_AGE_MINUTES;

    return new Response(JSON.stringify({
      ok: true,
      source: "HidroSens/UFPel ThingsBoard",
      source_url: "https://wp.ufpel.edu.br/hidrosens/",
      dashboard_url: "https://tb.labhidrosens.com/dashboard/97ec9a60-d9e1-11f0-ac7c-456d9a25fe9a?publicId=0a869e80-d9e8-11f0-ac7c-456d9a25fe9a",
      station_id: "lagoa_patos_pelotas",
      name: "Pelotas / Laranjal",
      device_id: LARANJAL_DEVICE_ID,
      measured_at: measuredAt,
      age_minutes: ageMinutes,
      stale,
      operational: !stale,
      raw_payload: latest.value,
      distance_m: distanceM,
      sensor_height_m: SENSOR_HEIGHT_M,
      level_m: levelM,
      level_cm: Number((levelM * 100).toFixed(1)),
      threshold_m: LARANJAL_ALERT_THRESHOLD_M,
      threshold_cm: Number((LARANJAL_ALERT_THRESHOLD_M * 100).toFixed(0)),
      critical_threshold_m: LARANJAL_CRITICAL_THRESHOLD_M,
      critical_threshold_cm: Number((LARANJAL_CRITICAL_THRESHOLD_M * 100).toFixed(0)),
      max_may_2024_m: LARANJAL_MAX_MAY_2024_M,
      max_may_2024_cm: Number((LARANJAL_MAX_MAY_2024_M * 100).toFixed(0)),
      status,
      samples_checked: series.length,
      note: stale
        ? `Leitura Distance encontrada, mas com ${ageMinutes}min. Exibida como referência; não aciona alerta automático.`
        : "Nível calculado conforme dashboard público HidroSens: nivel = 5.06 - Distance. Limiares adotados: alerta 1,20 m; inundação crítica 1,40 m. Máx. maio/2024 adotado: 2,40 m.",
      fetched_at: new Date().toISOString(),
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      source: "HidroSens/UFPel ThingsBoard",
      station_id: "lagoa_patos_pelotas",
      name: "Pelotas / Laranjal",
      error: error instanceof Error ? error.message : "Unknown error",
      fetched_at: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
