const RAPID_INFO_URL =
  "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations-info/";
const RAPID_DETAIL_URL =
  "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/";
const RRM_DETAIL_URL =
  "https://riskandrecovery.emergency.copernicus.eu/api/public-activations/";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function getJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "SentinelaRS/1.0" },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function rapidActivation(item: any) {
  return {
    code: item.code,
    name: item.name,
    category: item.category,
    subCategory: item.subCategory,
    countries: Array.isArray(item.countries)
      ? item.countries.map((c: any) => typeof c === "string" ? c : c?.name).filter(Boolean)
      : [],
    eventTime: item.eventTime,
    activationTime: item.activationTime,
    lastUpdate: item.lastUpdate,
    closed: item.closed,
    n_aois: item.n_aois ?? item.aois?.length ?? 0,
    n_products: item.n_products ?? item.aois?.reduce((acc: number, a: any) => acc + (a.products?.length || 0), 0) ?? 0,
    viewerUrl: `https://mapping.emergency.copernicus.eu/activations/${item.code}`,
    reportLink: item.reportLink,
  };
}

function compactRapidDetail(raw: any) {
  const activation = raw?.results?.[0] || null;
  if (!activation) return null;

  return {
    ...rapidActivation(activation),
    stats: activation.stats || null,
    productsPath: activation.productsPath || null,
    aois: (activation.aois || []).map((a: any) => ({
      name: a.name,
      number: a.number,
      products: (a.products || []).map((p: any) => ({
        type: p.type,
        monitoring: p.monitoring,
        monitoringNumber: p.monitoringNumber,
        feasible: p.feasible,
        mapsCount: p.mapsCount,
        deliveryTime: p.version?.deliveryTime,
        statusCode: p.version?.statusCode,
        downloadPath: p.downloadPath || null,
        layers: (p.layers || []).map((l: any) => ({ name: l.name, format: l.format, json: l.json || null })),
      })),
    })),
  };
}

function compactRrmDetail(raw: any) {
  const activation = raw?.results?.[0] || null;
  if (!activation) return null;

  return {
    code: activation.code,
    name: activation.name,
    category: activation.category,
    countries: activation.countries || [],
    activationTime: activation.activationTime,
    eventTime: activation.eventTime,
    closed: activation.closed,
    viewerUrl: activation.viewerUrl,
    storyMapUrl: activation.storyMapUrl,
    dashboardUrl: activation.dashboardUrl,
    generalArcgisLayers: activation.GeneralArcGISRestAPILayers || [],
    products: (activation.products || []).map((p: any) => ({
      productName: p.productName,
      productAcronym: p.productAcronym,
      analysisName: p.analysisName,
      statusCode: p.statusCode,
      mapsCount: p.mapsCount,
      versionDelivery: p.versionDelivery,
      arcgisLayers: p.ProductArcGISRestAPILayers || [],
      aois: (p.linkedAois || []).map((a: any) => ({
        aoiNumber: a.aoiNumber,
        aoiName: a.aoiName,
        sqkm: a.sqkm,
      })),
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const infoUrl = new URL(RAPID_INFO_URL);
    infoUrl.searchParams.set("limit", "100");
    const rapidInfo = await getJson(infoUrl.toString());
    const recentBrazilFloods = (rapidInfo.results || [])
      .filter((item: any) => {
        const countries = Array.isArray(item.countries) ? item.countries : [];
        const hasBrazil = countries.some((c: any) => String(typeof c === "string" ? c : c?.name).toLowerCase() === "brazil");
        return hasBrazil && String(item.category || "").toLowerCase().includes("flood");
      })
      .map(rapidActivation)
      .slice(0, 8);

    const [emsr720Raw, emsn194Raw] = await Promise.all([
      getJson(`${RAPID_DETAIL_URL}?code=EMSR720`),
      getJson(`${RRM_DETAIL_URL}?code=EMSN194`),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      source: "Copernicus EMS Mapping public APIs",
      fetched_at: new Date().toISOString(),
      rapid_mapping: {
        source_url: RAPID_INFO_URL,
        recent_brazil_floods: recentBrazilFloods,
        rs_2024: compactRapidDetail(emsr720Raw),
      },
      risk_recovery: {
        source_url: RRM_DETAIL_URL,
        rs_2024: compactRrmDetail(emsn194Raw),
      },
      operational_use: "CEMS EMSR/EMSN é produto oficial pós-evento. No Sentinela-RS entra como camada de referência e resposta a desastre; não aciona alerta automático sozinho.",
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
      source: "Copernicus EMS Mapping public APIs",
      error: error instanceof Error ? error.message : String(error),
      fetched_at: new Date().toISOString(),
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
