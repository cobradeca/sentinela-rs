const ANA_REST_BASE_URL = "https://www.ana.gov.br/hidrowebservice";
const ANA_PUBLIC_TELEMETRY_URL = "https://telemetriaws1.ana.gov.br/serviceana.asmx/DadosHidrometeorologicos";
const MAX_OPERATIONAL_AGE_MINUTES = 24 * 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

let anaAuthCache: { token: string; clientId: string | null; expiresAt: number } | null = null;

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
    identificador: getEnv(["ANA_HIDROWEB_IDENTIFICADOR", "ANA_HIDROWS_IDENTIFICADOR", "ANA_HIDROWEB_USER", "ANA_HIDROWEB_USUARIO"]),
    senha: getEnv(["ANA_HIDROWEB_SENHA", "ANA_HIDROWS_SENHA", "ANA_HIDROWEB_PASSWORD"]),
    clientId: getEnv(["ANA_HIDROWEB_CLIENT_ID", "ANA_HIDROWEB_CLIENTID", "ANA_HIDROWEB_CLIENT"]),
  };
}

function findToken(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^[A-Za-z0-9._~+/=-]{20,}$/.test(trimmed) ? trimmed : null;
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
      "tokenautenticacao",
      "tokenAutenticacao",
      "token_autenticacao",
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

function findStringByKeys(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKeys(item, keys);
      if (found) return found;
    }
    return null;
  }

  const record = value as JsonRecord;
  const normalizedKeys = keys.map((key) => key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());

  for (const [key, item] of Object.entries(record)) {
    const normalized = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (normalizedKeys.includes(normalized) && item !== null && item !== undefined && String(item).trim()) {
      return String(item).trim();
    }
  }

  for (const item of Object.values(record)) {
    const found = findStringByKeys(item, keys);
    if (found) return found;
  }

  return null;
}

