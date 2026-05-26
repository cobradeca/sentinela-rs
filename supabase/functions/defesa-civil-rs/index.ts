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
  março: 3,
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
  const text = `${title} ${description}`.toUpperCase();

  if (text.includes("RISCO EXTREMO") || text.includes("EMERGÊNCIA METEOROLÓGICA") || text.includes("EMERGENCIA METEOROLOGICA")) {
    return "EMERGENCIA";
  }

  if (text.includes("RISCO MUITO ALTO") || text.includes("CRÍTICO") || text.includes("CRITICO")) {
    return "CRITICO";
  }

  if (text.includes("CONDIÇÃO DE ALERTA") || text.includes("CONDICAO DE ALERTA") || text.includes("RISCO ALTO") || text.includes("ALERTA")) {
    return "ALERTA";
  }

  return "ATENCAO";
}

function parseValidUntil(description: string, referenceDate: Date): string | null {
  const text = description.normalize("NFC");

  const match = text.match(/v[aá]lido\s+at[eé]\s*(?:as|às)?\s*(\d{1,2})h(?:(\d{2}))?\s+do\s+dia\s+(\d{1,2})\s+de\s+([a-zçãé]+)(?:\s+de\s+(\d{4}))?/i);

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const day = Number(match[3]);
  const monthName = match[4].toLowerCase();
  const month = MONTHS_PT[monthName];

  if (!month) return null;

  const year = match[5] ? Number(match[5]) : referenceDate.getUTCFullYear();
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function isEssentialActiveAlert(title: string, description: string, validUntil: string | null, now: Date): boolean {
  const text = `${title} ${description}`.toUpperCase();

  const isAlert =
    text.includes("CONDIÇÃO DE ALERTA") ||
    text.includes("CONDICAO DE ALERTA") ||
    text.includes("RISCO ALTO") ||
    text.includes("RISCO MUITO ALTO") ||
    text.includes("RISCO EXTREMO");

  if (!isAlert) return false;
  if (!validUntil) return false;

  return new Date(validUntil).getTime() > now.getTime();
}

function parseRss(xml: string) {
  const now = new Date();
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return items
    .map((item, index) => {
      const title = extractTag(item, "title") || "Alerta Defesa Civil RS";
      const link = extractTag(item, "link") || "https://www.defesacivil.rs.gov.br/";
      const description = extractTag(item, "description") || "";
      const date = extractTag(item, "dc:date") || extractTag(item, "pubDate") || null;
      const image = extractEnclosure(item);
      const validUntil = parseValidUntil(description, date ? new Date(date) : now);
      const risk_level = classifyAlert(title, description);

      return {
        id: `defesa_civil_rs_${date || index}`,
        source: "Defesa Civil RS",
        official: true,
        risk_level,
        title,
        station: "Defesa Civil RS",
        message: description,
        link,
        image,
        at: date || now.toISOString(),
        valid_until: validUntil,
      };
    })
    .filter((alert) => isEssentialActiveAlert(alert.title, alert.message, alert.valid_until, now))
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
      mode: "essential_active_only",
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
