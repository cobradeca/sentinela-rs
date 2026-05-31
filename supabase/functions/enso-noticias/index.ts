const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type FeedSource = {
  id: string;
  name: string;
  url: string | null;
  lang: "pt" | "en";
  homepage: string;
  // scraper especial ao invés de RSS
  scrape?: boolean;
};

const FEEDS: FeedSource[] = [
  {
    id: "ecmwf",
    name: "ECMWF",
    // Feed Atom oficial do ECMWF — retorna 200 OK com conteúdo público
    url: "https://www.ecmwf.int/en/rss/forecast-and-plans",
    lang: "en",
    homepage: "https://www.ecmwf.int/en/forecasts/charts/catalogue/enfo",
  },
  {
    id: "copernicus",
    name: "Copernicus C3S",
    url: "https://climate.copernicus.eu/api/news/rss.xml",
    lang: "en",
    homepage: "https://climate.copernicus.eu/climate-indicators/enso",
  },
  {
    id: "cptec",
    name: "CPTEC/INPE",
    // CPTEC não tem RSS público — usa scraping da página de ENOS
    url: "https://enos.cptec.inpe.br/",
    lang: "pt",
    scrape: true,
    homepage: "https://enos.cptec.inpe.br/",
  },
];

const ENSO_PATTERNS = [
  /\bel\s+ni[nñ]o\b/i,
  /\bla\s+ni[nñ]a\b/i,
  /\benso\b/i,
  /\beni[nñ]o\b/i,
  /\bni[nñ]o\s*3\.4\b/i,
  /\boni\b/i,
  /\bsst\b/i,
  /sea surface temperature/i,
  /seasonal forecast/i,
  /previs[aã]o sazonal/i,
  /equatorial pacific/i,
  /pac[ií]fico equatorial/i,
  /clima sazonal/i,
  /anomalia/i,
  /neutral conditions/i,
];

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? decodeEntities(match[1]) : null;
}

function extractAttr(xml: string, tag: string, attr: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, "i"));
  return match?.[1] || null;
}

function relevant(title: string, description: string) {
  const text = `${title} ${description}`;
  return ENSO_PATTERNS.some((pattern) => pattern.test(text));
}

function parseItems(xml: string) {
  // Suporte a RSS <item> e Atom <entry>
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ||
                 xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 40).map((item) => ({
    title: extractTag(item, "title") || "",
    link:
      extractTag(item, "link") ||
      extractAttr(item, "link", "href") ||
      item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "",
    description:
      extractTag(item, "description") ||
      extractTag(item, "summary") ||
      extractTag(item, "content") || "",
    pub_date:
      extractTag(item, "pubDate") ||
      extractTag(item, "dc:date") ||
      extractTag(item, "updated") ||
      extractTag(item, "published"),
    image:
      extractAttr(item, "enclosure", "url") ||
      extractAttr(item, "media:content", "url"),
  }));
}

