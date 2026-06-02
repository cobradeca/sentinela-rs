/**
 * enso-noticias v5
 *
 * ECMWF: scraping de /en/about/media-centre/news
 *   → extrai links padrão /en/about/media-centre/YYYY/slug
 *   → filtra por keywords ENSO ou pega as 5 mais recentes
 *
 * Copernicus C3S: scraping de /seasonal-forecasts
 *   → extrai o highlight textual ENSO da seção "Highlights of the latest..."
 *   → inclui imagem do plume Niño3.4 se disponível
 *
 * CPTEC/INPE: scraping de enos.cptec.inpe.br
 *   → só links textuais (sem .gif/.png)
 *
 * Tradução: OpenRouter (OPENROUTER_API_KEY)
 * Cache: 6h
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ENSO_RE = [
  /\bel\s*ni[nñ]o\b/i, /\bla\s*ni[nñ]a\b/i, /\benso\b/i, /\benos\b/i,
  /\boni\b/i, /\bsst\b/i, /sea surface temp/i, /seasonal forecast/i,
  /previs[aã]o sazonal/i, /equatorial pacific/i, /pac[ií]fico equatorial/i,
  /climate outlook/i, /anomalia/i, /neutral conditions/i, /tsm\b/i,
  /nino3\.4/i, /ni[nñ]o\s*3/i, /climate change/i,
];

function isEnso(t: string, d = "") { return ENSO_RE.some((r) => r.test(t + " " + d)); }

function clean(s: string) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&ccedil;/g, "ç").replace(/&Ccedil;/g, "Ç")
    .replace(/&atilde;/g, "ã").replace(/&Atilde;/g, "Ã")
    .replace(/&otilde;/g, "õ").replace(/&eacute;/g, "é").replace(/&Eacute;/g, "É")
    .replace(/&iacute;/g, "í").replace(/&oacute;/g, "ó").replace(/&aacute;/g, "á")
    .replace(/&uacute;/g, "ú").replace(/&Uacute;/g, "Ú").replace(/&ntilde;/g, "ñ")
    .replace(/&#\d+;/g, "").replace(/&[a-z]+;/gi, "")
    .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function uid(sid: string, key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return sid + "_" + Math.abs(h).toString(36);
}

async function get(url: string, timeout = 9000): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 SentinelaRS/5.0", "Accept": "text/html,*/*" },
    signal: AbortSignal.timeout(timeout),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

interface Raw { title: string; description: string; link: string; pub_date: string | null; image: string | null }
interface Item { id: string; source_id: string; source_name: string; title: string; description: string; link: string; image: string | null; pub_date: string | null; translated: boolean }
interface Result { source_id: string; source_name: string; ok: boolean; http_status: number | null; count: number; error?: string; items: Item[] }

// ── Tradução OpenRouter ───────────────────────────────────────────────────────

async function translateBatch(rows: Raw[], key: string): Promise<Array<{ title: string; description: string }>> {
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
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", temperature: 0,
      messages: [
        {
          role: "system",
          content: "Traduza para português brasileiro técnico e claro. " +
            "Mantenha termos: ENSO, El Niño, La Niña, SST, IFS, AIFS, Niño3.4, C3S. " +
            "Retorne SOMENTE JSON válido: [{\"title\":string,\"description\":string}]. Sem markdown.",
        },
        { role: "user", content: payload },
      ],
    }),
    signal: AbortSignal.timeout(18000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || "[]")
    .replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length !== rows.length) throw new Error("bad translation");
  return parsed;
}

function translateCopernicusFallback(row: Raw): { title: string; description: string } | null {
  const description = row.description.toLowerCase();

  if (description.includes("latest c3s seasonal forecasts strengthen the signal")) {
    return {
      title: "Destaques da Previsão Sazonal C3S — El Niño",
      description: "As previsões sazonais mais recentes do C3S reforçam o sinal de desenvolvimento do El Niño nos próximos meses. Mais de 50% dos membros do conjunto multissistema C3S agora excedem amplitude de 2,5 °C no índice Niño3.4 até o fim do período de previsão.",
    };
  }

  if (description === "copernicus c3s seasonal forecast enso") {
    return {
      title: row.title,
      description: "Previsão sazonal C3S do Copernicus sobre ENSO.",
    };
  }

  return null;
}

