const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const APP_PATH = path.join(ROOT, "src", "App.jsx");
const PUBLIC_DIR = path.join(ROOT, "public");

const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";
const FUNCTIONS = {
  defesaCivil: `https://${PROJECT_REF}.supabase.co/functions/v1/defesa-civil-rs`,
  lagoaRadar: `https://${PROJECT_REF}.supabase.co/functions/v1/lagoa-patos-radar`,
  hidrosens: `https://${PROJECT_REF}.supabase.co/functions/v1/hidrosens-laranjal`,
};

const EXPECTED_LAGOA_ORDER = [
  "Itapuã",
  "Arambaré",
  "São Lourenço do Sul",
  "Pelotas / Laranjal",
  "São José do Norte",
  "Rio Grande / FURG CCMAR",
];

const EXPECTED_LAGOA_IDS = [
  "lagoa_patos_poa",
  "lagoa_patos_arambare",
  "lagoa_sao_lourenco",
  "lagoa_patos_pelotas",
  "lagoa_sao_jose_norte",
  "lagoa_rio_grande",
];

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function warn(msg) {
  console.log(`⚠️  ${msg}`);
}

function fail(msg) {
  console.log(`❌ ${msg}`);
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function readApp() {
  if (!fs.existsSync(APP_PATH)) {
    fail("src/App.jsx não encontrado.");
    process.exitCode = 1;
    return "";
  }
  return fs.readFileSync(APP_PATH, "utf8");
}

function extractStationsLagoa(app) {
  const match = app.match(/const STATIONS_LAGOA = \[([\s\S]*?)\];/);
  return match ? match[1] : "";
}

function checkCards(app) {
  section("1. Cards da Lagoa dos Patos");

  const block = extractStationsLagoa(app);

  if (!block) {
    fail("Não encontrei STATIONS_LAGOA.");
    process.exitCode = 1;
    return;
  }

  const hasGuaiba = /guaiba_sul_poa|Guaíba \/ Sul POA|Sistema Guaíba/.test(block);
  if (hasGuaiba) {
    fail("Guaíba / Sul POA ainda aparece em STATIONS_LAGOA. Remover da aba Lagoa.");
    process.exitCode = 1;
  } else {
    ok("Guaíba / Sul POA não está na lista da Lagoa.");
  }

  for (const id of EXPECTED_LAGOA_IDS) {
    if (block.includes(id)) ok(`ID presente: ${id}`);
    else {
      fail(`ID faltando: ${id}`);
      process.exitCode = 1;
    }
  }

  for (const name of EXPECTED_LAGOA_ORDER) {
    if (block.includes(name)) ok(`Card presente: ${name}`);
    else {
      fail(`Card faltando: ${name}`);
      process.exitCode = 1;
    }
  }

  const positions = EXPECTED_LAGOA_ORDER.map((name) => block.indexOf(name));
  const ordered = positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]));

  if (ordered) ok("Ordem da Lagoa correta: Itapuã → Rio Grande.");
  else {
    fail("Ordem dos cards da Lagoa está fora da sequência definida.");
    process.exitCode = 1;
  }

  if (/lagoa_patos_pelotas[\s\S]*sourceHint:\s*"HIDROSENS"/.test(block)) {
    ok("Pelotas / Laranjal está vinculado a HidroSens.");
  } else {
    warn("Não confirmei sourceHint HIDROSENS em Pelotas / Laranjal.");
  }
}

async function safeFetchJson(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, text, json };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function checkOfficialAlerts() {
  section("2. Alertas oficiais — Defesa Civil RS");

  const r = await safeFetchJson(FUNCTIONS.defesaCivil);

  if (!r.ok) {
    fail(`defesa-civil-rs falhou: ${r.status || r.error}`);
    process.exitCode = 1;
    return;
  }

  if (r.json?.source?.includes("Defesa Civil")) ok("Fonte Defesa Civil RS retornando JSON.");
  else warn("Resposta da Defesa Civil não trouxe source esperado.");

  if (Array.isArray(r.json?.alerts)) ok(`alerts[] presente. Quantidade atual: ${r.json.alerts.length}`);
  else {
    fail("Resposta da Defesa Civil não possui alerts[].");
    process.exitCode = 1;
  }

  if (r.json?.mode) ok(`Modo de filtro: ${r.json.mode}`);
  else warn("Resposta não informa mode.");

  console.log("Observação: count=0 é aceitável se não houver alerta oficial vigente.");
}