// Scraper básico para CPTEC/INPE ENOS — extrai parágrafos com conteúdo ENSO
function scrapeCptec(html: string): Array<{ title: string; link: string; description: string; pub_date: string | null; image: null }> {
  // Extrai textos de <p> e <h2>/<h3> com conteúdo relevante
  const paragraphs: string[] = [];
  const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  for (const p of pMatches) {
    const text = decodeEntities(p).trim();
    if (text.length > 60 && ENSO_PATTERNS.some((re) => re.test(text))) {
      paragraphs.push(text.slice(0, 500));
    }
  }

  // Tenta extrair data de publicação da página
  const dateMatch = html.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  const pub_date = dateMatch
    ? new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`).toISOString()
    : new Date().toISOString();

  // Extrai título da página
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? decodeEntities(titleMatch[1]) : "CPTEC/INPE — Boletim ENOS";

  if (paragraphs.length === 0) return [];

  return [{
    title: pageTitle,
    link: "https://enos.cptec.inpe.br/",
    description: paragraphs.slice(0, 3).join(" | "),
    pub_date,
    image: null,
  }];
}

async function translateItems(items: Array<{ title: string; description: string }>, apiKey: string) {
  if (!items.length) return [];
  const payload = items
    .map((item, index) => `[${index}] TITULO: ${item.title}\nRESUMO: ${item.description.slice(0, 320)}`)
    .join("\n\n");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://cobradeca.github.io/sentinela-rs/",
      "X-Title": "Sentinela-RS",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENROUTER_TRANSLATION_MODEL") || "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Traduza para português brasileiro técnico e claro. Retorne somente JSON válido: array de objetos {\"title\":string,\"description\":string}.",
        },
        { role: "user", content: payload },
      ],
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || "[]")
    .replace(/```json|```/g, "")
    .trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("tradução inválida");
  return parsed;
}

async function fetchFeed(feed: FeedSource, apiKey: string | null) {
  try {
    if (!feed.url) throw new Error("URL não configurada");

    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": "SentinelaRS/2.0 (+https://cobradeca.github.io/sentinela-rs/)",
        "Accept": feed.scrape
          ? "text/html,application/xhtml+xml,*/*"
          : "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(14000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const body = await res.text();

    // ── scraping CPTEC ──────────────────────────────────────────────────────
    if (feed.scrape) {
      const rawItems = scrapeCptec(body);
      if (rawItems.length === 0) {
        return { source_id: feed.id, source_name: feed.name, ok: true, http_status: res.status, items: [] };
      }
      const items = rawItems.map((item) => ({
        id: `${feed.id}_${encodeURIComponent(item.link).slice(0, 60)}`,
        source_id: feed.id,
        source_name: feed.name,
        title: item.title,
        description: item.description,
        link: item.link,
        image: null,
        pub_date: item.pub_date,
        translated: true, // já em pt
        lang: "pt",
      }));
      return { source_id: feed.id, source_name: feed.name, ok: true, http_status: res.status, items };
    }

    // ── RSS / Atom ──────────────────────────────────────────────────────────
    const rawItems = parseItems(body).filter((item) => relevant(item.title, item.description));
    let titles = rawItems.map((item) => item.title);
    let descriptions = rawItems.map((item) => item.description.slice(0, 500));
    let translated = feed.lang === "pt";

    if (feed.lang === "en" && apiKey && rawItems.length) {
      try {
        const translatedItems = await translateItems(
          rawItems.map((item) => ({ title: item.title, description: item.description })),
          apiKey,
        );
        if (translatedItems.length === rawItems.length) {
          titles = translatedItems.map((item) => item.title || "");
          descriptions = translatedItems.map((item) => item.description || "");
          translated = true;
        }
      } catch {
        translated = false;
      }
    }

    const items = rawItems.map((item, index) => ({
      id: `${feed.id}_${encodeURIComponent(item.link || item.title).slice(0, 60)}`,
      source_id: feed.id,
      source_name: feed.name,
      title: titles[index] || item.title,
      description: descriptions[index] || item.description,
      link: item.link || feed.homepage,
      image: item.image,
      pub_date: item.pub_date,
      translated,
      lang: "pt",
    }));

    return { source_id: feed.id, source_name: feed.name, ok: true, http_status: res.status, items };
  } catch (error) {
    return {
      source_id: feed.id,
      source_name: feed.name,
      ok: false,
      http_status: null,
      error: error instanceof Error ? error.message : "falha",
      items: [],
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY") || null;
  const settled = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed, apiKey)));
  const results = settled.map((entry, index) =>
    entry.status === "fulfilled"
      ? entry.value
      : {
          source_id: FEEDS[index].id,
          source_name: FEEDS[index].name,
          ok: false,
          http_status: null,
          error: "falha interna",
          items: [],
        }
  );

  const items = results
    .flatMap((result) => result.items)
    .sort((a, b) => new Date(b.pub_date || 0).getTime() - new Date(a.pub_date || 0).getTime())
    .slice(0, 40);

  return new Response(
    JSON.stringify({
      ok: true,
      fetched_at: new Date().toISOString(),
      translation: apiKey ? "openrouter" : "none",
      total: items.length,
      sources: results.map((result) => ({
        id: result.source_id,
        name: result.source_name,
        ok: result.ok,
        http_status: result.http_status ?? null,
        count: result.items.length,
        error: result.error || null,
      })),
      items,
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=21600, stale-while-revalidate=3600",
      },
    },
  );
});
