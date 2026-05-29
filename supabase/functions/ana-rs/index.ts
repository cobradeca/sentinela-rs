const ANA_REST_BASE_URL = "https://www.ana.gov.br/hidrowebservice";
const MAX_OPERATIONAL_AGE_MINUTES = 24 * 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

function jsonResponse(body: JsonRecord, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}

function getEnv(names: string[]): string | null {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function getAnaCredentials() {
  return {
    identificador: getEnv(["ANA_HIDROWEB_IDENTIFICADOR", "ANA_HIDROWEB_USER", "ANA_HIDROWEB_USUARIO"]),
    senha: getEnv(["ANA_HIDROWEB_SENHA", "ANA_HIDROWEB_PASSWORD"]),
  };
}

function flattenValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (value && typeof value === "object") {
    return Object.values(value as JsonRecord).flatMap(flattenValues);
  }
  return [value];
}

function findToken(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 20 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findToken(item);
      if (token) return token;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    const preferredKeys = [
      "access_token",
      "accessToken",
      "accesstoken",
      "token",
      "Token",
      "jwt",
      "JWT",
      "accessTokenSSO",
      "AccessToken",
    ];

    for (const key of preferredKeys) {
      const token = findToken(record[key]);
      if (token) return token;
    }

    for (const item of Object.values(record)) {
      const token = findToken(item);
      if (token) return token;
    }
  }

  return null;
}

