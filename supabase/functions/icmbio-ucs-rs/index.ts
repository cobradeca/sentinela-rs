const CNUC_CSV_URL = "https://dados.mma.gov.br/dataset/44b6dc8a-dc82-4a84-8d95-1b0da7c85dac/resource/bab6d474-d38d-457c-9092-755f23ebdc76/download/cnuc_2026_03_atualizado.csv";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200, cache = "public, max-age=86400, stale-while-revalidate=604800") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
    },
  });
}

function parseCsvLine(line: string, sep = ";"): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === sep && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }

  out.push(cur.trim());
  return out;
}

function numberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: string | undefined) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function matchRow(headers: string[], values: string[]) {
  const row: Record<string, string> = {};
  headers.forEach((header, idx) => {
    row[header] = values[idx] || "";
  });

  const uf = row["UF"] || "";
  const municipios = row["Municípios Abrangidos"] || "";
  if (!uf.includes("RS") && !municipios.includes("(RS)")) return null;

  const name = row["Nome da UC"] || "";
  const nameKey = normalizeText(name);
  const relevantTerms = [
    "BANHADO",
    "TAIM",
    "LAGOA DO PEIXE",
    "APARADOS",
    "SERRA GERAL",
    "ITAPUA",
    "DELTA DO JACUI",
    "TURVO",
    "ESPINILHO",
    "IBIRAPUITA",
  ];
  const highPriority = relevantTerms.some((term) => nameKey.includes(term));

  return {
    id: row["ID_UC"] || row["Código UC"] || name,
    code: row["Código UC"] || null,
    name,
    esfera: row["Esfera Administrativa"] || null,
    categoria: row["Categoria de Manejo"] || null,
    grupo: row["Grupo"] || null,
    uf,
    municipios,
    orgao_gestor: row["Órgão Gestor"] || null,
    bioma: row["Bioma declarado"] || null,
    area_ha: numberOrNull(row["Área soma biomas"]),
    plano_manejo: row["Plano de Manejo"] || null,
    conselho_gestor: row["Conselho Gestor"] || null,
    high_priority: highPriority,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, "no-store");

  const url = new URL(req.url);
  const onlyPriority = url.searchParams.get("priority") !== "false";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 30), 1), 200);

  try {
    const response = await fetch(CNUC_CSV_URL, {
      headers: { Accept: "text/csv,text/plain,*/*", "User-Agent": "SentinelaRS/1.0" },
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) throw new Error(`MMA CKAN CSV HTTP ${response.status}`);

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("windows-1252").decode(buffer);
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(lines[0] || ";");
    const allRs = lines.slice(1)
      .map((line) => matchRow(headers, parseCsvLine(line)))
      .filter(Boolean) as Array<ReturnType<typeof matchRow>>;

    const filtered = (onlyPriority ? allRs.filter((uc) => uc?.high_priority) : allRs)
      .sort((a, b) => {
        const hp = Number(Boolean(b?.high_priority)) - Number(Boolean(a?.high_priority));
        if (hp) return hp;
        return (b?.area_ha || 0) - (a?.area_ha || 0);
      })
      .slice(0, limit);

    return jsonResponse({
      ok: true,
      source: "MMA/ICMBio CNUC via CKAN Dados Abertos",
      dataset: "unidadesdeconservacao",
      resource: "CNUC_2026_03",
      fetched_at: new Date().toISOString(),
      total_rs: allRs.length,
      count: filtered.length,
      records: filtered,
      source_url: CNUC_CSV_URL,
      operational_use: "Cadastro oficial de Unidades de Conservacao. Camada complementar; nao e alerta de queimada em tempo real.",
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      source: "MMA/ICMBio CNUC via CKAN Dados Abertos",
      error: error instanceof Error ? error.message : "Unknown error",
      records: [],
      count: 0,
      fetched_at: new Date().toISOString(),
    }, 200, "no-store");
  }
});
