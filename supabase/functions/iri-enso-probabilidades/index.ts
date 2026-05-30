const IRI_CURRENT_URL = "https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const MONTHS_EN = [
  ["January", "Jan", "Jan"],
  ["February", "Feb", "Fev"],
  ["March", "Mar", "Mar"],
  ["April", "Apr", "Abr"],
  ["May", "May", "Mai"],
  ["June", "Jun", "Jun"],
  ["July", "Jul", "Jul"],
  ["August", "Aug", "Ago"],
  ["September", "Sep", "Set"],
  ["October", "Oct", "Out"],
  ["November", "Nov", "Nov"],
  ["December", "Dec", "Dez"],
];

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;|&#8211;/g, "–")
    .replace(/&mdash;|&#8212;/g, "—")
    .replace(/&deg;/g, "°")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function monthIndexFromName(value: string | null) {
  if (!value) return -1;
  const v = value.toLowerCase();
  return MONTHS_EN.findIndex(([full, short]) =>
    full.toLowerCase().startsWith(v) || short.toLowerCase().startsWith(v)
  );
}

function makeSeasonLabels(startMonthIndex: number, startYear: number, count = 9) {
  const labels = [];

  for (let i = 0; i < count; i++) {
    const m1 = (startMonthIndex + i) % 12;
    const m3 = (startMonthIndex + i + 2) % 12;

    const startYearOffset = Math.floor((startMonthIndex + i) / 12);
    const endYearOffset = Math.floor((startMonthIndex + i + 2) / 12);
    const y1 = startYear + startYearOffset;
    const y3 = startYear + endYearOffset;

    const pt = `${MONTHS_EN[m1][2]}–${MONTHS_EN[m3][2]} ${y1 === y3 ? y1 : `${y1}/${String(y3).slice(2)}`}`;
    const code = `${MONTHS_EN[m1][1][0]}${MONTHS_EN[(m1 + 1) % 12][1][0]}${MONTHS_EN[m3][1][0]}`.toUpperCase();

    labels.push({ p: pt, code, start_month: m1 + 1, year: y1 });
  }

  return labels;
}

function parsePublished(text: string) {
  const published = text.match(/Published:\s*([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/i);
  if (!published) return null;

  const monthName = published[1];
  const monthIndex = monthIndexFromName(monthName);
  const day = Number(published[2]);
  const year = Number(published[3]);

  return {
    text: `${monthName} ${day}, ${year}`,
    monthName,
    monthIndex,
    day,
    year,
  };
}

function clampProbability(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseForecast(text: string) {
  const published = parsePublished(text);
  const startMonthIndex = published?.monthIndex ?? new Date().getUTCMonth();
  const startYear = published?.year ?? new Date().getUTCFullYear();

  const seasonLabels = makeSeasonLabels(startMonthIndex, startYear, 9);

  const peakMatch =
    text.match(/probabilities?\s+(?:peaking\s+at|reaching)\s+(\d{1,3})%\s+for\s+([A-Za-z]+)[–-]([A-Za-z]+)\s*\(?([A-Z]{3})?\)?\s+(\d{4})/i) ||
    text.match(/(\d{1,3})%\s+probability\s+to\s+El\s+Niño\s+during\s+([A-Za-z]+)[–-]([A-Za-z]+)\s+(\d{4})/i) ||
    text.match(/assigning\s+a\s+(\d{1,3})%\s+probability\s+to\s+El\s+Niño\s+during\s+([A-Za-z]+)[–-]([A-Za-z]+)\s+(\d{4})/i);

  const neutralMatch =
    text.match(/compared\s+to\s+(?:only\s+)?(\d{1,3})%\s+for\s+(?:continued\s+)?(?:ENSO[- ]neutral|neutrality)/i) ||
    text.match(/ENSO[- ]neutral\s+conditions\s+are\s+reduced\s+to\s+(?:a\s+mere\s+)?(\d{1,3})[–-](\d{1,3})%/i);

  const rangeMatch =
    text.match(/remaining[^.]{0,160}?(\d{1,3})[–-](\d{1,3})%\s+(?:range|throughout|through)/i) ||
    text.match(/probabilities[^.]{0,160}?(\d{1,3})[–-](\d{1,3})%\s+throughout/i);

  const laninaZero = /La Niña[^.]{0,80}(?:effectively\s+zero|zero|0%)/i.test(text);

  const peakElNino = clampProbability(Number(peakMatch?.[1] ?? 0));
  const firstNeutral = neutralMatch
    ? clampProbability(Number(neutralMatch[1]))
    : (peakElNino ? 100 - peakElNino : null);

  const restElNino = rangeMatch
    ? clampProbability(Number(rangeMatch[1]))
    : (peakElNino || null);

  if (!peakElNino) {
    throw new Error("Não foi possível extrair probabilidades ENSO do texto do IRI.");
  }

  const forecast = seasonLabels.map((season, index) => {
    const en = index === 0 ? peakElNino : (restElNino ?? peakElNino);
    const ln = laninaZero ? 0 : 0;
    const nu = Math.max(0, 100 - en - ln);

    return {
      p: season.p,
      code: season.code,
      en: en / 100,
      nu: nu / 100,
      ln: ln / 100,
      en_pct: en,
      neutral_pct: nu,
      la_nina_pct: ln,
    };
  });

  return {
    published,
    peak: {
      elNinoPct: peakElNino,
      neutralPct: firstNeutral,
      laNinaPct: laninaZero ? 0 : null,
    },
    forecast,
    confidence: "parsed_from_iri_text",
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

  try {
    const response = await fetch(IRI_CURRENT_URL, {
      headers: {
        "Accept": "text/html,*/*",
        "User-Agent": "SentinelaRS/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`IRI returned ${response.status}`);
    }

    const html = await response.text();
    const text = stripHtml(html);
    const parsed = parseForecast(text);

    const first = parsed.forecast[0];

    return new Response(JSON.stringify({
      ok: true,
      source: "IRI/CCSR ENSO Forecast",
      source_url: IRI_CURRENT_URL,
      mode: "forecast_probabilities",
      fetched_at: new Date().toISOString(),
      referenceDate: parsed.published?.text ?? null,
      dynamic: true,
      parsing: parsed.confidence,
      prob: {
        elNino: first.en,
        neutral: first.nu,
        laNina: first.ln,
      },
      forecast: parsed.forecast.map(({ p, en, nu, ln }) => ({ p, en, nu, ln })),
      raw: {
        published: parsed.published,
        peak: parsed.peak,
        note: "Probabilidades extraídas do texto público do IRI Quick Look. Quando o IRI publicar tabela estruturada acessível, trocar para parsing tabular.",
      },
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=21600, stale-while-revalidate=21600",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const isParseError = msg.includes("extrair") || msg.includes("probabilidades") || msg.includes("parse");
    return new Response(JSON.stringify({
      ok: false,
      source: "IRI/CCSR ENSO Forecast",
      error: msg,
      // Distingue erro de parsing (estrutura da página mudou) de erro de rede/HTTP
      error_type: isParseError ? "parse_failure" : "fetch_failure",
      // Instrução clara para o frontend exibir ao usuário
      ui_message: isParseError
        ? "O IRI/CCSR atualizou o formato da página de previsão ENSO. O parser precisa ser revisado. Fonte indisponível temporariamente."
        : "Não foi possível acessar o IRI/CCSR. Verifique a conexão ou tente novamente em alguns minutos.",
      fetched_at: new Date().toISOString(),
    }), {
      status: 200, // 200 para o frontend conseguir ler o payload de erro
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
});
