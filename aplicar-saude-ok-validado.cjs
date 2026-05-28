const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-saude-ok-validado-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

let changes = 0;

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

// 1) Substitui o bloco de inferência visual da saúde por uma versão com resposta validada.
// Objetivo: mostrar OK, não "existe", quando a fonte já respondeu com dado validado.
replaceRegex(
/\/\/ Inferência visual: algumas fontes carregam por useEffect próprio\.[\s\S]*?const never = !h;\s*const ok = h\?\.ok;/,
`// Saúde validada: algumas fontes carregam por useEffect próprio.
                  // Quando já há resposta validada, o painel mostra OK.
                  if (!h) {
                    if (name === "NOAA/CPC ENSO" && ensoLive && typeof ensoLive.nino34 === "number") {
                      h = { ok:true, lastOk: ensoLive.fetchedAt || ensoLive.referenceDate || new Date().toISOString(), latencyMs:null };
                    }
                    if (name === "IRI/CCSR ENSO" && ensoProbLive && ensoProbLive.prob && typeof ensoProbLive.prob.elNino === "number") {
                      h = { ok:true, lastOk: ensoProbLive.probabilityFetchedAt || ensoProbLive.prob?.referenceDate || new Date().toISOString(), latencyMs:null };
                    }
                    if (name === "CPTEC/INPE" && cptecProducts?.ok === true && Array.isArray(cptecProducts?.products) && cptecProducts.products.length > 0) {
                      h = { ok:true, lastOk: cptecProducts.fetched_at || new Date().toISOString(), latencyMs:null };
                    }
                    if (name === "Copernicus Water" && copernicusWater?.ok === true && typeof copernicusWater.water_percent === "number") {
                      h = { ok:true, lastOk: copernicusWater.fetched_at || new Date().toISOString(), latencyMs:null };
                    }
                    if (name === "Copernicus Sentinel-1" && copernicusS1?.status === "OK" && typeof copernicusS1.water_like_percent === "number") {
                      h = { ok:true, lastOk: copernicusS1.fetched_at || new Date().toISOString(), latencyMs:null };
                    }
                    if (name === "Copernicus NDVI" && copernicusNdvi?.ok === true && typeof copernicusNdvi.ndvi_mean === "number") {
                      h = { ok:true, lastOk: copernicusNdvi.fetched_at || new Date().toISOString(), latencyMs:null };
                    }
                  }

                  const never = !h;
                  const ok = h?.ok;`,
"saúde validada ENSO/CPTEC/Copernicus"
);

// 2) Garante que o label continue usando apenas OK/Falhou/Carregando/Aguardando API.
replaceRegex(
/const label = anaComplementar \? "Aguardando API" : never \? "Carregando" : ok \? "OK" : "Falhou";/,
'const label = anaComplementar ? "Aguardando API" : never ? "Carregando" : ok ? "OK" : "Falhou";',
"label restrito"
);

// 3) Troca latência inferida por texto limpo, não "existe" nem "carregado".
replaceRegex(
/\{typeof h\.latencyMs === "number" \? h\.latencyMs \+ "ms" : "carregado"\}/g,
'{typeof h.latencyMs === "number" ? h.latencyMs + "ms" : "OK"}',
"latência inferida como OK"
);

// 4) Se o patch anterior não tinha esta forma, troca 'carregado' solto apenas no painel de latência.
replaceAll(
'Latência: {typeof h.latencyMs === "number" ? h.latencyMs + "ms" : "carregado"}',
'Latência: {typeof h.latencyMs === "number" ? h.latencyMs + "ms" : "OK"}',
"latência carregado -> OK"
);

// 5) Validações.
const required = [
  'name === "NOAA/CPC ENSO" && ensoLive && typeof ensoLive.nino34 === "number"',
  'name === "IRI/CCSR ENSO" && ensoProbLive && ensoProbLive.prob && typeof ensoProbLive.prob.elNino === "number"',
  'name === "CPTEC/INPE" && cptecProducts?.ok === true',
  'name === "Copernicus Water" && copernicusWater?.ok === true',
  'name === "Copernicus Sentinel-1" && copernicusS1?.status === "OK"',
  'name === "Copernicus NDVI" && copernicusNdvi?.ok === true',
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
  console.error("ERRO: texto 'existe' encontrado no App.jsx.");
  fs.writeFileSync(appPath, app, "utf8");
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log(`Patch saúde OK validado aplicado. Alterações: ${changes}`);
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
console.log("node scripts\\auditar-coerencia-v23.cjs");
