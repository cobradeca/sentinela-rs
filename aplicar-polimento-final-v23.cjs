const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-polimento-final-v23-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

let changes = 0;

function replaceAll(search, replacement, label) {
  if (!app.includes(search)) {
    console.log(`AVISO: não encontrei: ${label}`);
    return false;
  }
  app = app.split(search).join(replacement);
  changes++;
  console.log(`OK: ${label}`);
  return true;
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

// 1) Texto Copernicus Water ainda antigo.
replaceAll(
  "Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, usar Sentinel-1 no próximo bloco.",
  "Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, compare com o indicador Sentinel-1 abaixo.",
  "Copernicus Water: Sentinel-1 já ativo"
);

// 2) Limpa referência histórica de queimadas que ficou estranha: "(indisponível focos INPE)".
replaceAll(
  "2022: recorde de focos no RS (indisponível focos INPE). Pampa e Serra Gaúcha mais afetados.",
  "Referência histórica de queimadas no RS. Não é dado operacional atual.",
  "Copernicus reference queimadas limpa"
);

// 3) Remove frase de uso operacional que promete tempo real dentro do card de referência.
replaceAll(
  "Focos consultados em tempo real via INPE BDQueimadas (aba Queimadas)",
  "Quando a API INPE estiver disponível, consultar focos em tempo real na aba Queimadas",
  "Copernicus reference queimadas sem promessa operacional"
);

// 4) Saúde das fontes: inferir OK para fontes que já têm dados carregados, mesmo se sourceHealth ainda estiver vazio.
// Substitui o trecho dentro do mapa de saúde, de forma conservadora.
replaceRegex(
  /const h = sourceHealth\[name\];\s*const never = !h;\s*const ok = h\?\.ok;\s*const anaComplementar = name === "ANA HidroWeb" && \(!h \|\| !ok\);/g,
  `let h = sourceHealth[name];

                  // Inferência visual: algumas fontes carregam por useEffect próprio.
                  // Se o dado já está presente na aba, não deixar o painel preso em "Carregando".
                  if (!h) {
                    if (name === "NOAA/CPC ENSO" && ensoLive?.dynamic) h = { ok:true, lastOk: ensoLive.fetchedAt || new Date().toISOString(), latencyMs:null };
                    if (name === "IRI/CCSR ENSO" && ensoProbLive?.probabilityDynamic) h = { ok:true, lastOk: ensoProbLive.probabilityFetchedAt || new Date().toISOString(), latencyMs:null };
                    if (name === "CPTEC/INPE" && cptecProducts?.ok) h = { ok:true, lastOk: cptecProducts.fetched_at || new Date().toISOString(), latencyMs:null };
                    if (name === "Copernicus Water" && copernicusWater?.water_percent !== undefined) h = { ok:true, lastOk: copernicusWater.fetched_at || new Date().toISOString(), latencyMs:null };
                    if (name === "Copernicus Sentinel-1" && copernicusS1?.water_like_percent !== undefined) h = { ok:true, lastOk: copernicusS1.fetched_at || new Date().toISOString(), latencyMs:null };
                    if (name === "Copernicus NDVI" && copernicusNdvi?.ndvi_mean !== undefined) h = { ok:true, lastOk: copernicusNdvi.fetched_at || new Date().toISOString(), latencyMs:null };
                  }

                  const never = !h;
                  const ok = h?.ok;
                  const anaComplementar = name === "ANA HidroWeb" && (!h || !ok);`,
  "Fontes: inferência visual de saúde para ENSO/CPTEC/Copernicus"
);

// 5) Evita "Latência: nullms" caso a inferência não tenha latência.
replaceRegex(
  /\{h\.latencyMs\}ms/g,
  `{typeof h.latencyMs === "number" ? h.latencyMs + "ms" : "carregado"}`,
  "latência inferida sem nullms"
);

// 6) INMET falhando: deixa claro que app usa Open-Meteo como primária de previsão 14d e INMET é oficial complementar quando disponível.
replaceAll(
  "Previsão oficial por município via apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Conectado diretamente no navegador.",
  "Previsão oficial por município via apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Complementa a previsão 14 dias; se falhar no navegador, verificar junto ao INMET.",
  "INMET descrito como complementar quando falha"
);

// Validação.
const forbidden = [
  "Sentinel-1 no próximo bloco",
  "indisponível focos INPE",
  "Focos consultados em tempo real via INPE BDQueimadas (aba Queimadas)",
  "nullms"
];

const leftovers = forbidden.filter((needle) => app.includes(needle));
if (leftovers.length) {
  console.error("ERRO: ainda restam textos proibidos/desatualizados:");
  for (const item of leftovers) console.error(" - " + item);
  fs.writeFileSync(appPath, app, "utf8");
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log(`Polimento final v2.3 aplicado. Alterações: ${changes}`);
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
console.log("node scripts\\auditar-coerencia-v23.cjs");
