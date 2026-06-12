const MONITORAMENTO_BASE_URL = "https://api-medidas-porto-7bni.onrender.com/dados";
const TB_BASE_URL = "https://tb.labhidrosens.com";
const HIDROSENS_PUBLIC_ID = "0a869e80-d9e8-11f0-ac7c-456d9a25fe9a";
const LARANJAL_DEVICE_ID = "a3e1d520-b438-11f0-ac7c-456d9a25fe9a";
const LARANJAL_SENSOR_HEIGHT_M = 5.06;
const LOOKBACK_DAYS = 7;
const PAGE_LIMIT_SAFETY = 80;

const MONITORAMENTO_SENSORS = [
  { sensorId: "sensor_1", stationId: "lagoa_rio_grande", name: "Rio Grande" },
  { sensorId: "sensor_2", stationId: "lagoa_sao_lourenco", name: "Sao Lourenco do Sul" },
  { sensorId: "sensor_3", stationId: "lagoa_patos_arambare", name: "Arambare" },
  { sensorId: "sensor_4", stationId: "lagoa_sao_jose_norte", name: "Sao Jose do Norte" },
  { sensorId: "sensor_5", stationId: "lagoa_patos_poa", name: "Itapua" },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function dayKeySaoPaulo(ts: number | string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ts));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function validLevelM(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const levelM = n > 10 ? n / 100 : n;
  if (levelM < 0 || levelM > 5) return null;
  return Number(levelM.toFixed(3));
}

function dailyFromSamples(samples: Array<{ ts: number; nivel: number }>) {
  const byDay = new Map<string, number[]>();
  for (const sample of samples) {
    const key = dayKeySaoPaulo(sample.ts);
    const arr = byDay.get(key) || [];
    arr.push(sample.nivel);
    byDay.set(key, arr);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-LOOKBACK_DAYS)
    .map(([date, values]) => ({
      date,
      t: `${date}T12:00:00.000Z`,
      mean_m: Number(mean(values).toFixed(3)),
      v: Number(mean(values).toFixed(3)),
      samples: values.length,
      min_m: Number(Math.min(...values).toFixed(3)),
      max_m: Number(Math.max(...values).toFixed(3)),
    }));
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "SentinelaRS/1.0" },
  });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return response.json();
}

async function fetchMonitoramentoSensor(sensor: typeof MONITORAMENTO_SENSORS[number], cutoffMs: number) {
  const samples: Array<{ ts: number; nivel: number }> = [];
  let page = 1;
  let totalPages = PAGE_LIMIT_SAFETY;

  while (page <= totalPages && page <= PAGE_LIMIT_SAFETY) {
    const url = `${MONITORAMENTO_BASE_URL}/${sensor.sensorId}/ultimos-dias?page=${page}`;
    const data = await fetchJson(url);
    const rows = Array.isArray(data?.dados) ? data.dados : [];

    if (Number.isFinite(Number(data?.total_paginas))) {
      totalPages = Math.min(Number(data.total_paginas), PAGE_LIMIT_SAFETY);
    }

    if (!rows.length) break;

    let oldestTsInPage = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      const ts = new Date(row?.data_hora || row?.criado_em || 0).getTime();
      if (!Number.isFinite(ts) || !ts) continue;
      oldestTsInPage = Math.min(oldestTsInPage, ts);
      if (ts < cutoffMs) continue;

      const levelM = validLevelM(row?.valor);
      if (levelM === null) continue;
      samples.push({ ts, nivel: levelM });
    }

    if (oldestTsInPage < cutoffMs) break;
    page += 1;
  }

  samples.sort((a, b) => a.ts - b.ts);
  const daily = dailyFromSamples(samples);
  return {
    ok: daily.length > 0,
    id: sensor.stationId,
    station_id: sensor.stationId,
    sensor_id: sensor.sensorId,
    name: sensor.name,
    source: "Monitoramento Lagoa dos Patos",
    pages_read: page,
    samples,
    daily,
  };
}