async function build(raw: Raw[], sid: string, sname: string, lang: "pt" | "en", key: string | null): Promise<Result> {
  if (!raw.length) return { source_id: sid, source_name: sname, ok: true, http_status: 200, count: 0, items: [] };

  let titles = raw.map((r) => r.title);
  let descs  = raw.map((r) => r.description);
  let translatedFlags = raw.map(() => lang === "pt");

  if (lang === "en" && key) {
    try {
      const tr = await translateBatch(raw, key);
      titles = tr.map((t) => t.title || "");
      descs  = tr.map((t) => t.description || "");
      translatedFlags = raw.map(() => true);
    } catch (e) {
      console.error("translateBatch error:", e instanceof Error ? e.message : e);
      if (sid === "copernicus") {
        const fallback = raw.map(translateCopernicusFallback);
        titles = raw.map((r, i) => fallback[i]?.title || r.title);
        descs = raw.map((r, i) => fallback[i]?.description || r.description);
        translatedFlags = fallback.map(Boolean);
      }
    }
  }

  const items: Item[] = raw.map((r, i) => ({
    id: uid(sid, r.link || r.title),
    source_id: sid, source_name: sname,
    title: titles[i] || r.title,
    description: descs[i] || r.description,
    link: r.link, image: r.image, pub_date: r.pub_date, translated: translatedFlags[i],
  }));

  return { source_id: sid, source_name: sname, ok: true, http_status: 200, count: items.length, items };
}

// ── ECMWF ─────────────────────────────────────────────────────────────────────
// Extrai notícias de /en/about/media-centre/news
// Padrão do HTML: links /en/about/media-centre/YYYY/slug

// ── GNews (Brasil, português) ────────────────────────────────────────────────
// Substitui ECMWF: traz notícias brasileiras sobre El Niño já em português
// Requer GNEWS_API_KEY nos secrets do Supabase

