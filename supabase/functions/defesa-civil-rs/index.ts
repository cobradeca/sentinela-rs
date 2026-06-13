const RSS_URLS = [
  "https://www.defesacivil.rs.gov.br/rss",
  "http://www.defesacivil.rs.gov.br/rss",
  "https://defesacivil.rs.gov.br/rss",
  "http://defesacivil.rs.gov.br/rss",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const MONTHS_PT: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  marcoo: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

function decodeEntities(value: string): string {
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
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: string): string {
  return decodeEntities(String(value || ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match?.[1] ? decodeEntities(match[1]) : null;
}

function extractEnclosure(xml: string): string | null {
  const match = xml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || null;
}

function classifyAlert(title: string, description: string): "CRITICO" | "EMERGENCIA" | "ALERTA" | "ATENCAO" {
  const text = normalizeText(`${title} ${description}`);

  if (text.includes("RISCO EXTREMO") || text.includes("EMERGENCIA METEOROLOGICA")) return "EMERGENCIA";
  if (text.includes("RISCO MUITO ALTO") || text.includes("CRITICO")) return "CRITICO";
  if (text.includes("CONDICAO DE ALERTA") || text.includes("RISCO ALTO") || text.includes("ALERTA")) return "ALERTA";
  return "ATENCAO";
}

function parseValidUntil(description: string, referenceDate: Date): string | null {
  const text = normalizeText(description);
  const match = text.match(/VALIDO AT[EA]\s*(?:AS|A)?\s*(\d{1,2})H(?:(\d{2}))?\s+DO\s+DIA\s+(\d{1,2})\s+DE\s+([A-ZÇÃÉ]+)(?:\s+DE\s+(\d{4}))?/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const day = Number(match[3]);
  const month = MONTHS_PT[match[4].toLowerCase()] || null;
  if (!month) return null;

  const year = match[5] ? Number(match[5]) : referenceDate.getUTCFullYear();
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parsePublishedAt(value: string | null, fallback: Date): string {
  if (!value) return fallback.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function isRelevantAlert(title: string, description: string): boolean {
  const text = normalizeText(`${title} ${description}`);
  return (
    text.includes("CONDICAO DE ALERTA") ||
    text.includes("RISCO ALTO") ||
    text.includes("RISCO MUITO ALTO") ||
    text.includes("RISCO EXTREMO") ||
    text.includes("ATENCAO")
  );
}

function isActiveAlert(title: string, description: string, validUntil: string | null, publishedAt: string, now: Date): boolean {
  if (!isRelevantAlert(title, description)) return false;

  const publishedMs = new Date(publishedAt).getTime();
  const ageHours = Number.isFinite(publishedMs) ? (now.getTime() - publishedMs) / 3600000 : Infinity;
  if (ageHours > 72) return false;

  if (!validUntil) return true;
  const validMs = new Date(validUntil).getTime();
  if (!Number.isFinite(validMs)) return true;
  return validMs > now.getTime();
}

function parseRss(xml: string) {
  const now = new Date();
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  const seen = new Set<string>();

  return items
    .map((item, index) => {
      const title = extractTag(item, "title") || "Alerta Defesa Civil RS";
      const link = extractTag(item, "link") || "https://www.defesacivil.rs.gov.br/";
      const description = extractTag(item, "description") || "";
      const publishedAt = parsePublishedAt(extractTag(item, "dc:date") || extractTag(item, "pubDate"), now);
      const image = extractEnclosure(item);
      const validUntil = parseValidUntil(description, new Date(publishedAt));
      const riskLevel = classifyAlert(title, description);
      const dedupeKey = normalizeText(`${title} ${publishedAt.slice(0, 10)}`);

      return {
        id: `defesa_civil_rs_${publishedAt}_${index}`,
        source: "Defesa Civil RS",
        official: true,
        risk_level: riskLevel,
        title,
        station: "Defesa Civil RS",
        message: description,
        link,
        image,
        at: publishedAt,
        valid_until: validUntil,
        dedupeKey,
      };
    })
    .filter((alert) => {
      if (seen.has(alert.dedupeKey)) return false;
      seen.add(alert.dedupeKey);
      return isActiveAlert(alert.title, alert.message, alert.valid_until, alert.at, now);
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 20);
}

async function fetchRssWithFallbacks() {
  let xml = "";
  let usedUrl = "";
  let lastError = "";

  for (const url of RSS_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 SentinelaRS/1.0",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
          "Connection": "close",
        },
      });

      if (!response.ok) {
        lastError = `${url} returned ${response.status}`;
        continue;
      }

      const text = await response.text();
      if (text.includes("<rss") && text.includes("<item>")) {
        xml = text;
        usedUrl = url;
        break;
      }

      lastError = `${url} did not return valid RSS`;
    } catch (error) {
      lastError = `${url}: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  return { xml, usedUrl, lastError };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const { xml, usedUrl, lastError } = await fetchRssWithFallbacks();

    if (!xml || !xml.includes("<rss")) {
      return new Response(JSON.stringify({
        ok: false,
        source: "Defesa Civil RS",
        error: lastError || "RSS unavailable",
        alerts: [],
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const alerts = parseRss(xml);

    return new Response(JSON.stringify({
      ok: true,
      source: "Defesa Civil RS",
      source_url: usedUrl,
      fetched_at: new Date().toISOString(),
      mode: "active_alerts_deduped",
      count: alerts.length,
      alerts,
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      source: "Defesa Civil RS",
      error: error instanceof Error ? error.message : "Unknown error",
      alerts: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