async function hidrosensLogin() {
  const response = await fetch(`${TB_BASE_URL}/api/auth/login/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "SentinelaRS/1.0" },
    body: JSON.stringify({ publicId: HIDROSENS_PUBLIC_ID }),
  });
  if (!response.ok) throw new Error(`ThingsBoard login HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.token) throw new Error("ThingsBoard login sem token");
  return data.token;
}

function extractDistanceMeters(value: unknown) {
  let text = "";
  try {
    text = typeof value === "string" ? value : JSON.stringify(value);
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        text = typeof parsed?.text === "string" ? parsed.text : JSON.stringify(parsed);
      } catch {
        // texto livre
      }
    }
  } catch {
    return null;
  }

  const match = text.match(/Distance[^\d]*([\d.]+)/i);
  if (!match?.[1]) return null;
  const distance = Number(match[1]);
  if (!Number.isFinite(distance) || distance < 0 || distance > LARANJAL_SENSOR_HEIGHT_M + 1) return null;
  return distance;
}

async function fetchHidrosensLaranjal(cutoffMs: number, endTs: number) {
  const token = await hidrosensLogin();
  const url = new URL(`${TB_BASE_URL}/api/plugins/telemetry/DEVICE/${LARANJAL_DEVICE_ID}/values/timeseries`);
  url.searchParams.set("keys", "payload");
  url.searchParams.set("startTs", String(cutoffMs));
  url.searchParams.set("endTs", String(endTs));
  url.searchParams.set("agg", "NONE");
  url.searchParams.set("limit", "50000");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Authorization": `Bearer ${token}`, "User-Agent": "SentinelaRS/1.0" },
  });
  if (!response.ok) throw new Error(`ThingsBoard telemetry HTTP ${response.status}`);

  const data = await response.json();
  const payload = Array.isArray(data?.payload) ? data.payload : [];
  const samples = payload
    .map((item) => {
      const ts = Number(item?.ts);
      const distance = extractDistanceMeters(item?.value);
      if (!Number.isFinite(ts) || distance === null) return null;
      const nivel = Number(Math.max(0, LARANJAL_SENSOR_HEIGHT_M - distance).toFixed(3));
      return { ts, nivel };
    })
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);

  const daily = dailyFromSamples(samples);
  return {
    ok: daily.length > 0,
    id: "lagoa_patos_pelotas",
    station_id: "lagoa_patos_pelotas",
    sensor_id: "hidrosens_laranjal",
    name: "Pelotas / Laranjal",
    source: "HidroSens/UFPel ThingsBoard",
    samples,
    daily,
  };
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

  const endTs = Date.now();
  const cutoffMs = endTs - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const tasks = [
    ...MONITORAMENTO_SENSORS.map((sensor) => fetchMonitoramentoSensor(sensor, cutoffMs)),
    fetchHidrosensLaranjal(cutoffMs, endTs),
  ];

  const settled = await Promise.allSettled(tasks);
  const stations = settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const fallback = [...MONITORAMENTO_SENSORS, { stationId: "lagoa_patos_pelotas", sensorId: "hidrosens_laranjal", name: "Pelotas / Laranjal" }][index];
    return {
      ok: false,
      id: fallback.stationId,
      station_id: fallback.stationId,
      sensor_id: fallback.sensorId,
      name: fallback.name,
      error: result.reason?.message || "falha ao buscar historico",
      samples: [],
      daily: [],
    };
  });

  const history = Object.fromEntries(
    stations.map((station) => [
      station.station_id,
      (station.daily || []).map((point) => ({ t: point.t, v: point.v, samples: point.samples })),
    ])
  );

  return new Response(JSON.stringify({
    ok: stations.some((station) => station.ok),
    source: "Monitoramento Lagoa dos Patos + HidroSens/UFPel",
    fetched_at: new Date().toISOString(),
    days: LOOKBACK_DAYS,
    cutoff_at: new Date(cutoffMs).toISOString(),
    stations,
    history,
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=900",
    },
  });
});
