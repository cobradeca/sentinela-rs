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
};

const FEEDS: FeedSource[] = [
  {
    id: "noaa",
    name: "NOAA ENSO Blog",
    url: "https://content-drupal.climate.gov/feeds/news-features/enso.rss",
    lang: "en",
    homepage: "https://www.climate.gov/news-features/blogs/enso",
  },
  {
    id: "ecmwf",
    name: "ECMWF",
    url: null,
    lang: "en",
    homepage: "https://www.ecmwf.int/en/about/media-centre/news",
  },
  {
    id: "copernicus",
    name: "Copernicus",
    url: "https://www.copernicus.eu/news/rss",
    lang: "en",
    homepage: "https://climate.copernicus.eu/",
  },
  {
    id: "cptec",
    name: "CPTEC/INPE",
    url: null,
    lang: "pt",
    homepage: "https://enos.cptec.inpe.br/",
  },
];

const ENSO_PATTERNS = [
  /\bel\s+ni[nñ]o\b/i,
  /\bla\s+ni[nñ]a\b/i,
  /\benso\b/i,
  /\bni[nñ]o\s*3\.4\b/i,
  /\boni\b/i,
  /\bsst\b/i,
  /sea surface temperature/i,
  /seasonal forecast/i,
  /previs[aã]o sazonal/i,
  /equatorial pacific/i,
  /pac[ií]fico equatorial/i,
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
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return blocks.slice(0, 40).map((item) => ({
    title: extractTag(item, "title") || "",
    link: extractTag(item, "link") || extractAttr(item, "link", "href") || "",
    description: extractTag(item, "description") || extractTag(item, "summary") || "",
    pub_date: extractTag(item, "pubDate") || extractTag(item, "dc:date") || extractTag(item, "updated"),
    image: extractAttr(item, "enclosure", "url") || extractAttr(item, "media:content", "url"),
  }));
}

async function translateItems(items: Array<{ title: string; description: string }>, apiKey: string) {
  if (!items.length) return [];
  const payload = items.map((item, index) => `[${index}] TITULO: ${item.title}\nRESUMO: ${item.description.slice(0, 320)}`).join("\n\n");
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
          content: "Traduza para português brasileiro técnico e claro. Retorne somente JSON válido: array de objetos {\"title\":string,\"description\":string}.",
        },
        { role: "user", content: payload },
      ],
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || "[]").replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("tradução inválida");
  return parsed;
}

async function fetchFeed(feed: FeedSource, apiKey: string | null) {
  try {
    if (!feed.url) throw new Error("feed RSS não verificado");

    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": "SentinelaRS/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rawItems = parseItems(await res.text()).filter((item) => relevant(item.title, item.description));
    let titles = rawItems.map((item) => item.title);
    let descriptions = rawItems.map((item) => item.description.slice(0, 500));
    let translated = feed.lang === "pt";

    if (feed.lang === "en" && apiKey && rawItems.length) {
      try {
        const translatedItems = await translateItems(rawItems.map((item) => ({ title: item.title, description: item.description })), apiKey);
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

    return { source_id: feed.id, source_name: feed.name, ok: true, items };
  } catch (error) {
    return {
      source_id: feed.id,
      source_name: feed.name,
      ok: false,
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
  const results = settled.map((entry, index) => entry.status === "fulfilled"
    ? entry.value
    : { source_id: FEEDS[index].id, source_name: FEEDS[index].name, ok: false, error: "falha", items: [] });

  const items = results
    .flatMap((result) => result.items)
    .sort((a, b) => new Date(b.pub_date || 0).getTime() - new Date(a.pub_date || 0).getTime())
    .slice(0, 40);

  return new Response(JSON.stringify({
    ok: true,
    fetched_at: new Date().toISOString(),
    translation: apiKey ? "openrouter" : "none",
    total: items.length,
    sources: results.map((result) => ({
      id: result.source_id,
      name: result.source_name,
      ok: result.ok,
      count: result.items.length,
      error: result.error || null,
    })),
    items,
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=21600, stale-while-revalidate=3600",
    },
  });
});
