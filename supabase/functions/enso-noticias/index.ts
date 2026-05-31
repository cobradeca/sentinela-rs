/**
 * enso-noticias v3
 * ECMWF: scraping homepage (sem RSS público)
 * Copernicus C3S: scraping climate.copernicus.eu/news
 * CPTEC/INPE: scraping enos.cptec.inpe.br (HTTP, sem SSL moderno)
 * Tradução: OpenRouter (OPENROUTER_API_KEY)
 * Cache: 6h
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const ENSO_PATTERNS = [
  /\bel\s*ni[nñ]o\b/i, /\bla\s*ni[nñ]a\b/i, /\benso\b/i,
  /\boni\b/i, /\bsst\b/i, /sea surface temp/i,
  /seasonal forecast/i, /previs[aã]o sazonal/i,
  /equatorial pacific/i, /pac[ií]fico equatorial/i,
  /climate outlook/i, /anomalia/i, /neutral conditions/i,
];

function isEnso(title: string, desc = "") {
  const t = `${title} ${desc}`;
  return ENSO_PATTERNS.some((p) => p.test(t));
}

function clean(s: string) {
  return s
    .replace("<!CDATA[", "").replace("]]>", "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

interface Item {
  id: string; source_id: string; source_name: string;
  title: string; description: string; link: string;
  image: string | null; pub_date: string | null; translated: boolean;
}

interface FeedResult {
  source_id: string; source_name: string; ok: boolean;
  http_status: number | null; count: number; error?: string; items: Item[];
}

// ── Tradução OpenRouter ───────────────────────────────────────────────────────

async function translateBatch(
  rows: Array<{ title: string; description: string }>,
  key: string,
): Promise<Array<{ title: string; description: string }>> {
  const payload = rows.map((r, i) =>
    `[${i}] TITULO: ${r.title}\nRESUMO: ${r.description.slice(0, 300)}`
  ).join("\n\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://cobradeca.github.io/sentinela-rs/",
      "X-Title": "Sentinela-RS",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "Traduza para português brasileiro técnico. Mantenha ENSO, El Niño, SST, IFS, AIFS. " +
            "Retorne SOMENTE JSON válido: array [{\"title\":string,\"description\":string}]. Sem markdown.",
        },
        { role: "user", content: payload },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || "[]")
    .replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length !== rows.length) throw new Error("invalid translation");
  return parsed;
}

async function applyTranslation(
  raw: Array<{ title: string; description: string; link: string; pub_date: string | null; image: string | null }>,
  sourceId: string, sourceName: string, lang: "pt" | "en", apiKey: string | null,
): Promise<FeedResult> {
  if (!raw.length) return { source_id: sourceId, source_name: sourceName, ok: true, http_status: 200, count: 0, items: [] };

  let titles = raw.map((r) => r.title);
  let descs  = raw.map((r) => r.description);
  let translated = lang === "pt";

  if (lang === "en" && apiKey) {
    try {
      const result = await translateBatch(raw.map((r) => ({ title: r.title, description: r.description })), apiKey);
      titles = result.map((r) => r.title);
      descs  = result.map((r) => r.description);
      translated = true;
    } catch { /* mantém original */ }
  }

  const items: Item[] = raw.map((r, i) => ({
    id: `${sourceId}_${btoa(encodeURIComponent(r.link || r.title)).slice(0, 40)}`,
    source_id: sourceId, source_name: sourceName,
    title: titles[i] || r.title,
    description: descs[i] || r.description,
    link: r.link, image: r.image, pub_date: r.pub_date, translated,
  }));

  return { source_id: sourceId, source_name: sourceName, ok: true, http_status: 200, count: items.length, items };
}

// ── ECMWF — scraping homepage ─────────────────────────────────────────────────

