const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const PRODUCTS = [
  {
    id: "subsazonal_prec_week01",
    group: "subsazonal",
    title: "Precipitação — anomalia semana 1",
    variable: "prec",
    variableLabel: "Precipitação",
    period: "Semana 1",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/subsaz/web_cptec/bam12_subsazonal_prec_anomaly_week01.png",
  },
  {
    id: "subsazonal_prec_week02",
    group: "subsazonal",
    title: "Precipitação — anomalia semana 2",
    variable: "prec",
    variableLabel: "Precipitação",
    period: "Semana 2",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/subsaz/web_cptec/bam12_subsazonal_prec_anomaly_week02.png",
  },
  {
    id: "subsazonal_prec_week03",
    group: "subsazonal",
    title: "Precipitação — anomalia semana 3",
    variable: "prec",
    variableLabel: "Precipitação",
    period: "Semana 3",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/subsaz/web_cptec/bam12_subsazonal_prec_anomaly_week03.png",
  },
  {
    id: "subsazonal_prec_week04",
    group: "subsazonal",
    title: "Precipitação — anomalia semana 4",
    variable: "prec",
    variableLabel: "Precipitação",
    period: "Semana 4",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/subsaz/web_cptec/bam12_subsazonal_prec_anomaly_week04.png",
  },
  {
    id: "subsazonal_t2mt_week01",
    group: "subsazonal",
    title: "Temperatura 2m — anomalia semana 1",
    variable: "t2mt",
    variableLabel: "Temperatura 2m",
    period: "Semana 1",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/subsaz/web_cptec/bam12_subsazonal_t2mt_anomaly_week01.png",
  },
  {
    id: "subsazonal_t2mt_week02",
    group: "subsazonal",
    title: "Temperatura 2m — anomalia semana 2",
    variable: "t2mt",
    variableLabel: "Temperatura 2m",
    period: "Semana 2",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/subsaz/web_cptec/bam12_subsazonal_t2mt_anomaly_week02.png",
  },
  {
    id: "subsazonal_t2mt_week03",
    group: "subsazonal",
    title: "Temperatura 2m — anomalia semana 3",
    variable: "t2mt",
    variableLabel: "Temperatura 2m",
    period: "Semana 3",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/subsaz/web_cptec/bam12_subsazonal_t2mt_anomaly_week03.png",
  },
  {
    id: "subsazonal_t2mt_week04",
    group: "subsazonal",
    title: "Temperatura 2m — anomalia semana 4",
    variable: "t2mt",
    variableLabel: "Temperatura 2m",
    period: "Semana 4",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/subsaz/web_cptec/bam12_subsazonal_t2mt_anomaly_week04.png",
  },
  {
    id: "sazonal_prec_seas01",
    group: "sazonal",
    title: "Precipitação — anomalia sazonal 1",
    variable: "prec",
    variableLabel: "Precipitação",
    period: "Sazonal 1",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/clima/modelos/web_cptec/bam12_clima_prec_anomaly_seas01.png",
  },
  {
    id: "sazonal_prec_seas02",
    group: "sazonal",
    title: "Precipitação — anomalia sazonal 2",
    variable: "prec",
    variableLabel: "Precipitação",
    period: "Sazonal 2",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/clima/modelos/web_cptec/bam12_clima_prec_anomaly_seas02.png",
  },
  {
    id: "sazonal_t2mt_seas01",
    group: "sazonal",
    title: "Temperatura 2m — anomalia sazonal 1",
    variable: "t2mt",
    variableLabel: "Temperatura 2m",
    period: "Sazonal 1",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/clima/modelos/web_cptec/bam12_clima_t2mt_anomaly_seas01.png",
  },
  {
    id: "sazonal_t2mt_seas02",
    group: "sazonal",
    title: "Temperatura 2m — anomalia sazonal 2",
    variable: "t2mt",
    variableLabel: "Temperatura 2m",
    period: "Sazonal 2",
    kind: "anomalia",
    url: "https://s0.cptec.inpe.br/clima/modelos/web_cptec/bam12_clima_t2mt_anomaly_seas02.png",
  },
];

async function checkProduct(product: any) {
  try {
    const res = await fetch(product.url, {
      method: "GET",
      headers: {
        "User-Agent": "SentinelaRS/1.0",
        "Accept": "image/png,image/*,*/*",
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const contentLength = Number(res.headers.get("content-length") || 0);

    return {
      ...product,
      ok: res.ok && contentType.includes("image"),
      status: res.status,
      contentType,
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
      checked_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...product,
      ok: false,
      status: null,
      contentType: null,
      contentLength: null,
      error: error instanceof Error ? error.message : "Unknown error",
      checked_at: new Date().toISOString(),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const url = new URL(req.url);
  const group = url.searchParams.get("group");

  const selected = group
    ? PRODUCTS.filter((product) => product.group === group)
    : PRODUCTS;

  const products = await Promise.all(selected.map(checkProduct));
  const available = products.filter((product) => product.ok).length;

  return new Response(JSON.stringify({
    ok: available > 0,
    source: "CPTEC/INPE",
    mode: "official_product_images",
    dynamic: true,
    fetched_at: new Date().toISOString(),
    source_pages: {
      sazonal: "https://sazonal.cptec.inpe.br/",
      subsazonal: "https://subsazonal.cptec.inpe.br/",
      numeric: "https://previsaonumerica.cptec.inpe.br/",
    },
    note: "Produtos oficiais CPTEC/INPE em imagem PNG. Não são série numérica JSON; são produtos gráficos atualizados pelo CPTEC.",
    available,
    total: products.length,
    products,
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=21600, stale-while-revalidate=21600",
    },
  });
});
