const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-saude-ok-fix2-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

let changes = 0;

function fail(msg) {
  console.error("ERRO:", msg);
  fs.writeFileSync(appPath, app, "utf8");
  process.exit(1);
}

function replaceRegex(regex, replacement, label) {
  const before = app;
  app = app.replace(regex, replacement);
  if (before === app) {
    console.log(`AVISO: não aplicou: ${label}`);
    return false;
  }
  changes++;
  console.log(`OK: ${label}`);
  return true;
}

function replaceAll(search, replacement, label) {
  if (!app.includes(search)) {
    console.log(`AVISO: não encontrou: ${label}`);
    return false;
  }
  app = app.split(search).join(replacement);
  changes++;
  console.log(`OK: ${label}`);
  return true;
}

// 1) Insere helper robusto dentro do componente, logo após getRiskBg.
// Esse helper não depende do formato atual do map da saúde.
if (!app.includes("function getValidatedSourceHealth(name)")) {
  const anchorRegex = /const getRiskBg = \(lvl\) => \{[\s\S]*?\n  \};/;
  const helper = `$&

  function getValidatedSourceHealth(name) {
    const existing = sourceHealthRef.current?.[name] || sourceHealth?.[name] || null;
    if (existing) return existing;

    if (name === "NOAA/CPC ENSO" && ensoLive && typeof ensoLive.nino34 === "number") {
      return { ok: true, lastOk: ensoLive.fetchedAt || ensoLive.referenceDate || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "IRI/CCSR ENSO" && ensoProbLive && ensoProbLive.prob && typeof ensoProbLive.prob.elNino === "number") {
      return { ok: true, lastOk: ensoProbLive.probabilityFetchedAt || ensoProbLive.probabilityReferenceDate || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "CPTEC/INPE" && cptecProducts && (cptecProducts.ok === true || Array.isArray(cptecProducts.products))) {
      return { ok: true, lastOk: cptecProducts.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus Water" && copernicusWater && copernicusWater.ok === true && typeof copernicusWater.water_percent === "number") {
      return { ok: true, lastOk: copernicusWater.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus Sentinel-1" && copernicusS1 && (copernicusS1.status === "OK" || copernicusS1.ok === true) && typeof copernicusS1.water_like_percent === "number") {
      return { ok: true, lastOk: copernicusS1.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus NDVI" && copernicusNdvi && copernicusNdvi.ok === true && typeof copernicusNdvi.ndvi_mean === "number") {
      return { ok: true, lastOk: copernicusNdvi.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    return null;
  }`;

  if (!replaceRegex(anchorRegex, helper, "helper getValidatedSourceHealth")) {
    fail("não encontrei âncora getRiskBg para inserir helper");
  }
}

// 2) No painel de saúde, troca leitura direta sourceHealth[name] por helper.
// Funciona mesmo se o trecho já foi alterado por patches anteriores.
let changedH = false;

changedH = replaceAll(
  "const h = sourceHealth[name];",
  "const h = getValidatedSourceHealth(name);",
  "sourceHealth[name] -> getValidatedSourceHealth"
) || changedH;

changedH = replaceAll(
  "let h = sourceHealth[name];",
  "let h = getValidatedSourceHealth(name);",
  "let sourceHealth[name] -> getValidatedSourceHealth"
) || changedH;

// Se o painel já usava sourceHealthRef direto:
changedH = replaceAll(
  "const h = sourceHealthRef.current[name] || sourceHealth[name];",
  "const h = getValidatedSourceHealth(name);",
  "sourceHealthRef/sourceHealth -> getValidatedSourceHealth"
) || changedH;

if (!app.includes("getValidatedSourceHealth(name)")) {
  fail("o painel não passou a chamar getValidatedSourceHealth(name)");
}

// 3) Remove blocos antigos de inferência, se ficaram duplicados e conflitantes.
replaceRegex(
  /\/\/ Inferência visual:[\s\S]*?if \(name === "Copernicus NDVI"[\s\S]*?\}\s*\n\s*\}\s*\n\s*const never = !h;/,
  "const never = !h;",
  "remove inferência visual antiga"
);

