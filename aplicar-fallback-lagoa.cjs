const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-fallback-lagoa");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-fallback-lagoa");
}

function replaceOrWarn(search, replacement, label) {
  if (!app.includes(search)) {
    console.warn(`AVISO: trecho não encontrado para ${label}. Pulando.`);
    return false;
  }
  app = app.replace(search, replacement);
  return true;
}

function replaceRegexOrWarn(regex, replacement, label) {
  if (!regex.test(app)) {
    console.warn(`AVISO: padrão não encontrado para ${label}. Pulando.`);
    return false;
  }
  app = app.replace(regex, replacement);
  return true;
}

// 1) Helpers de fallback local.
// Fallback é intencionalmente localStorage: mantém última leitura válida no navegador.
// Não deve elevar risco/alerta automático quando estiver em fallback.
const fallbackHelpers = `
const LAGOA_FALLBACK_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const LAGOA_RADAR_CACHE_KEY = "sentinela_rs_lagoa_radar_last_valid_v1";
const HIDROSENS_LARANJAL_CACHE_KEY = "sentinela_rs_hidrosens_laranjal_last_valid_v1";

function saveFallbackCache(key, data) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify({
      saved_at: new Date().toISOString(),
      data,
    }));
  } catch {}
}

function readFallbackCache(key, maxAgeMs = LAGOA_FALLBACK_MAX_AGE_MS) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAtMs = new Date(parsed.saved_at || 0).getTime();
    if (!savedAtMs || Date.now() - savedAtMs > maxAgeMs) return null;

    return {
      ...parsed.data,
      fallback: true,
      fallback_saved_at: parsed.saved_at,
      fallback_age_minutes: Math.round((Date.now() - savedAtMs) / 60000),
    };
  } catch {
    return null;
  }
}

function markRadarFallback(map) {
  if (!map || typeof map !== "object") return {};
  return Object.fromEntries(
    Object.entries(map).map(([id, sensor]) => [
      id,
      {
        ...sensor,
        fallback: true,
        fallback_saved_at: map.fallback_saved_at || sensor?.fallback_saved_at || null,
        fallback_age_minutes: map.fallback_age_minutes ?? sensor?.fallback_age_minutes ?? null,
      },
    ])
  );
}
`;

if (!app.includes("LAGOA_FALLBACK_MAX_AGE_MS")) {
  const insertAfter = `function radarRiskToLevel(status) {
  if (status === "ALERTA") return "ALERTA";
  if (status === "ATENCAO") return "ATENCAO";
  return "NORMAL";
}
`;
  replaceOrWarn(insertAfter, insertAfter + fallbackHelpers + "\n", "helpers de fallback");
}

// 2) Substitui fetchLagoaRadarLevels por versão com cache/fallback.
replaceRegexOrWarn(
  /async function fetchLagoaRadarLevels\(\) \{[\s\S]*?\n\}/,
  `async function fetchLagoaRadarLevels() {
  const cached = readFallbackCache(LAGOA_RADAR_CACHE_KEY);

  try {
    const res = await fetch(LAGOA_RADAR_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return cached ? markRadarFallback(cached) : {};

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.sensors)) {
      return cached ? markRadarFallback(cached) : {};
    }

    const live = Object.fromEntries(
      data.sensors
        .filter((sensor) => sensor?.ok && sensor?.station_id)
        .map((sensor) => [sensor.station_id, sensor])
    );

    if (Object.keys(live).length > 0) {
      saveFallbackCache(LAGOA_RADAR_CACHE_KEY, live);
      return live;
    }

    return cached ? markRadarFallback(cached) : {};
  } catch {
    return cached ? markRadarFallback(cached) : {};
  }
}`,
  "fetchLagoaRadarLevels com fallback"
);

