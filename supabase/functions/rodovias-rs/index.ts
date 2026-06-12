const TOMTOM_ROUTING_BASE_URL = "https://api.tomtom.com/routing/1/calculateRoute";

const MONITORED_ROADS = [
  {
    id: "BR-116",
    trecho: "Porto Alegre -> Pelotas",
    origem: { nome: "Porto Alegre", coord: "-30.0346,-51.2177" },
    destino: { nome: "Pelotas", coord: "-31.7654,-52.3376" },
  },
  {
    id: "BR-101",
    trecho: "Osorio -> Torres",
    origem: { nome: "Osorio", coord: "-29.8869,-50.2700" },
    destino: { nome: "Torres", coord: "-29.3352,-49.7268" },
  },
  {
    id: "BR-471",
    trecho: "Rio Grande -> Santa Vitoria do Palmar",
    origem: { nome: "Rio Grande", coord: "-32.0350,-52.0986" },
    destino: { nome: "Santa Vitoria do Palmar", coord: "-33.5187,-53.3681" },
  },
];

const SLOWDOWN_THRESHOLD_RATIO = 0.20;
const SLOWDOWN_THRESHOLD_MIN_SECONDS = 180;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function getTomTomKey() {
  return Deno.env.get("TOMTOM_API_KEY") || Deno.env.get("TOMTOM_KEY") || "";
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
}

async function fetchRouteTravelTimes(road: typeof MONITORED_ROADS[number], key: string) {
  const url = `${TOMTOM_ROUTING_BASE_URL}/${road.origem.coord}:${road.destino.coord}/json`;
  const params = new URLSearchParams({
    key,
    routeType: "fastest",
    traffic: "true",
    travelMode: "car",
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`TomTom Routing HTTP ${response.status}`);
  }

  const data = await response.json();
  const summary = data?.routes?.[0]?.summary;
  if (!summary || typeof summary.travelTimeInSeconds !== "number") {
    throw new Error("Resposta TomTom Routing sem summary valido");
  }

  const travelTimeInSeconds = summary.travelTimeInSeconds;
  const noTrafficTravelTimeInSeconds =
    typeof summary.noTrafficTravelTimeInSeconds === "number"
      ? summary.noTrafficTravelTimeInSeconds
      : travelTimeInSeconds;
  const trafficDelayInSeconds =
    typeof summary.trafficDelayInSeconds === "number"
      ? summary.trafficDelayInSeconds
      : Math.max(0, travelTimeInSeconds - noTrafficTravelTimeInSeconds);

  return {
    travelTimeInSeconds,
    noTrafficTravelTimeInSeconds,
    trafficDelayInSeconds,
    lengthInMeters: typeof summary.lengthInMeters === "number" ? summary.lengthInMeters : null,
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

  const key = getTomTomKey();
  if (!key) {
    return new Response(JSON.stringify({
      ok: false,
      source: "TomTom Routing",
      error: "TOMTOM_API_KEY nao configurada",
      brs: MONITORED_ROADS.map((road) => ({
        id: road.id,
        trecho: road.trecho,
        status: "erro",
        detalhe: "Fonte indisponivel",
        fontes: [],
      })),
      meta: { timestamp: new Date().toISOString(), tomtomOk: false },
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const results = await Promise.allSettled(MONITORED_ROADS.map((road) => fetchRouteTravelTimes(road, key)));
  const errors: Array<{ br: string; erro: string }> = [];

  const brs = MONITORED_ROADS.map((road, index) => {
    const result = results[index];

    if (result.status === "rejected") {
      errors.push({ br: road.id, erro: result.reason?.message || "falha ao consultar TomTom Routing" });
      return {
        id: road.id,
        trecho: road.trecho,
        status: "erro",
        detalhe: "Fonte indisponivel",
        fontes: [],
      };
    }

    const { travelTimeInSeconds, noTrafficTravelTimeInSeconds, trafficDelayInSeconds } = result.value;
    const ratio = noTrafficTravelTimeInSeconds > 0 ? trafficDelayInSeconds / noTrafficTravelTimeInSeconds : 0;
    const isSlow = trafficDelayInSeconds >= SLOWDOWN_THRESHOLD_MIN_SECONDS && ratio >= SLOWDOWN_THRESHOLD_RATIO;

    const status = isSlow ? "Lentidao" : "Transito normal";
    const detalhe = isSlow
      ? `${road.origem.nome} -> ${road.destino.nome}: ${formatDuration(travelTimeInSeconds)} (+${formatDuration(trafficDelayInSeconds)} sobre o normal)`
      : `Tempo de viagem ${road.origem.nome} -> ${road.destino.nome}: ${formatDuration(travelTimeInSeconds)}, dentro do esperado`;

    return {
      id: road.id,
      trecho: road.trecho,
      status,
      detalhe,
      travelTimeInSeconds,
      noTrafficTravelTimeInSeconds,
      trafficDelayInSeconds,
      fontes: ["TomTom Routing"],
    };
  });

  const tomtomOk = errors.length < MONITORED_ROADS.length;
  const slowCount = brs.filter((road) => road.status === "Lentidao").length;

  return new Response(JSON.stringify({
    ok: tomtomOk,
    source: "TomTom Routing",
    source_url: "https://developer.tomtom.com/routing-api",
    note: "Indicador de fluxo entre municipios monitorados, baseado em tempo de viagem real vs. fluxo livre. Nao e aviso oficial de interdicao; confirme bloqueios com DAER, PRF, CRBM/CPRv ou Defesa Civil.",
    fetched_at: new Date().toISOString(),
    brs,
    meta: {
      timestamp: new Date().toISOString(),
      tomtomOk,
      slowCount,
      errors,
    },
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
    },
  });
});