replaceRegex(
  /\/\/ Saúde validada:[\s\S]*?if \(name === "Copernicus NDVI"[\s\S]*?\}\s*\n\s*\}\s*\n\s*const never = !h;/,
  "const never = !h;",
  "remove saúde validada antiga duplicada"
);

// 4) Label deve ser apenas OK/Falhou/Carregando/Aguardando API.
replaceRegex(
  /const label = anaComplementar \? "Aguardando API" : never \? "[^"]+" : ok \? "OK" : "Falhou";/g,
  'const label = anaComplementar ? "Aguardando API" : never ? "Carregando" : ok ? "OK" : "Falhou";',
  "label restrito OK/Falhou/Carregando/Aguardando API"
);

// 5) Latência validada: se não há latência medida, exibir OK, não carregado/existe/nullms.
replaceRegex(
  /\{h\.latencyMs\}ms/g,
  '{typeof h.latencyMs === "number" ? h.latencyMs + "ms" : "OK"}',
  "latência h.latencyMs -> OK"
);

replaceRegex(
  /\{typeof h\.latencyMs === "number" \? h\.latencyMs \+ "ms" : "[^"]+"\}/g,
  '{typeof h.latencyMs === "number" ? h.latencyMs + "ms" : "OK"}',
  "latência inferida -> OK"
);

// 6) Atualiza auditor próprio se existir para aceitar helper centralizado.
const auditPath = path.join(process.cwd(), "scripts", "auditar-saude-ok-validado.cjs");
if (fs.existsSync(auditPath)) {
  let audit = fs.readFileSync(auditPath, "utf8");
  audit = audit.replace(
    /const checks = \[[\s\S]*?\];/,
`const checks = [
  ["helper central", app.includes("function getValidatedSourceHealth(name)")],
  ["NOAA validado", app.includes('name === "NOAA/CPC ENSO" && ensoLive && typeof ensoLive.nino34 === "number"')],
  ["IRI validado", app.includes('name === "IRI/CCSR ENSO" && ensoProbLive && ensoProbLive.prob && typeof ensoProbLive.prob.elNino === "number"')],
  ["CPTEC validado", app.includes('name === "CPTEC/INPE" && cptecProducts')],
  ["Copernicus Water validado", app.includes('name === "Copernicus Water" && copernicusWater')],
  ["Copernicus Sentinel-1 validado", app.includes('name === "Copernicus Sentinel-1" && copernicusS1')],
  ["Copernicus NDVI validado", app.includes('name === "Copernicus NDVI" && copernicusNdvi')],
  ["painel usa helper", app.includes("getValidatedSourceHealth(name)")],
  ["sem termo existe", !app.includes('"existe"') && !app.includes(">existe<")],
  ["label OK", app.includes('ok ? "OK" : "Falhou"')],
];`
  );
  fs.writeFileSync(auditPath, audit, "utf8");
  console.log("OK: auditor-saude-ok-validado atualizado");
}

// 7) Validações finais no App.
const required = [
  "function getValidatedSourceHealth(name)",
  'name === "NOAA/CPC ENSO" && ensoLive && typeof ensoLive.nino34 === "number"',
  'name === "IRI/CCSR ENSO" && ensoProbLive && ensoProbLive.prob && typeof ensoProbLive.prob.elNino === "number"',
  'name === "CPTEC/INPE" && cptecProducts',
  'name === "Copernicus Water" && copernicusWater',
  'name === "Copernicus Sentinel-1" && copernicusS1',
  'name === "Copernicus NDVI" && copernicusNdvi',
  "getValidatedSourceHealth(name)",
  'ok ? "OK" : "Falhou"',
];

const missing = required.filter((needle) => !app.includes(needle));
if (missing.length) {
  console.error("ERRO: marcadores ausentes:");
  for (const item of missing) console.error(" - " + item);
  fs.writeFileSync(appPath, app, "utf8");
  process.exit(1);
}

if (app.includes('"existe"') || app.includes(">existe<")) {
  fail("texto 'existe' encontrado no App.jsx");
}

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log(`Patch saúde OK validado FIX2 aplicado. Alterações: ${changes}`);
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
console.log("node scripts\\auditar-coerencia-v23.cjs");
console.log("node scripts\\auditar-saude-ok-validado.cjs");