async function getAnaAccessToken(): Promise<string> {
  const credentials = getAnaCredentials();

  if (!credentials.identificador || !credentials.senha) {
    throw new Error("ANA HidroWeb REST nao configurado: defina ANA_HIDROWEB_IDENTIFICADOR e ANA_HIDROWEB_SENHA nos secrets do Supabase.");
  }

  const authUrl = `${ANA_REST_BASE_URL}/EstacoesTelemetricas/OAUth/v1`;
  const response = await fetch(authUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Identificador: credentials.identificador,
      Senha: credentials.senha,
      "User-Agent": "SentinelaRS/1.0",
    },
  });

  const text = await response.text();
  let payload: unknown = text;

  try {
    payload = JSON.parse(text);
  } catch {
    // Mantem o texto bruto para extracao defensiva do token.
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload
      ? String((payload as JsonRecord).message)
      : text.slice(0, 180);
    throw new Error(`ANA auth HTTP ${response.status}: ${message}`);
  }

  const token = findToken(payload);
  if (!token) {
    throw new Error("ANA auth respondeu, mas nenhum access token foi encontrado no payload.");
  }

  return token;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value).trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function asDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const parsed = new Date(text);
  if (Number.isFinite(parsed.getTime())) return parsed.toISOString();

  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!br) return null;

  const [, day, month, year, hour = "00", minute = "00", second = "00"] = br;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`;
  const brParsed = new Date(iso);
  return Number.isFinite(brParsed.getTime()) ? brParsed.toISOString() : null;
}

function getByAliases(record: JsonRecord, aliases: string[]): unknown {
  const lowerMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    lowerMap.set(key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), value);
  }

  for (const alias of aliases) {
    const normalized = alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (lowerMap.has(normalized)) return lowerMap.get(normalized);
  }

  return null;
}

function findRecordArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    const records = value.filter((item): item is JsonRecord => Boolean(item && typeof item === "object" && !Array.isArray(item)));
    if (records.length) return records;
  }

  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    const preferred = ["items", "dados", "data", "content", "result", "results", "value"];
    for (const key of preferred) {
      const found = findRecordArray(record[key]);
      if (found.length) return found;
    }

    for (const item of Object.values(record)) {
      const found = findRecordArray(item);
      if (found.length) return found;
    }
  }

  return [];
}

function parseAnaRecords(payload: unknown, codEstacao: string) {
  const rawRecords = findRecordArray(payload);

  return rawRecords.map((record) => {
    const station = getByAliases(record, ["codEstacao", "codigoEstacao", "CodigoEstacao", "Código da Estação"]) ?? codEstacao;
    const measuredAt = asDate(getByAliases(record, [
      "dataHora",
      "dataHoraMedicao",
      "dataLeitura",
      "DataHora",
      "Data Leitura",
      "Data de Leitura",
      "Data",
      "data",
    ]));

    const levelRaw = getByAliases(record, [
      "nivel",
      "Nivel",
      "nivelAdotado",
      "NivelAdotado",
      "cota",
      "Cota",
      "cotaAdotada",
      "CotaAdotada",
    ]);
    const rainRaw = getByAliases(record, ["chuva", "Chuva", "chuvaAdotada", "ChuvaAdotada"]);
    const flowRaw = getByAliases(record, ["vazao", "Vazao", "vazaoAdotada", "VazaoAdotada"]);

    const levelCm = asNumber(levelRaw);
    const rainMm = asNumber(rainRaw);
    const flowM3s = asNumber(flowRaw);

    return {
      codEstacao: String(station),
      dataHora: measuredAt,
      measured_at: measuredAt,
      level_cm: levelCm,
      level_m: levelCm === null ? null : levelCm / 100,
      rain_mm: rainMm,
      flow_m3s: flowM3s,
      raw: record,
    };
  }).filter((record) => record.measured_at && record.level_m !== null);
}

function getAgeMinutes(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const age = (Date.now() - new Date(isoDate).getTime()) / 60000;
  return Number.isFinite(age) ? Math.max(0, Math.round(age)) : null;
}

async function fetchAnaStation(codEstacao: string) {
  const token = await getAnaAccessToken();
  const url = new URL(`${ANA_REST_BASE_URL}/EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v1`);
  url.searchParams.set("Código da Estação", codEstacao);
  url.searchParams.set("Tipo Filtro Data", "DATA_LEITURA");
  url.searchParams.set("Range Intervalo de busca", "DIAS_2");
  url.searchParams.set("Data de Busca (yyyy-MM-dd)", new Date().toISOString().slice(0, 10));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "SentinelaRS/1.0",
    },
  });

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // Payload nao JSON: sera tratado como erro abaixo.
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload
      ? String((payload as JsonRecord).message)
      : text.slice(0, 180);
    throw new Error(`ANA serie HTTP ${response.status}: ${message}`);
  }

  const records = parseAnaRecords(payload, codEstacao)
    .sort((a, b) => new Date(b.measured_at || 0).getTime() - new Date(a.measured_at || 0).getTime());
  const latest = records[0] || null;
  const ageMinutes = getAgeMinutes(latest?.measured_at ?? null);
  const stale = ageMinutes === null || ageMinutes > MAX_OPERATIONAL_AGE_MINUTES;

  if (!latest) {
    const message = typeof payload === "object" && payload && "message" in payload
      ? String((payload as JsonRecord).message)
      : "Sem dado de nivel adotado no periodo consultado.";

    return {
      ok: false,
      source: "ANA HidroWeb REST",
      codEstacao,
      operational: false,
      stale: true,
      error: message,
      latest: null,
      records: [],
      raw_status: typeof payload === "object" && payload ? (payload as JsonRecord).status ?? null : null,
    };
  }

  return {
    ok: !stale,
    source: "ANA HidroWeb REST",
    codEstacao,
    station_id: codEstacao,
    operational: !stale,
    stale,
    age_minutes: ageMinutes,
    error: stale ? "Leitura ANA acima de 24h; exibida apenas como referencia." : null,
    latest,
    records: records.slice(0, 96).map(({ raw: _raw, ...record }) => record),
    raw_status: typeof payload === "object" && payload ? (payload as JsonRecord).status ?? null : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const codEstacao = url.searchParams.get("codEstacao")?.trim();

  if (!codEstacao) {
    return jsonResponse({
      ok: false,
      source: "ANA HidroWeb REST",
      error: "Parametro obrigatorio: codEstacao",
      latest: null,
      records: [],
    }, 400);
  }

  try {
    const result = await fetchAnaStation(codEstacao);

    return jsonResponse({
      ...result,
      fetched_at: new Date().toISOString(),
    }, 200, result.ok ? "public, max-age=600, stale-while-revalidate=300" : "no-store");
  } catch (error) {
    return jsonResponse({
      ok: false,
      source: "ANA HidroWeb REST",
      codEstacao,
      operational: false,
      stale: true,
      error: error instanceof Error ? error.message : "Unknown error",
      latest: null,
      records: [],
      fetched_at: new Date().toISOString(),
    }, 200);
  }
});
