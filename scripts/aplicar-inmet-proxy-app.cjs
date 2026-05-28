const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-inmet-proxy-${Date.now()}`);
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

// 1) Constante do proxy real.
if (!app.includes("INMET_PREVISAO_FUNCTION_URL")) {
  replaceAll(
    'const INMET_FORECAST_BASE_URL = "https://apiprevmet3.inmet.gov.br/previsao";',
    'const INMET_FORECAST_BASE_URL = "https://apiprevmet3.inmet.gov.br/previsao";\nconst INMET_PREVISAO_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/inmet-previsao";',
    "constante INMET_PREVISAO_FUNCTION_URL"
  );
}

// 2) Troca fetchInmetForecast para usar Supabase Edge Function.
// Mantém o normalizador antigo sem problema; usa o payload latest já normalizado.
replaceRegex(
  /async function fetchInmetForecast\(ibgeCode\) \{[\s\S]*?^\}/m,
`async function fetchInmetForecast(ibgeCode) {
  if (!ibgeCode) return null;

  try {
    const res = await fetch(\`\${INMET_PREVISAO_FUNCTION_URL}?codigo_ibge=\${encodeURIComponent(ibgeCode)}\`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok || !data?.latest) return null;

    return {
      ...data.latest,
      proxied: true,
      fetched_at: data.fetched_at,
    };
  } catch {
    return null;
  }
}`,
  "fetchInmetForecast via proxy Supabase"
);

// 3) Ajusta descrição da fonte INMET.
replaceAll(
  "Previsão oficial por município via apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Complementa a previsão 14 dias; se falhar no navegador, verificar junto ao INMET.",
  "Previsão oficial por município via proxy Supabase da API apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Complementa a previsão 14 dias; se falhar, verificar junto ao INMET.",
  "descrição INMET proxy"
);

replaceAll(
  "Previsão oficial por município via apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Conectado diretamente no navegador.",
  "Previsão oficial por município via proxy Supabase da API apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Complementa a previsão 14 dias; se falhar, verificar junto ao INMET.",
  "descrição INMET proxy direta"
);

// 4) Validação.
const required = [
  "INMET_PREVISAO_FUNCTION_URL",
  "inmet-previsao?codigo_ibge",
  "proxied: true",
];

const missing = required.filter((needle) => !app.includes(needle));
if (missing.length) {
  console.error("ERRO: integração INMET proxy incompleta:");
  for (const item of missing) console.error(" - " + item);
  fs.writeFileSync(appPath, app, "utf8");
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log(`INMET proxy aplicado. Alterações: ${changes}`);
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
