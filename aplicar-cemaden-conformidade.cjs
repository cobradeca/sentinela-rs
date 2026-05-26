const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
const functionPath = path.join(process.cwd(), "supabase", "functions", "cemaden-rs", "index.ts");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

if (!fs.existsSync(functionPath)) {
  console.error("ERRO: não encontrei supabase/functions/cemaden-rs/index.ts.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
let fn = fs.readFileSync(functionPath, "utf8");

const appBackup = path.join(process.cwd(), "src", "App.jsx.backup-cemaden-conformidade");
if (!fs.existsSync(appBackup)) {
  fs.writeFileSync(appBackup, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-cemaden-conformidade");
}

const fnBackup = path.join(process.cwd(), "supabase", "functions", "cemaden-rs", "index.ts.backup-conformidade");
if (!fs.existsSync(fnBackup)) {
  fs.writeFileSync(fnBackup, fn, "utf8");
  console.log("Backup criado em supabase/functions/cemaden-rs/index.ts.backup-conformidade");
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  return source.replace(search, replacement);
}

// 1) Edge Function: aumenta cache de 5 para 10 minutos para reduzir chamadas ao CEMADEN.
fn = fn.replace(
  '"Cache-Control": "public, max-age=300",',
  '"Cache-Control": "public, max-age=600, stale-while-revalidate=300",'
);

// 2) Edge Function: inclui aviso de fonte/limite no JSON.
if (!fn.includes("DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC")) {
  fn = fn.replace(
    'source: "CEMADEN PED",\n      mode: "recent_accumulations",\n      fetched_at:',
    'source: "CEMADEN PED",\n      attribution: "DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC",\n      usage_note: "Usuários externos devem respeitar o limite informado pela PED/CEMADEN de até 12 requisições por minuto.",\n      cache_seconds: 600,\n      mode: "recent_accumulations",\n      fetched_at:'
  );
}

// 3) App.jsx: adiciona constante de crédito, se possível.
if (!app.includes("CEMADEN_ATTRIBUTION")) {
  if (app.includes('const CEMADEN_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cemaden-rs";\n')) {
    app = replaceOnce(
      app,
      'const CEMADEN_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cemaden-rs";\n',
      'const CEMADEN_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cemaden-rs";\nconst CEMADEN_ATTRIBUTION = "DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC";\n',
      "constante CEMADEN_ATTRIBUTION"
    );
  } else {
    console.error("ERRO: não encontrei CEMADEN_RS_FUNCTION_URL no App.jsx.");
    process.exit(1);
  }
}

// 4) App.jsx: reforça fonte no card/linha CEMADEN com title acessível.
app = app.replace(
  '<div style={{ fontSize:8, color:"#22c55e", marginTop:3 }}>\n                          ● CEMADEN: {formatCemadenRain(d.cemaden)}\n                        </div>',
  '<div title={CEMADEN_ATTRIBUTION} style={{ fontSize:8, color:"#22c55e", marginTop:3 }}>\n                          ● CEMADEN: {formatCemadenRain(d.cemaden)}\n                        </div>'
);

// 5) App.jsx: atualiza fonte CEMADEN na aba Fontes de Dados.
app = app.replace(
  /{ n:"CEMADEN"[^}]+}/,
  `{ n:"CEMADEN",                   st:"ATIVO",     c:"#22c55e", d:"Chuva observada por acumulados recentes das PCDs CEMADEN. Fonte obrigatória: DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC.", a:"Token PED via Supabase Secret", h:"Endpoint: cemaden-rs. Cache: 10 min. Limite PED para usuário externo: até 12 requisições/minuto." }`
);

// 6) App.jsx: adiciona crédito visível no rodapé.
if (!app.includes("Fonte CEMADEN: {CEMADEN_ATTRIBUTION}")) {
  const footerOld = "Open-Meteo + INMET + CEMADEN + ANA HidroWeb + NOAA ENSO + INPE + Copernicus";
  if (app.includes(footerOld)) {
    app = app.replace(
      footerOld,
      "Open-Meteo + INMET + CEMADEN + ANA HidroWeb + NOAA ENSO + INPE + Copernicus · Fonte CEMADEN: {CEMADEN_ATTRIBUTION}"
    );
  } else {
    // fallback: add visible credit near any existing footer mention of CEMADEN
    app = app.replace(
      "Open-Meteo + ANA HidroWeb + NOAA ENSO + INPE + Copernicus",
      "Open-Meteo + INMET + CEMADEN + ANA HidroWeb + NOAA ENSO + INPE + Copernicus · Fonte CEMADEN: {CEMADEN_ATTRIBUTION}"
    );
  }
}

fs.writeFileSync(appPath, app, "utf8");
fs.writeFileSync(functionPath, fn, "utf8");

console.log("Conformidade CEMADEN aplicada.");
console.log("Ajustes feitos:");
console.log("- crédito CEMADEN visível no app;");
console.log("- CEMADEN marcado com fonte obrigatória em Fontes de Dados;");
console.log("- cache da função cemaden-rs aumentado para 10 minutos;");
console.log("- retorno JSON da função inclui attribution, usage_note e cache_seconds.");
console.log("Agora rode:");
console.log("npm run build");
console.log("supabase functions deploy cemaden-rs --no-verify-jwt");
