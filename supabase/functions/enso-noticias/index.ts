/**
 * enso-noticias v4
 * ECMWF: scraping ecmwf.int/en/about/media-centre/news
 * Copernicus: scraping climate.copernicus.eu/seasonal-forecasts
 * CPTEC/INPE: scraping enos.cptec.inpe.br — só links textuais, sem .gif
 * Tradução: OpenRouter (OPENROUTER_API_KEY)
 * Cache: 6h
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const ENSO_RE = [
  /\bel\s*ni[nñ]o\b/i, /\bla\s*ni[nñ]a\b/i, /\benso\b/i, /\benos\b/i,
  /\boni\b/i, /\bsst\b/i, /sea surface temp/i, /seasonal forecast/i,
  /previs[aã]o sazonal/i, /equatorial pacific/i, /pac[ií]fico equatorial/i,
  /climate outlook/i, /anomalia/i, /neutral conditions/i, /tsm\b/i,
];

function isEnso(t: string, d = "") { return ENSO_RE.some((r) => r.test(t + " " + d)); }

function clean(s: string) {
  return s
    .replace("<!CDATA[", "").replace("]]>", "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&ccedil;/g, "ç").replace(/&Ccedil;/g, "Ç")
    .replace(/&atilde;/g, "ã").replace(/&Atilde;/g, "Ã")
    .replace(/&otilde;/g, "õ").replace(/&Otilde;/g, "Õ")
    .replace(/&eacute;/g, "é").replace(/&Eacute;/g, "É")
    .replace(/&iacute;/g, "í").replace(/&Iacute;/g, "Í")
    .replace(/&oacute;/g, "ó").replace(/&Oacute;/g, "Ó")
    .replace(/&aacute;/g, "á").replace(/&Aacute;/g, "Á")
    .replace(/&uacute;/g, "ú").replace(/&Uacute;/g, "Ú")
    .replace(/&ntilde;/g, "ñ").replace(/&Ntilde;/g, "Ñ")
    .replace(/&#\d+;/g, "").replace(/&[a-z]+;/gi, "")
    .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function uid(sourceId: string, link: string) {
  const key = sourceId + "_" + link.slice(-80);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return sourceId + "_" + Math.abs(h).toString(36);
}

interface Raw { title: string; description: string; link: string; pub_date: string | null; image: string | null }
interface Item { id: string; source_id: string; source_name: string; title: string; description: string; link: string; image: string | null; pub_date: string | null; translated: boolean }
interface Result { source_id: string; source_name: string; ok: boolean; http_status: number | null; count: number; error?: string; items: Item[] }

async function get(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 SentinelaRS/4.0", "Accept": "text/html,application/xml,*/*" },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

async function translateBatch(rows: Raw[], key: string): Promise<Array<{ title: string; description: string }>> {
  const payload = rows.map((r, i) => `[${i}] TITULO: ${r.title}\nRESUMO: ${r.description.slice(0, 280)}`).join("\n\n");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://cobradeca.github.io/sentinela-rs/",
      "X-Title": "Sentinela-RS",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini", temperature: 0,
      messages: [
        { role: "system", content: "Traduza para português brasileiro técnico. Mantenha ENSO, El Niño, SST, IFS. Retorne SOMENTE JSON: [{\"title\":string,\"description\":string}]. Sem markdown." },
        { role: "user", content: payload },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || "[]").replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length !== rows.length) throw new Error("bad translation");
  return parsed;
}

async function build(raw: Raw[], sid: string, sname: string, lang: "pt" | "en", key: string | null): Promise<Result> {
  if (!raw.length) return { source_id: sid, source_name: sname, ok: true, http_status: 200, count: 0, items: [] };
  let titles = raw.map((r) => r.title);
  let descs  = raw.map((r) => r.description);
  let translated = lang === "pt";
  if (lang === "en" && key) {
    try {
      const tr = await translateBatch(raw, key);
      titles = tr.map((t) => t.title || "");
      descs  = tr.map((t) => t.description || "");
      translated = true;
    } catch { /* usa original */ }
  }
  const items: Item[] = raw.map((r, i) => ({
    id: uid(sid, r.link || r.title),
    source_id: sid, source_name: sname,
    title: titles[i] || r.title,
    description: descs[i] || r.description,
    link: r.link, image: r.image, pub_date: r.pub_date, translated,
  }));
  return { source_id: sid, source_name: sname, ok: true, http_status: 200, count: items.length, items };
}

// ── ECMWF ─────────────────────────────────────────────────────────────────────

async function fetchEcmwf(key: string | null): Promise<Result> {
  const SID = "ecmwf", SNAME = "ECMWF";
  try {
    const html = await get("https://www.ecmwf.int/en/about/media-centre/news");
    const seen = new Set<string>();
    const raw: Raw[] = [];
    const re = /<a[^>]+href="(\/en\/[^"#?]+)"[^>]*>\s*([\s\S]{10,180}?)\s*<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null && raw.length < 12) {
      const href  = m[1];
      const title = clean(m[2]);
      if (title.length < 10 || seen.has(href) || /\.(css|js|png|gif|svg)/.test(href)) continue;
      seen.add(href);
      const link = "https://www.ecmwf.int" + href;
      if (isEnso(title)) raw.push({ title, description: "seasonal forecast climate pacific ENSO", link, pub_date: null, image: null });
    }
    // Fallback: 5 primeiras notícias mesmo sem match ENSO
    if (!raw.length) {
      const re2 = /<a[^>]+href="(\/en\/(?:about\/media-centre\/news|latest)[^"#?]+)"[^>]*>\s*([\s\S]{10,150}?)\s*<\/a>/gi;
      let m2;
      while ((m2 = re2.exec(html)) !== null && raw.length < 5) {
        const href = m2[1]; const title = clean(m2[2]);
        if (title.length < 10 || seen.has(href)) continue;
        seen.add(href);
        raw.push({ title, description: "ECMWF forecast climate", link: "https://www.ecmwf.int" + href, pub_date: null, image: null });
      }
    }
    return build(raw, SID, SNAME, "en", key);
  } catch (e) {
    return { source_id: SID, source_name: SNAME, ok: false, http_status: null, count: 0, error: String(e instanceof Error ? e.message : e), items: [] };
  }
}