async function fetchEcmwf(apiKey: string | null): Promise<FeedResult> {
  const ID = "ecmwf", NAME = "ECMWF", HOME = "https://www.ecmwf.int/en/about/media-centre/news";
  try {
    const res = await fetch("https://www.ecmwf.int/", {
      headers: { "User-Agent": "Mozilla/5.0 SentinelaRS/3.0", "Accept": "text/html" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Extrai notícias da homepage: padrão <a href="/en/latest/...">Título</a>
    const re = /<a[^>]+href="(\/en\/[^"]+(?:news|article|story|blog)[^"]*)"[^>]*>([\s\S]{10,200}?)<\/a>/gi;
    const seen = new Set<string>();
    const raw: typeof [] & Array<{ title: string; description: string; link: string; pub_date: string | null; image: string | null }> = [];

    let m;
    while ((m = re.exec(html)) !== null && raw.length < 15) {
      const link  = `https://www.ecmwf.int${m[1]}`;
      const title = clean(m[2]);
      if (!title || title.length < 8 || seen.has(link)) continue;
      seen.add(link);
      if (isEnso(title)) raw.push({ title, description: "seasonal forecast climate pacific ENSO", link, pub_date: null, image: null });
    }

    // Se nenhum bateu filtro ENSO, pega as 5 primeiras e deixa tradução qualificar
    if (!raw.length) {
      const re2 = /<a[^>]+href="(\/en\/[^"]+(?:news|newsletter)[^"]*)"[^>]*>([\s\S]{10,150}?)<\/a>/gi;
      let m2; const tmp: typeof raw = [];
      while ((m2 = re2.exec(html)) !== null && tmp.length < 5) {
        const link = `https://www.ecmwf.int${m2[1]}`;
        const title = clean(m2[2]);
        if (title.length > 8 && !seen.has(link)) { seen.add(link); tmp.push({ title, description: "", link, pub_date: null, image: null }); }
      }
      raw.push(...tmp);
    }

    return applyTranslation(raw, ID, NAME, "en", apiKey);
  } catch (err) {
    return { source_id: ID, source_name: NAME, ok: false, http_status: null, count: 0, error: String(err instanceof Error ? err.message : err), items: [] };
  }
}

// ── Copernicus C3S — scraping climate.copernicus.eu ──────────────────────────

async function fetchCopernicus(apiKey: string | null): Promise<FeedResult> {
  const ID = "copernicus", NAME = "Copernicus C3S", HOME = "https://climate.copernicus.eu/";
  try {
    const res = await fetch("https://climate.copernicus.eu/climate-indicators/enso", {
      headers: { "User-Agent": "Mozilla/5.0 SentinelaRS/3.0", "Accept": "text/html" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const re = /<a[^>]+href="(https?:\/\/climate\.copernicus\.eu\/[^"]+)"[^>]*>([\s\S]{8,200}?)<\/a>/gi;
    const seen = new Set<string>();
    const raw: Array<{ title: string; description: string; link: string; pub_date: string | null; image: string | null }> = [];

    let m;
    while ((m = re.exec(html)) !== null && raw.length < 15) {
      const link  = m[1];
      const title = clean(m[2]);
      if (!title || title.length < 8 || seen.has(link)) continue;
      seen.add(link);
      raw.push({ title, description: "ENSO El Nino seasonal forecast Copernicus", link, pub_date: null, image: null });
    }

    // Fallback: homepage geral do Copernicus
    if (!raw.length) {
      raw.push({ title: "Monitoramento ENSO — Copernicus C3S", description: "Acompanhe o estado do El Niño pelo Copernicus Climate Change Service.", link: HOME, pub_date: null, image: null });
    }

    return applyTranslation(raw, ID, NAME, "en", apiKey);
  } catch (err) {
    return { source_id: ID, source_name: NAME, ok: false, http_status: null, count: 0, error: String(err instanceof Error ? err.message : err), items: [] };
  }
}

// ── CPTEC — scraping HTTP (sem SSL moderno) ───────────────────────────────────

async function fetchCptec(): Promise<FeedResult> {
  const ID = "cptec", NAME = "CPTEC/INPE", HOME = "http://enos.cptec.inpe.br/";
  try {
    // Tenta HTTPS primeiro, cai para HTTP
    let html = "";
    for (const url of ["https://enos.cptec.inpe.br/", "http://enos.cptec.inpe.br/"]) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 SentinelaRS/3.0", "Accept": "text/html" },
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) { html = await res.text(); break; }
      } catch { continue; }
    }

    if (!html) throw new Error("CPTEC ENOS inacessível");

    const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]{8,200}?)<\/a>/gi;
    const seen = new Set<string>();
    const raw: Array<{ title: string; description: string; link: string; pub_date: string | null; image: string | null }> = [];

    let m;
    while ((m = re.exec(html)) !== null && raw.length < 10) {
      const href  = m[1];
      const title = clean(m[2]);
      if (!title || title.length < 8 || seen.has(href)) continue;
      seen.add(href);
      if (!isEnso(title, "")) continue;
      const link = href.startsWith("http") ? href : `http://enos.cptec.inpe.br/${href.replace(/^\//, "")}`;
      raw.push({ title, description: "El Niño La Niña ENOS CPTEC/INPE monitoramento", link, pub_date: null, image: null });
    }

    if (!raw.length) {
      raw.push({
        title: "Monitoramento ENOS — CPTEC/INPE",
        description: "Boletins e análises sobre El Niño e La Niña no Pacífico Equatorial.",
        link: HOME, pub_date: null, image: null,
      });
    }

    return applyTranslation(raw, ID, NAME, "pt", null);
  } catch (err) {
    return { source_id: ID, source_name: NAME, ok: false, http_status: null, count: 0, error: String(err instanceof Error ? err.message : err), items: [] };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const apiKey = Deno.env.get("OPENROUTER_API_KEY") || null;

  const [r1, r2, r3] = await Promise.allSettled([fetchEcmwf(apiKey), fetchCopernicus(apiKey), fetchCptec()]);

  const results: FeedResult[] = [
    r1.status === "fulfilled" ? r1.value : { source_id: "ecmwf",      source_name: "ECMWF",          ok: false, http_status: null, count: 0, error: "falha", items: [] },
    r2.status === "fulfilled" ? r2.value : { source_id: "copernicus", source_name: "Copernicus C3S", ok: false, http_status: null, count: 0, error: "falha", items: [] },
    r3.status === "fulfilled" ? r3.value : { source_id: "cptec",      source_name: "CPTEC/INPE",     ok: false, http_status: null, count: 0, error: "falha", items: [] },
  ];

  const items = results.flatMap((r) => r.items)
    .sort((a, b) => new Date(b.pub_date || 0).getTime() - new Date(a.pub_date || 0).getTime())
    .slice(0, 40);

  return new Response(
    JSON.stringify({
      ok: true,
      fetched_at: new Date().toISOString(),
      translation: apiKey ? "openrouter" : "none",
      total: items.length,
      sources: results.map(({ items: _, ...s }) => s),
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
