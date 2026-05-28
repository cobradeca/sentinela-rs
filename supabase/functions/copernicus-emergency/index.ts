const CEMS_PUBLIC_ACTIVATIONS_URL =
  "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations-info/";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function textIncludes(value: unknown, needle: string) {
  return String(value || "").toLowerCase().includes(needle.toLowerCase());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const country = url.searchParams.get("country") || "Brazil";
  const query = url.searchParams.get("q") || "Rio Grande do Sul";
  const limit = Number(url.searchParams.get("limit") || 50);

  try {
    const upstream = new URL(CEMS_PUBLIC_ACTIVATIONS_URL);
    upstream.searchParams.set("limit", String(Math.max(1, Math.min(limit, 100))));

    const response = await fetch(upstream, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SentinelaRS/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`CEMS returned ${response.status}`);
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const filtered = results.filter((item: any) => {
      const countries = Array.isArray(item.countries) ? item.countries : [];
      const inCountry = countries.some((c: string) => textIncludes(c, country));
      const inQuery =
        textIncludes(item.name, query) ||
        textIncludes(item.centroid, query) ||
        textIncludes(item.category, "Flood") ||
        textIncludes(item.category, "Storm");
      return inCountry && inQuery;
    });

    return new Response(JSON.stringify({
      ok: true,
      source: "Copernicus EMS Rapid Mapping public activations API",
      source_url: CEMS_PUBLIC_ACTIVATIONS_URL,
      fetched_at: new Date().toISOString(),
      country,
      query,
      count: filtered.length,
      activations: filtered.map((item: any) => ({
        code: item.code,
        name: item.name,
        category: item.category,
        countries: item.countries,
        event_time: item.eventTime,
        activation_time: item.activationTime,
        last_update: item.lastUpdate,
        closed: item.closed,
        n_aois: item.n_aois,
        n_products: item.n_products,
      })),
      operational_use: "Produtos pós-evento sob demanda. Não aciona alerta automático sozinho.",
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=21600, stale-while-revalidate=21600",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      source: "Copernicus EMS Rapid Mapping public activations API",
      error: error instanceof Error ? error.message : String(error),
      fetched_at: new Date().toISOString(),
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
