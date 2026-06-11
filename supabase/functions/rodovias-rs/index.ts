const TOMTOM_BASE_URL = "https://api.tomtom.com/traffic/services/5/incidentDetails";

const MONITORED_ROADS = [
  {
    id: "BR-116",
    trecho: "Porto Alegre → Pelotas",
    bbox: "-52.35,-31.78,-51.10,-29.95",
    keywords: ["116", "br-116", "br116"],
  },
  {
    id: "BR-101",
    trecho: "Região Metropolitana → Litoral Norte",
    bbox: "-51.30,-30.10,-49.90,-29.30",
    keywords: ["101", "br-101", "br101"],
  },
  {
    id: "BR-471",
    trecho: "Rio Grande → Santa Vitória do Palmar / Chuí",
    bbox: "-53.65,-33.85,-52.00,-31.90",
    keywords: ["471", "br-471", "br471"],
  },
];

const CATEGORY_LABELS: Record<number, string> = {
  0: "Desconhecido",
  1: "Acidente",
  2: "Névoa",
  3: "Risco na via",
  4: "Obras em andamento",
  5: "Via bloqueada",
  6: "Via bloqueada",
  7: "Via bloqueada",
  8: "Tráfego intenso",
  9: "Tráfego parado",
  10: "Via bloqueada",
  11: "Via bloqueada",
  14: "Via bloqueada",
};

const BLOCKING_CATEGORIES = new Set([5, 6, 7, 10, 11, 14]);

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
    trecho: from && to ? `${from} → ${to}` : from || to || road.trecho,
    descricao: event?.description || "",
    bloqueioTotal: BLOCKING_CATEGORIES.has(category),
    fonte: "TomTom Traffic",
    timestamp: new Date().toISOString(),
  };
}

async function fetchTomTomRoad(road: typeof MONITORED_ROADS[number], key: string) {
  const fields = "{incidents{type,properties{iconCategory,magnitudeOfDelay,events{description,code},from,to,roadNumbers,timeValidity}}}";
  const params = new URLSearchParams({
    key,
    bbox: road.bbox,
    fields,
    language: "pt-BR",
    categoryFilter: "0,1,2,3,4,5,6,7,8,9,10,11,14",
    timeValidityFilter: "present",
  });

  const response = await fetch(`${TOMTOM_BASE_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "SentinelaRS/1.0",
    },
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
      error: "TOMTOM_API_KEY não configurada",
      brs: MONITORED_ROADS.map((road) => ({ ...road, status: "erro", incidents: [], fontes: [] })),
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
    note: "Indicador complementar de tráfego. Não é aviso oficial de interdição; confirme bloqueios com DAER, PRF, CRBM/CPRv ou Defesa Civil.",
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
