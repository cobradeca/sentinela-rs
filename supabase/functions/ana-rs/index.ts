const ANA_BASE_URL = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateBR(date: Date): string {
  // Usa UTC como aproximação estável para montar dd/mm/aaaa.
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

function buildDateRange(daysBack = 3) {
  const end = new Date();
  const start = new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000);

  return {
    dataInicio: formatDateBR(start),
    dataFim: formatDateBR(end),
  };
}

function cleanTag(value: string | undefined): string | null {
  if (!value) return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean || null;
}

function extractRecords(xml: string) {
  const blocks = xml.match(/<DadosHidrometereologicos[\s\S]*?<\/DadosHidrometereologicos>/gi) || [];

  return blocks.map((block) => {
    const codEstacao = cleanTag(block.match(/<CodEstacao>([\s\S]*?)<\/CodEstacao>/i)?.[1]);
    const dataHora = cleanTag(block.match(/<DataHora>([\s\S]*?)<\/DataHora>/i)?.[1]);
    const nivelRaw = cleanTag(block.match(/<Nivel>([\s\S]*?)<\/Nivel>/i)?.[1]);
    const cotaRaw = cleanTag(block.match(/<Cota>([\s\S]*?)<\/Cota>/i)?.[1]);
    const chuvaRaw = cleanTag(block.match(/<Chuva>([\s\S]*?)<\/Chuva>/i)?.[1]);

    const levelCm = Number(nivelRaw ?? cotaRaw);
    const rainMm = chuvaRaw === null ? null : Number(chuvaRaw);

    return {
      codEstacao,
      dataHora,
      level_cm: Number.isFinite(levelCm) ? levelCm : null,
      level_m: Number.isFinite(levelCm) ? levelCm / 100 : null,
      rain_mm: Number.isFinite(rainMm) ? rainMm : null,
    };
  }).filter((record) => record.dataHora && record.level_m !== null);
}

function extractError(xml: string): string | null {
  return cleanTag(xml.match(/<Error>([\s\S]*?)<\/Error>/i)?.[1]);
}

async function fetchAnaStation(codEstacao: string) {
  const { dataInicio, dataFim } = buildDateRange(3);
  const url = `${ANA_BASE_URL}?codEstacao=${encodeURIComponent(codEstacao)}&DataInicio=${encodeURIComponent(dataInicio)}&DataFim=${encodeURIComponent(dataFim)}`;

  const response = await fetch(url, {
    headers: {
      "Accept": "application/xml,text/xml,*/*",
      "User-Agent": "SentinelaRS/1.0",
    },
  });

  const xml = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      source: "ANA HidroWeb",
      codEstacao,
      error: `ANA returned ${response.status}`,
      latest: null,
      records: [],
    };
  }

  const records = extractRecords(xml);
  const latest = records[0] || null;

  if (!latest) {
    return {
      ok: false,
      source: "ANA HidroWeb",
      codEstacao,
      error: extractError(xml) || "Sem dado de nível no período consultado",
      dataInicio,
      dataFim,
      latest: null,
      records: [],
    };
  }

  return {
    ok: true,
    source: "ANA HidroWeb",
    codEstacao,
    dataInicio,
    dataFim,
    latest,
    records,
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

  const url = new URL(req.url);
  const codEstacao = url.searchParams.get("codEstacao");

  if (!codEstacao) {
    return new Response(JSON.stringify({
      ok: false,
      source: "ANA HidroWeb",
      error: "Parâmetro obrigatório: codEstacao",
      latest: null,
      records: [],
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const result = await fetchAnaStation(codEstacao);

    return new Response(JSON.stringify({
      ...result,
      fetched_at: new Date().toISOString(),
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      source: "ANA HidroWeb",
      codEstacao,
      error: error instanceof Error ? error.message : "Unknown error",
      latest: null,
      records: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
