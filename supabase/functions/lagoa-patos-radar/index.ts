const RADAR_BASE_URL = "https://api-medidas-porto-7bni.onrender.com";

const SENSOR_CONFIG = [
  {
    sensor_id: "sensor_1",
    station_id: "lagoa_rio_grande",
    name: "Rio Grande / FURG CCMAR",
    region: "Rio Grande",
    flood_threshold_cm: 80,
    max_may_2024_cm: 218,
    source_label: "Monitoramento da Lagoa dos Patos — sensores RADAR",
  },
  {
    sensor_id: "sensor_2",
    station_id: "lagoa_sao_lourenco",
    name: "São Lourenço do Sul",
    region: "São Lourenço do Sul",
    flood_threshold_cm: 148,
    max_may_2024_cm: 284,
    source_label: "Monitoramento da Lagoa dos Patos — sensores RADAR",
  },
  {
    sensor_id: "sensor_3",
    station_id: "lagoa_patos_arambare",
    name: "Arambaré",
    region: "Arambaré",
    flood_threshold_cm: 225,
    max_may_2024_cm: 286,
    source_label: "Monitoramento da Lagoa dos Patos — sensores RADAR",
  },
  {
    sensor_id: "sensor_4",
    station_id: "lagoa_sao_jose_norte",
    name: "São José do Norte",
    region: "São José do Norte",
    flood_threshold_cm: 108,
    max_may_2024_cm: 226,
    source_label: "Monitoramento da Lagoa dos Patos — sensores RADAR",
  },
  {
    sensor_id: "sensor_5",
    station_id: "lagoa_patos_poa",
    name: "Itapuã",
    region: "Itapuã / norte da Lagoa",
    flood_threshold_cm: 280,
    max_may_2024_cm: 318,
    source_label: "Monitoramento da Lagoa dos Patos — sensores RADAR",
  },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function classifyLevel(valueCm: number | null, thresholdCm: number | null) {
  if (typeof valueCm !== "number" || typeof thresholdCm !== "number") {
    return "SEM_LIMIAR";
  }

  if (valueCm >= thresholdCm) return "ALERTA";
  if (valueCm >= thresholdCm * 0.85) return "ATENCAO";
  return "NORMAL";
}

async function fetchSensor(sensor: typeof SENSOR_CONFIG[number]) {
  try {
    const response = await fetch(`${RADAR_BASE_URL}/dados/${sensor.sensor_id}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "SentinelaRS/1.0",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        ...sensor,
        error: `Radar API returned ${response.status}`,
        raw: text.slice(0, 300),
      };
    }

    const payload = JSON.parse(text);
    const dado = payload?.dado || null;
    const valueCm = typeof dado?.valor === "number" ? dado.valor : Number(dado?.valor);

    if (!dado || !Number.isFinite(valueCm)) {
      return {
        ok: false,
        ...sensor,
        error: "Payload sem dado.valor numérico",
        raw: payload,
      };
    }

    return {
      ok: true,
      ...sensor,
      measured_at: dado.data_hora || null,
      received_at: dado.criado_em || null,
      level_cm: valueCm,
      level_m: valueCm / 100,
      threshold_cm: sensor.flood_threshold_cm,
      threshold_m: sensor.flood_threshold_cm / 100,
      max_may_2024_m: sensor.max_may_2024_cm / 100,
      status: classifyLevel(valueCm, sensor.flood_threshold_cm),
    };
  } catch (error) {
    return {
      ok: false,
      ...sensor,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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
    const sensors = await Promise.all(SENSOR_CONFIG.map(fetchSensor));
    const valid = sensors.filter((s) => s.ok);

    return new Response(JSON.stringify({
      ok: true,
      source: "Monitoramento da Lagoa dos Patos",
      source_url: "https://monitoramentolagoadospatos.com.br/",
      upstream_api: RADAR_BASE_URL,
      note: "Dados dos linígrafos/sensores RADAR da Lagoa dos Patos. Valores em centímetros convertidos para metros.",
      mode: "radar_level_sensors",
      fetched_at: new Date().toISOString(),
      count: valid.length,
      sensors,
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
      source: "Monitoramento da Lagoa dos Patos",
      error: error instanceof Error ? error.message : "Unknown error",
      sensors: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