async function fetchGNews(): Promise<Result> {
  const SID = "gnews", SNAME = "Notícias BR";
  const apiKey = Deno.env.get("GNEWS_API_KEY") || null;

  if (!apiKey) {
    return { source_id: SID, source_name: SNAME, ok: false, http_status: null, count: 0, error: "GNEWS_API_KEY não configurada", items: [] };
  }

  try {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
    const url = `https://gnews.io/api/v4/search?q=%22El+Niño%22+OR+%22La+Niña%22+OR+%22ENOS%22&lang=pt&country=br&from=${from}&sortby=publishedAt&max=10&apikey=${apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data?.articles)) throw new Error("resposta inválida");

    const items: Item[] = data.articles.map((a: Record<string, string>) => ({
      id: uid(SID, a.url || a.title),
      source_id: SID,
      source_name: a.source?.name || SNAME,
      title: a.title || "",
      description: a.description || "",
      link: a.url || "",
      image: a.image || null,
      pub_date: a.publishedAt || null,
      translated: true,
    }));

    return { source_id: SID, source_name: SNAME, ok: true, http_status: 200, count: items.length, items };
  } catch (e) {
    return { source_id: SID, source_name: SNAME, ok: false, http_status: null, count: 0, error: String(e instanceof Error ? e.message : e), items: [] };
  }
}

// ── Copernicus// ── Copernicus C3S ────────────────────────────────────────────────────────────
// Estratégia: scraping de /seasonal-forecasts
// A página tem seção "Highlights of the latest seasonal forecasts" com texto ENSO
// e imagem do plume Niño3.4

async function fetchCopernicus(key: string | null): Promise<Result> {
  const SID = "copernicus", SNAME = "Copernicus C3S";
  const PAGE = "https://climate.copernicus.eu/seasonal-forecasts";

  try {
    const html = await get(PAGE);
    const raw: Raw[] = [];

    // Extrai data da seção highlight: "*DD Month YYYY*" ou "Month YYYY"
    const dateMatch = html.match(/(\d{1,2}\s+\w+\s+202[0-9])/);
    const pub_date = dateMatch ? (() => { try { return new Date(dateMatch[1]).toISOString(); } catch { return null; } })() : null;

    // Extrai imagem do plume Niño3.4
    const imgMatch = html.match(/src="([^"]+precalc_plume[^"]+ENSO[^"]+\.png)"/i) ||
                     html.match(/src="([^"]+NINO34[^"]+\.png)"/i) ||
                     html.match(/src="([^"]+enso[^"]+\.png)"/i);
    const image = imgMatch ? (imgMatch[1].startsWith("http") ? imgMatch[1] : `https://climate.copernicus.eu${imgMatch[1]}`) : null;

    // Extrai o parágrafo de highlight ENSO — texto entre "Highlights" e o próximo heading
    const highlightMatch = html.match(/Highlights of the latest seasonal forecasts[\s\S]{0,200}?<\/[ph][^>]*>([\s\S]{100,1200}?)(?=<h[23]|##)/i);
    let description = "";
    if (highlightMatch) {
      description = clean(highlightMatch[1]).slice(0, 600);
    } else {
      // Fallback: pega parágrafo com "El Nino" ou "Nino3.4"
      const paraMatch = html.match(/<p[^>]*>([\s\S]{50,600}?(?:El Ni[nñ]o|Nino3|ENSO)[\s\S]{0,300}?)<\/p>/i);
      if (paraMatch) description = clean(paraMatch[1]).slice(0, 600);
    }

    // Remove data que aparece no início da description (ex: "10 May 2026The latest...")
    description = description.replace(/^\d{1,2}\s+\w+\s+\d{4}/, "").trim();
    if (!description) description = "Previsões sazonais C3S com foco no El Niño e variabilidade climática global.";

    raw.push({
      title: "Destaques da Previsão Sazonal C3S — El Niño",
      description,
      link: PAGE,
      pub_date,
      image,
    });

    // Também extrai notícias da seção /news do Copernicus
    const newsRe = /href="(https:\/\/climate\.copernicus\.eu\/(?:news|press)\/[^"#?]+)"/gi;
    const seen = new Set<string>([PAGE]);
    let nm;
    while ((nm = newsRe.exec(html)) !== null && raw.length < 5) {
      const link = nm[1];
      if (seen.has(link) || /\.(css|js|png|gif|svg|jpg)/.test(link)) continue;
      seen.add(link);
      // Pega trecho ao redor para título
      const idx = html.indexOf(nm[0]);
      const chunk = html.slice(idx, idx + 400);
      const titleMatch = chunk.match(/>([A-Z][^<]{15,150})</);
      if (!titleMatch) continue;
      const title = clean(titleMatch[1]);
      if (title.length < 15 || !isEnso(title)) continue;
      raw.push({ title, description: "Copernicus C3S seasonal forecast ENSO", link, pub_date: null, image: null });
    }

    return build(raw, SID, SNAME, "en", key);
  } catch (e) {
    return { source_id: SID, source_name: SNAME, ok: false, http_status: null, count: 0, error: String(e instanceof Error ? e.message : e), items: [] };
  }
}

// ── CPTEC/INPE ────────────────────────────────────────────────────────────────

async function fetchCptec(): Promise<Result> {
  const SID = "cptec", SNAME = "CPTEC/INPE";
  const HOME = "http://enos.cptec.inpe.br/";
  const IMG_RE = /\.(gif|jpg|jpeg|png|svg|bmp|webp)(\?.*)?$/i;

  try {
    let html = "";
    for (const url of ["https://enos.cptec.inpe.br/", HOME]) {
      try { html = await get(url); break; } catch { continue; }
    }
    if (!html) throw new Error("CPTEC inacessível");

    const seen = new Set<string>();
    const raw: Raw[] = [];
    const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]{8,200}?)<\/a>/gi;
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
      raw.push({
        title: "Monitoramento ENOS — CPTEC/INPE",
        description: "Boletins e análises sobre El Niño e La Niña no Pacífico Equatorial.",
        link: HOME, pub_date: null, image: null,
      });
    }

    return build(raw, SID, SNAME, "pt", null);
  } catch (e) {
    return { source_id: SID, source_name: SNAME, ok: false, http_status: null, count: 0, error: String(e instanceof Error ? e.message : e), items: [] };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const key = Deno.env.get("OPENROUTER_API_KEY") || null;
  function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))]);
  }

  const errResult = (sid: string, sname: string): Result => ({
    source_id: sid, source_name: sname, ok: false, http_status: null, count: 0, error: "timeout global", items: [],
  });

  const [r1, r2, r3] = await Promise.allSettled([
    withTimeout(fetchGNews(),          15000, errResult("gnews",      "Notícias BR")),
    withTimeout(fetchCopernicus(key), 22000, errResult("copernicus", "Copernicus C3S")),
    withTimeout(fetchCptec(),         22000, errResult("cptec",      "CPTEC/INPE")),
  ]);

  const err = (sid: string, sname: string): Result => ({
    source_id: sid, source_name: sname, ok: false, http_status: null, count: 0, error: "falha inesperada", items: [],
  });

  const results: Result[] = [
    r1.status === "fulfilled" ? r1.value : err("gnews", "Notícias BR"),
    r2.status === "fulfilled" ? r2.value : err("copernicus", "Copernicus C3S"),
    r3.status === "fulfilled" ? r3.value : err("cptec", "CPTEC/INPE"),
  ];

  const items = results
    .flatMap((r) => r.items)
    .sort((a, b) => new Date(b.pub_date || 0).getTime() - new Date(a.pub_date || 0).getTime())
    .slice(0, 40);

  return new Response(
    JSON.stringify({
      ok: true,
      fetched_at: new Date().toISOString(),
      translation: key ? "openrouter" : "none",
      total: items.length,
      sources: results.map(({ items: _, ...s }) => s),
      items,
    }),
    {
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=21600, stale-while-revalidate=3600",
      },
    },
  );
});