function normalizeBearerToken(token: string): string {
  return token.replace(/^Bearer\s+/i, "").trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAnaAuth(): Promise<{ token: string; clientId: string | null }> {
  if (anaAuthCache && anaAuthCache.expiresAt > Date.now()) {
    return { token: anaAuthCache.token, clientId: anaAuthCache.clientId };
  }

  const credentials = getAnaCredentials();

  if (!credentials.identificador || !credentials.senha) {
    throw new Error("ANA HidroWeb REST nao configurado: defina ANA_HIDROWEB_IDENTIFICADOR e ANA_HIDROWEB_SENHA nos secrets do Supabase.");
  }

  let payload: unknown = null;
  let lastStatus = 0;
  let lastText = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const authUrl = `${ANA_REST_BASE_URL}/EstacoesTelemetricas/OAUth/v1`;
    const response = await fetch(authUrl, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "application/json",
        Identificador: credentials.identificador,
        Senha: credentials.senha,
        "User-Agent": "SentinelaRS/1.0",
      },
    });

    lastStatus = response.status;
    lastText = await response.text();
    payload = lastText;

    try {
      payload = JSON.parse(lastText);
    } catch {
      // Mantem o texto bruto para extracao defensiva do token.
    }

    if (response.ok) break;
    if (attempt < 3 && (response.status === 417 || response.status === 429 || response.status >= 500)) {
      await sleep(500 * attempt);
      continue;
    }

    const message = typeof payload === "object" && payload && "message" in payload
      ? String((payload as JsonRecord).message)
      : lastText.slice(0, 180);
    throw new Error(`ANA auth HTTP ${response.status}: ${message}`);
  }

  const token = findToken(payload);
  if (!token) {
    throw new Error(`ANA auth HTTP ${lastStatus}: token nao encontrado no payload.`);
  }

  const auth = {
    token: normalizeBearerToken(token),
    clientId: credentials.clientId || findStringByKeys(payload, ["clientid", "clientId", "client_id", "idCliente", "identificador"]),
  };

  anaAuthCache = {
    ...auth,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };

  return auth;
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
    const station = getByAliases(record, ["codEstacao", "codigoEstacao", "CodigoEstacao", "codigoestacao", "Código da Estação"]) ?? codEstacao;
    const measuredAt = asDate(getByAliases(record, [
      "dataHora",
      "dataHoraMedicao",
      "Data_Hora_Medicao",
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
      "Cota_Adotada",
      "cotaAdotada",
      "CotaAdotada",
    ]);
    const rainRaw = getByAliases(record, ["chuva", "Chuva", "Chuva_Adotada", "chuvaAdotada", "ChuvaAdotada"]);
    const flowRaw = getByAliases(record, ["vazao", "Vazao", "Vazao_Adotada", "vazaoAdotada", "VazaoAdotada"]);

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

function formatAnaPublicDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseAnaPublicTelemetryXml(xmlText: string, codEstacao: string) {
  const blocks = [
    ...xmlText.matchAll(/<DadosHidrometereologicos\b[^>]*>([\s\S]*?)<\/DadosHidrometereologicos>/g),
    ...xmlText.matchAll(/<DadosHidrometeorologicos\b[^>]*>([\s\S]*?)<\/DadosHidrometeorologicos>/g),
  ].map((match) => match[1] || "");

  return blocks.map((block) => {
    const getText = (tag: string) => {
      const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return (match?.[1] || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    };
    const station = getText("CodEstacao") || codEstacao;
    const measuredAt = asDate(getText("DataHora"));
    const levelCm = asNumber(getText("Nivel"));
    const rainMm = asNumber(getText("Chuva"));
    const flowM3s = asNumber(getText("Vazao"));

    return {
      codEstacao: String(station),
      dataHora: measuredAt,
      measured_at: measuredAt,
      level_cm: levelCm,
      level_m: levelCm === null ? null : levelCm / 100,
      rain_mm: rainMm,
      flow_m3s: flowM3s,
    };
  }).filter((record) => record.measured_at && record.level_m !== null);
}

async function fetchAnaPublicStation(codEstacao: string) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 9);

  const url = new URL(ANA_PUBLIC_TELEMETRY_URL);
  url.searchParams.set("codEstacao", codEstacao);
  url.searchParams.set("dataInicio", formatAnaPublicDate(start));
  url.searchParams.set("dataFim", formatAnaPublicDate(now));

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: "text/xml, application/xml, text/plain",
      "User-Agent": "SentinelaRS/1.0",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ANA telemetria publica HTTP ${response.status}: ${text.slice(0, 180)}`);
  }

  const records = parseAnaPublicTelemetryXml(text, codEstacao)
    .sort((a, b) => new Date(b.measured_at || 0).getTime() - new Date(a.measured_at || 0).getTime());
  const latest = records[0] || null;
  const ageMinutes = getAgeMinutes(latest?.measured_at ?? null);
  const stale = ageMinutes === null || ageMinutes > MAX_OPERATIONAL_AGE_MINUTES;

  if (!latest) {
    return {
      ok: false,
      source: "ANA Telemetria Publica",
      codEstacao,
      operational: false,
      stale: true,
      error: "Sem registros de nivel na telemetria publica da ANA para esta estacao no periodo consultado.",
      ana_message: "Nao houve retorno de registros no webservice publico.",
      latest: null,
      records: [],
      raw_status: null,
    };
  }

  return {
    ok: !stale,
    source: "ANA Telemetria Publica",
    codEstacao,
    station_id: codEstacao,
    operational: !stale,
    stale,
    age_minutes: ageMinutes,
    error: stale ? "Leitura ANA publica acima de 24h; exibida apenas como referencia." : null,
    latest,
    records: records.slice(0, 96),
    raw_status: null,
  };
}

function extractAnaMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const raw = (payload as JsonRecord).message;
  const message = raw === null || raw === undefined ? "" : String(raw).trim();
  if (!message || /^sucesso$/i.test(message)) return fallback;
  return message;
}

async function fetchAnaStation(codEstacao: string) {
  let auth: { token: string; clientId: string | null } | null = null;
  try {
    auth = await getAnaAuth();
  } catch {
    return fetchAnaPublicStation(codEstacao);
  }

  const url = new URL(`${ANA_REST_BASE_URL}/EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v1`);
  url.searchParams.set("Código da Estação", codEstacao);
  url.searchParams.set("Tipo Filtro Data", "DATA_LEITURA");
  url.searchParams.set("Range Intervalo de busca", "DIAS_30");
  url.searchParams.set("Data de Busca (yyyy-MM-dd)", new Date().toISOString().slice(0, 10));

  const apiHeaders: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${auth.token}`,
    accesstoken: auth.token,
    accessToken: auth.token,
    "User-Agent": "SentinelaRS/1.0",
  };

  if (auth.clientId) {
    apiHeaders.clientid = auth.clientId;
    apiHeaders.clientId = auth.clientId;
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: apiHeaders,
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
    try {
      return await fetchAnaPublicStation(codEstacao);
    } catch {
      const anaMessage = extractAnaMessage(payload, "");

      return {
        ok: false,
        source: "ANA HidroWeb REST",
        codEstacao,
        operational: false,
        stale: true,
        error: "Sem registros de nivel adotado para esta estacao no periodo consultado.",
        ana_message: anaMessage || null,
        latest: null,
        records: [],
        raw_status: typeof payload === "object" && payload ? (payload as JsonRecord).status ?? null : null,
      };
    }
  }

  if (stale) {
    try {
      const publicResult = await fetchAnaPublicStation(codEstacao);
      if (publicResult.ok || (publicResult.latest && !publicResult.stale)) return publicResult;
    } catch {
      // Mantem a leitura autenticada antiga como referencia.
    }
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