async function checkLagoaSources() {
  section("3. Fontes reais da Lagoa");

  const radar = await safeFetchJson(FUNCTIONS.lagoaRadar);
  if (!radar.ok) {
    fail(`lagoa-patos-radar falhou: ${radar.status || radar.error}`);
    process.exitCode = 1;
  } else {
    const count = radar.json?.count ?? radar.json?.sensors?.filter?.((s) => s.ok)?.length;
    if (count >= 5) ok(`Lagoa RADAR OK. Sensores válidos: ${count}/5.`);
    else {
      warn(`Lagoa RADAR respondeu, mas sensores válidos parecem menores que 5. count=${count}`);
    }
  }

  const hidrosens = await safeFetchJson(FUNCTIONS.hidrosens);
  if (!hidrosens.ok) {
    fail(`hidrosens-laranjal falhou: ${hidrosens.status || hidrosens.error}`);
    process.exitCode = 1;
  } else {
    if (hidrosens.json?.ok && typeof hidrosens.json?.level_m === "number") {
      ok(`HidroSens Laranjal OK. Nível atual: ${hidrosens.json.level_m} m.`);
    } else {
      fail("HidroSens respondeu, mas não trouxe ok:true com level_m numérico.");
      process.exitCode = 1;
    }

    if (hidrosens.json?.threshold_m === 1.2 && hidrosens.json?.critical_threshold_m === 1.4) {
      ok("Limiares HidroSens adotados: alerta 1,20 m; crítico 1,40 m.");
    } else {
      warn(`Limiares HidroSens diferentes do esperado. threshold=${hidrosens.json?.threshold_m}; critical=${hidrosens.json?.critical_threshold_m}`);
    }

    if (hidrosens.json?.max_may_2024_m === 2.4) {
      ok("Máx. maio/2024 HidroSens adotado: 2,40 m.");
    } else {
      warn(`Máx. maio/2024 HidroSens diferente do esperado: ${hidrosens.json?.max_may_2024_m}`);
    }
  }
}

function checkRiskRules(app) {
  section("4. Regra de risco clara");

  if (app.includes("radarRiskToLevel")) ok("Função radarRiskToLevel encontrada.");
  else warn("Função radarRiskToLevel não encontrada.");

  if (app.includes("threshold_m")) ok("Uso de threshold_m encontrado.");
  else {
    fail("Não encontrei threshold_m.");
    process.exitCode = 1;
  }

  if (app.includes("critical_threshold_m")) ok("Uso de critical_threshold_m encontrado.");
  else warn("critical_threshold_m não encontrado no App.jsx.");

  if (app.includes("!lagoa?.isFallback") || app.includes("!lagoa.isFallback")) {
    ok("Fallback não eleva risco automático.");
  } else {
    warn("Não confirmei regra bloqueando alerta automático por fallback.");
  }

  if (!app.includes("alerta 0.8m") && !app.includes("alerta 0,8m")) {
    ok("Regra antiga de alerta único 0,8 m não aparece.");
  } else {
    fail("Regra antiga de alerta 0,8 m ainda aparece no código.");
    process.exitCode = 1;
  }
}

function checkPwa() {
  section("5. PWA / Push");

  const candidatesManifest = [
    path.join(PUBLIC_DIR, "manifest.webmanifest"),
    path.join(PUBLIC_DIR, "manifest.json"),
    path.join(ROOT, "manifest.webmanifest"),
    path.join(ROOT, "manifest.json"),
  ];

  const manifest = candidatesManifest.find(fs.existsSync);
  if (manifest) ok(`Manifest encontrado: ${path.relative(ROOT, manifest)}`);
  else warn("Manifest PWA não encontrado nos caminhos comuns.");

  const swCandidates = [
    path.join(PUBLIC_DIR, "sw.js"),
    path.join(PUBLIC_DIR, "service-worker.js"),
    path.join(ROOT, "sw.js"),
    path.join(ROOT, "service-worker.js"),
  ];

  const sw = swCandidates.find(fs.existsSync);
  if (sw) ok(`Service Worker encontrado: ${path.relative(ROOT, sw)}`);
  else warn("Service Worker não encontrado nos caminhos comuns.");

  const app = readApp();
  if (/Notification|PushManager|serviceWorker|navigator\.serviceWorker/i.test(app)) {
    ok("Código possui referência a Notification/Push/Service Worker.");
  } else {
    warn("Não encontrei referência clara a Push/Service Worker no App.jsx.");
  }
}

function checkMediumLow(app) {
  section("6. Prioridade média/baixa — estado atual");

  if (/hist[oó]rico|ultimos-dias|chart|timeseries|gr[aá]fico/i.test(app)) {
    ok("Há indícios de histórico/gráfico no código.");
  } else {
    warn("Histórico/gráfico por estação ainda não parece implementado.");
  }

  if (/sa[uú]de das fontes|health|source health|status da fonte/i.test(app)) {
    ok("Saúde das fontes parece existir.");
  } else {
    warn("Saúde das fontes ainda não parece implementada.");
  }

  if (/desatualizado|stale|última salva|ultima salva|fallback/i.test(app)) {
    ok("Há indicação de fallback/aviso de dado salvo/desatualizado.");
  } else {
    warn("Aviso de dado desatualizado ainda não confirmado.");
  }

  if (/diagn[oó]stico|debug|painel t[eé]cnico/i.test(app)) {
    ok("Painel técnico/diagnóstico encontrado.");
  } else {
    warn("Painel técnico detalhado ainda não implementado, prioridade baixa.");
  }
}

async function main() {
  console.log("SENTINELA·RS — Auditoria de Prioridades");
  console.log(`Projeto: ${ROOT}`);
  console.log(`Data: ${new Date().toISOString()}`);

  const app = readApp();

  checkCards(app);
  await checkOfficialAlerts();
  await checkLagoaSources();
  checkRiskRules(app);
  checkPwa();
  checkMediumLow(app);

  section("Resultado");
  if (process.exitCode) {
    console.log("Resultado geral: verificar itens marcados com ❌.");
  } else {
    console.log("Resultado geral: prioridades altas auditadas sem falha crítica.");
  }
}

main();