// ── Copernicus ────────────────────────────────────────────────────────────────

async function fetchCopernicus(key: string | null): Promise<Result> {
  const SID = "copernicus", SNAME = "Copernicus C3S";
  const URLS = [
    "https://climate.copernicus.eu/seasonal-forecasts",
    "https://climate.copernicus.eu/climate-indicators",
    "https://www.copernicus.eu/en/news",
  ];
  try {
    let html = "";
    let status = 0;
    for (const url of URLS) {
      try { html = await get(url); status = 200; break; } catch { continue; }
    }
    if (!html) throw new Error("todas as URLs falharam");
    const seen = new Set<string>();
    const raw: Raw[] = [];
    const re = /<a[^>]+href="(https?:\/\/(?:climate\.copernicus\.eu|www\.copernicus\.eu)\/[^"#?]+)"[^>]*>\s*([\s\S]{8,180}?)\s*<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null && raw.length < 12) {
      const link = m[1]; const title = clean(m[2]);
      if (title.length < 8 || seen.has(link) || /\.(css|js|png|gif|svg)/.test(link)) continue;
      seen.add(link);
      if (isEnso(title)) raw.push({ title, description: "ENSO seasonal forecast Copernicus C3S", link, pub_date: null, image: null });
    }
    if (!raw.length) {
      raw.push({ title: "Previsões Sazonais — Copernicus C3S", description: "Acompanhe o monitoramento ENSO pelo Copernicus Climate Change Service.", link: "https://climate.copernicus.eu/seasonal-forecasts", pub_date: null, image: null });
    }
    return build(raw, SID, SNAME, "en", key);
  } catch (e) {
    return { source_id: SID, source_name: SNAME, ok: false, http_status: null, count: 0, error: String(e instanceof Error ? e.message : e), items: [] };
  }
}

// ── CPTEC ─────────────────────────────────────────────────────────────────────

async function fetchCptec(): Promise<Result> {
  const SID = "cptec", SNAME = "CPTEC/INPE";
  const HOME = "http://enos.cptec.inpe.br/";
  const IMG_RE = /\.(gif|jpg|jpeg|png|svg|bmp|webp)(\?.*)?$/i;
  try {
    let html = "";
    for (const url of ["https://enos.cptec.inpe.br/", "http://enos.cptec.inpe.br/"]) {
      try { html = await get(url); break; } catch { continue; }
    }
    if (!html) throw new Error("CPTEC inacessível");
    const seen = new Set<string>();
    const raw: Raw[] = [];
    const re = /<a[^>]+href="([^"]+)"[^>]*>\s*([\s\S]{8,200}?)\s*<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null && raw.length < 12) {
      const href = m[1]; const title = clean(m[2]);
      if (title.length < 8 || seen.has(href) || IMG_RE.test(href)) continue;
      seen.add(href);
      if (!isEnso(title)) continue;
      const link = href.startsWith("http") ? href : HOME + href.replace(/^\//, "");
      raw.push({ title, description: "El Niño La Niña ENOS CPTEC/INPE monitoramento", link, pub_date: null, image: null });
    }
    if (!raw.length) {
      raw.push({ title: "Monitoramento ENOS — CPTEC/INPE", description: "Boletins e análises sobre El Niño e La Niña no Pacífico Equatorial.", link: HOME, pub_date: null, image: null });
    }
    return build(raw, SID, SNAME, "pt", null);
  } catch (e) {
    return { source_id: SID, source_name: SNAME, ok: false, http_status: null, count: 0, error: String(e instanceof Error ? e.message : e), items: [] };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), { status: 405, headers: { ...CORS, "Content-Type": "application/json" } });

  const key = Deno.env.get("OPENROUTER_API_KEY") || null;
  const [r1, r2, r3] = await Promise.allSettled([fetchEcmwf(key), fetchCopernicus(key), fetchCptec()]);

  const err = (sid: string, sname: string): Result => ({ source_id: sid, source_name: sname, ok: false, http_status: null, count: 0, error: "falha inesperada", items: [] });
  const results: Result[] = [
    r1.status === "fulfilled" ? r1.value : err("ecmwf", "ECMWF"),
    r2.status === "fulfilled" ? r2.value : err("copernicus", "Copernicus C3S"),
    r3.status === "fulfilled" ? r3.value : err("cptec", "CPTEC/INPE"),
  ];

  const items = results.flatMap((r) => r.items)
    .sort((a, b) => new Date(b.pub_date || 0).getTime() - new Date(a.pub_date || 0).getTime())
    .slice(0, 40);

  return new Response(
    JSON.stringify({
      ok: true, fetched_at: new Date().toISOString(),
      translation: key ? "openrouter" : "none",
      total: items.length,
      sources: results.map(({ items: _, ...s }) => s),
      items,
    }),
    { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=21600, stale-while-revalidate=3600" } },
  );
});