const TOMTOM_BASE_URL = "https://api.tomtom.com/traffic/services/5/incidentDetails";

const MONITORED_ROADS = [
  {
    id: "BR-116",
    trecho: "Porto Alegre -> Pelotas",
    bboxes: [
      "-51.35,-30.25,-50.95,-29.85",
      "-51.65,-30.75,-51.25,-30.35",
      "-51.95,-31.25,-51.55,-30.85",
      "-52.35,-31.85,-51.95,-31.45",
    ],
    keywords: ["116", "br-116", "br116"],
  },
  {
    id: "BR-101",
    trecho: "Regiao Metropolitana -> Litoral Norte",
    bboxes: [
      "-51.25,-30.15,-50.85,-29.75",
      "-50.85,-30.05,-50.45,-29.65",
      "-50.45,-29.85,-50.05,-29.45",
      "-50.15,-29.65,-49.75,-29.25",
    ],
    keywords: ["101", "br-101", "br101"],
  },
  {
    id: "BR-471",
    trecho: "Rio Grande -> Santa Vitoria do Palmar / Chui",
    bboxes: [
      "-52.35,-32.25,-51.95,-31.85",
      "-52.75,-32.70,-52.35,-32.30",
      "-53.15,-33.10,-52.75,-32.70",
      "-53.55,-33.55,-53.15,-33.15",
      "-53.85,-33.90,-53.45,-33.50",
    ],
    keywords: ["471", "br-471", "br471"],
  },
];

const CATEGORY_LABELS: Record<number, string> = {
  0: "Desconhecido",
  1: "Acidente",
  2: "Nevoa",
  3: "Risco na via",
  4: "Obras em andamento",
  5: "Ponto de atencao",
  6: "Trafego parado",
  7: "Ponto de atencao",
  8: "Trafego intenso",
  9: "Trafego parado",
  10: "Ponto de atencao",
  11: "Ponto de atencao",
  14: "Ponto de atencao",
};

const BLOCKING_CATEGORIES = new Set<number>();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getTomTomKey() {
  return Deno.env.get("TOMTOM_API_KEY") || Deno.env.get("TOMTOM_KEY") || "";
}

function normalizeIncident(road: typeof MONITORED_ROADS[number], incident: any) {
  const properties = incident?.properties || {};
  const category = Number(properties.iconCategory ?? 0);
  const severity = Number(properties.magnitudeOfDelay ?? 0);
  const event = Array.isArray(properties.events) ? properties.events[0] : null;
  const from = properties.from || "";
  const to = properties.to || "";

  return {
    br: road.id,
    tipo: CATEGORY_LABELS[category] || "Incidente",
    categoria: category,
    severidade: Number.isFinite(severity) ? severity : 0,
    de: from,
    ate: to,
    trecho: from && to ? `${from} -> ${to}` : from || to || road.trecho,
    descricao: event?.description || "",
    bloqueioTotal: false,
    pontoAtencao: true,
    fonte: "TomTom Traffic",
    timestamp: new Date().toISOString(),
  };
}

async function fetchTomTomBox(road: typeof MONITORED_ROADS[number], bbox: string, key: string) {
  const fields = "{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},from,to,roadNumbers,timeValidity}}}";
  const params = new URLSearchParams({
    key,
    bbox,
    fields,
    language: "pt-PT",
    categoryFilter: "0,1,2,3,4,5,6,7,8,9,10,11,14",
    timeValidityFilter: "present",
  });

  const response = await fetch(`${TOMTOM_BASE_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`TomTom HTTP ${response.status}`);
  }

  const data = await response.json();
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];
  return incidents
    .filter((incident: any) => {
      const properties = incident?.properties || {};
      const roads = Array.isArray(properties.roadNumbers) ? properties.roadNumbers : [];
      const combined = [...roads, properties.from, properties.to].map(normalize).join(" ");
      return road.keywords.some((keyword) => combined.includes(normalize(keyword)));
    })
    .map((incident: any) => normalizeIncident(road, incident));
}

async function fetchTomTomRoad(road: typeof MONITORED_ROADS[number], key: string) {
  const results = await Promise.allSettled(road.bboxes.map((bbox) => fetchTomTomBox(road, bbox, key)));
  const incidents = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const seen = new Set<string>();
  return incidents.filter((incident) => {
    const id = [incident.br, incident.categoria, incident.de, incident.ate, incident.descricao].join("|");
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
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
      source: "TomTom Traffic",
      error: "TOMTOM_API_KEY nao configurada",
      brs: MONITORED_ROADS.map((road) => ({ id: road.id, trecho: road.trecho, status: "erro", incidents: [], fontes: [] })),
      meta: { timestamp: new Date().toISOString(), tomtomOk: false },
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const results = await Promise.allSettled(MONITORED_ROADS.map((road) => fetchTomTomRoad(road, key)));
  const errors: Array<{ br: string; erro: string }> = [];

  const brs = MONITORED_ROADS.map((road, index) => {
    const result = results[index];
    const incidents = result.status === "fulfilled" ? result.value : [];
    if (result.status === "rejected") {
      errors.push({ br: road.id, erro: result.reason?.message || "falha ao consultar TomTom" });
    }

    const blocked = incidents.filter((incident) => incident.bloqueioTotal);
    const status = result.status === "rejected"
      ? "erro"
      : blocked.length > 0
        ? "bloqueado"
        : incidents.length > 0
          ? "incidente"
          : "livre";

    return {
      id: road.id,
      trecho: road.trecho,
      status,
      incidents,
      fontes: incidents.length ? ["TomTom Traffic"] : [],
    };
  });

  const allIncidents = brs.flatMap((road) => road.incidents);
  const blockedCount = allIncidents.filter((incident) => incident.bloqueioTotal).length;
  const incidentCount = allIncidents.length;
  const tomtomOk = errors.length < MONITORED_ROADS.length;

  return new Response(JSON.stringify({
    ok: tomtomOk,
    source: "TomTom Traffic",
    source_url: "https://developer.tomtom.com/traffic-api",
    note: "Indicador complementar de trafego. Nao e aviso oficial de interdicao; confirme bloqueios com DAER, PRF, CRBM/CPRv ou Defesa Civil.",
    fetched_at: new Date().toISOString(),
    brs,
    meta: {
      timestamp: new Date().toISOString(),
      tomtomOk,
      blockedCount,
      incidentCount,
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