// 3) Substitui fetchHidroSensLaranjalLevel por versão com cache/fallback.
// Mantém os campos já adotados: alerta 1,20 m; crítico 1,40 m; máx. maio/2024 2,40 m.
replaceRegexOrWarn(
  /async function fetchHidroSensLaranjalLevel\(\) \{[\s\S]*?\n\}/,
  `async function fetchHidroSensLaranjalLevel() {
  const cached = readFallbackCache(HIDROSENS_LARANJAL_CACHE_KEY);

  try {
    const res = await fetch(HIDROSENS_LARANJAL_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return cached || null;

    const data = await res.json();
    if (!data?.ok || typeof data.level_m !== "number") return cached || null;

    const live = {
      ok: true,
      station_id: data.station_id,
      name: data.name,
      source_label: "HidroSens/UFPel",
      measured_at: data.measured_at,
      received_at: data.fetched_at,
      level_m: data.level_m,
      level_cm: data.level_cm,
      distance_m: data.distance_m,
      sensor_height_m: data.sensor_height_m,
      threshold_m: data.threshold_m ?? 1.20,
      threshold_cm: data.threshold_cm ?? 120,
      critical_threshold_m: data.critical_threshold_m ?? 1.40,
      critical_threshold_cm: data.critical_threshold_cm ?? 140,
      max_may_2024_m: data.max_may_2024_m ?? 2.40,
      max_may_2024_cm: data.max_may_2024_cm ?? 240,
      status: data.status || (data.level_m >= 1.40 ? "ALERTA" : data.level_m >= 1.20 ? "ATENCAO" : "NORMAL"),
      note: data.note,
    };

    saveFallbackCache(HIDROSENS_LARANJAL_CACHE_KEY, live);
    return live;
  } catch {
    return cached || null;
  }
}`,
  "fetchHidroSensLaranjalLevel com fallback"
);

// 4) Marca o objeto lagoa com isFallback/fallback_saved_at.
replaceOrWarn(
  `source: hidrosensLevel ? "HIDROSENS" : (radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null)),
          radar: radarLevel,`,
  `source: hidrosensLevel ? "HIDROSENS" : (radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null)),
          isFallback: Boolean(hidrosensLevel?.fallback || radarLevel?.fallback),
          fallback_saved_at: hidrosensLevel?.fallback_saved_at || radarLevel?.fallback_saved_at || null,
          fallback_age_minutes: hidrosensLevel?.fallback_age_minutes ?? radarLevel?.fallback_age_minutes ?? null,
          radar: radarLevel,`,
  "campos isFallback no objeto lagoa"
);

// 5) Fallback não pode elevar risco/alerta automático.
replaceOrWarn(
  `const levelRisk = ((lagoa?.radar || lagoa?.hidrosens) && lagoa?.threshold_m) ? radarRiskToLevel(lagoa.levelStatus) : "NORMAL";`,
  `const levelRisk = ((lagoa?.radar || lagoa?.hidrosens) && lagoa?.threshold_m && !lagoa?.isFallback) ? radarRiskToLevel(lagoa.levelStatus) : "NORMAL";`,
  "desligar alerta automático em fallback"
);

// 6) Ajusta getLagoaSourceText para mostrar "última salva".
replaceRegexOrWarn(
  /function getLagoaSourceText\(lagoa\) \{[\s\S]*?\n\}/,
  `function getLagoaSourceText(lagoa) {
  if (!lagoa?.isReal) return "Sem leitura";
  const suffix = lagoa?.isFallback ? " · última salva" : "";
  if (lagoa?.hidrosens) return "HidroSens/UFPel" + suffix;
  if (lagoa?.radar) return "RADAR Lagoa dos Patos" + suffix;
  if (lagoa?.anaLevel !== null && lagoa?.anaLevel !== undefined) return "ANA HidroWeb";
  return "Fonte validada" + suffix;
}`,
  "getLagoaSourceText com indicação de fallback"
);

// 7) Mensagem visual de fallback no card, abaixo do horário da fonte.
const sourceTimeLine = `<div style={{ fontSize:8, color:t.textMuted }}>{measuredAt ? formatDateTimeBR(measuredAt) : "horário não informado"}</div>`;
const sourceTimeLineFallback = `<div style={{ fontSize:8, color:t.textMuted }}>{measuredAt ? formatDateTimeBR(measuredAt) : "horário não informado"}</div>
                            {lagoa?.isFallback && (
                              <div style={{ fontSize:8, color:"#eab308", marginTop:3 }}>
                                fallback local · última leitura salva{lagoa.fallback_age_minutes ? \` há \${lagoa.fallback_age_minutes} min\` : ""}
                              </div>
                            )}`;

if (app.includes(sourceTimeLine) && !app.includes("fallback local · última leitura salva")) {
  app = app.replace(sourceTimeLine, sourceTimeLineFallback);
}

// 8) No topo/resumo, se quiser contar leitura fallback como leitura real, mantém monitored;
//    mas o card indicará claramente quando for fallback.

fs.writeFileSync(appPath, app, "utf8");

console.log("Fallback local de últimas leituras da Lagoa implementado.");
console.log("Regras: cache até 6h; fallback não eleva risco automático.");
console.log("Backup preservado em src/App.jsx.backup-fallback-lagoa.");
console.log("Agora rode: npm run build");
