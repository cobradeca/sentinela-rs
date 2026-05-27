const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
const brokenPatchPath = path.join(process.cwd(), "aplicar-correcao-coerencia-v23.cjs");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-coerencia-v23-fix-${Date.now()}`);
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

// 0) Corrige o script quebrado, se ainda existir, para evitar novo ReferenceError.
if (fs.existsSync(brokenPatchPath)) {
  let broken = fs.readFileSync(brokenPatchPath, "utf8");
  if (broken.includes("\n  False\n")) {
    broken = broken.replace(/\n  False\n/g, "\n  false\n");
    fs.writeFileSync(brokenPatchPath, broken, "utf8");
    console.log("OK: corrigido False -> false no script antigo");
  }
}

// 1) WMO oficial. Se o primeiro patch parou depois de escrever parcialmente, garante o bloco correto.
const wmoRegex = /const\s+WMO_WEATHER\s*=\s*\{[\s\S]*?\};\s*\n\s*const\s+wmoDesc\s*=\s*\(c\)\s*=>[\s\S]*?;\s*\n\s*const\s+wmoEmoji\s*=\s*\(c\)\s*=>[\s\S]*?;/;
const oldWmoRegex = /const wmoDesc\s*=\s*\(c\)\s*=>[\s\S]*?;\s*\nconst wmoEmoji\s*=\s*\(c\)\s*=>[\s\S]*?;/;

const wmoBlock = `const WMO_WEATHER = {
  0: ["☀️", "Céu claro"],
  1: ["🌤️", "Principalmente claro"],
  2: ["⛅", "Parcialmente nublado"],
  3: ["☁️", "Nublado"],
  45: ["🌫️", "Neblina"],
  48: ["🌫️", "Neblina com geada"],
  51: ["🌦️", "Garoa fraca"],
  53: ["🌧️", "Garoa"],
  55: ["🌧️", "Garoa forte"],
  56: ["🌧️", "Garoa congelante fraca"],
  57: ["🌧️", "Garoa congelante forte"],
  61: ["🌧️", "Chuva fraca"],
  63: ["🌧️", "Chuva"],
  65: ["🌧️", "Chuva forte"],
  66: ["🌧️", "Chuva congelante fraca"],
  67: ["🌧️", "Chuva congelante forte"],
  71: ["❄️", "Neve fraca"],
  73: ["❄️", "Neve"],
  75: ["❄️", "Neve intensa"],
  77: ["❄️", "Grãos de neve"],
  80: ["🌦️", "Pancadas fracas"],
  81: ["🌧️", "Pancadas"],
  82: ["⛈️", "Pancadas fortes"],
  85: ["❄️", "Pancadas de neve"],
  86: ["❄️", "Pancadas fortes de neve"],
  95: ["⛈️", "Tempestade"],
  96: ["⛈️", "Tempestade com granizo"],
  99: ["⛈️", "Tempestade forte com granizo"],
};

const wmoDesc  = (c) => WMO_WEATHER[Number(c)]?.[1] || "Condição meteorológica";
const wmoEmoji = (c) => WMO_WEATHER[Number(c)]?.[0] || "🌦️";`;

if (app.includes("const WMO_WEATHER")) {
  replaceRegex(wmoRegex, wmoBlock, "normaliza bloco WMO existente");
} else {
  replaceRegex(oldWmoRegex, wmoBlock, "substitui WMO antigo");
}

// 2) Critério diário: aplica de forma ampla.
replaceRegex(
  /const dailyRisk\s*=\s*\(p,\s*tn,\s*w\)\s*=>\s*\{[\s\S]*?return\s+"NORMAL";\s*\}/,
`const dailyRisk = (p, tn, w) => {
  // Critério diário conservador:
  // 10–20mm = acompanhamento/atenção leve; 20mm+ = atenção operacional.
  // Não é alerta oficial; é triagem local para o card diário.
  if (p >= 80 || w >= 80 || tn < 0) return "CRITICO";
  if (p >= 40 || w >= 50 || tn < 5) return "ALERTA";
  if (p >= 10 || w >= 30 || tn < 10) return "ATENCAO";
  return "NORMAL";
}`,
  "critério dailyRisk"
);

replaceAll("p*1.5>30||w>35||tn<10", "p>=10||w>=30||tn<10", "critério diário inline compacto");
replaceAll("p * 1.5 > 30 || w > 35 || tn < 10", "p >= 10 || w >= 30 || tn < 10", "critério diário inline espaçado");

// 3) Alertas: remove +0,9°C hardcoded em qualquer variação comum.
replaceRegex(
  /🌡️\s*El Niño\s*\(\+0,9°C\)\s*em desenvolvimento\.[\s\S]{0,180}?Risco elevado no RS\./g,
  "🌡️ ENSO — contexto climático: condição observada Neutro · Niño 3.4 +0.47°C. IRI/CCSR: 98% de probabilidade de El Niño em Mai–Jul 2026. Não gera alerta operacional sozinho.",
  "remove +0,9°C hardcoded"
);

replaceAll(
  "🌡️ El Niño (+0,9°C) em desenvolvimento. Probabilidade–jul 2026: 98% (NOAA/IRI). Risco elevado no RS.",
  "🌡️ ENSO — contexto climático: condição observada Neutro · Niño 3.4 +0.47°C. IRI/CCSR: 98% de probabilidade de El Niño em Mai–Jul 2026. Não gera alerta operacional sozinho.",
  "remove frase exata +0,9°C"
);

// 4) Copernicus Water.
replaceAll(
  "Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, usar Sentinel-1 no próximo bloco.",
  "Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, compare com o indicador Sentinel-1 abaixo.",
  "corrige texto Sentinel-1 próximo bloco"
);

// 5) Cota de alerta.
replaceAll("Cota de inundação", "Cota de alerta", "Cota de inundação -> Cota de alerta");

// 6) CPTEC ATIVO.
replaceRegex(
  /\{\s*n:"CPTEC\/INPE",\s*st:"PLANEJADO",\s*c:"#eab308",\s*d:"Produtos sazonais\/subsazonais oficiais por imagem via Edge Function\.",\s*a:"API pública",\s*h:"1\. servicos\.cptec\.inpe\.br\/XML\/cidade\/\{id\}\/previsao\.xml\\n2\. Proxy via Supabase Edge Function \(CORS\)"\s*\},/,
  '{ n:"CPTEC/INPE",                st:"ATIVO", c:"#22c55e", d:"Produtos sazonais/subsazonais oficiais por imagem via Edge Function. Uso: contexto climático, não alerta local imediato.", a:"API pública via Supabase Edge Function", h:"Endpoint: cptec-inpe-produtos. Produtos gráficos oficiais sazonais/subsazonais. Não são série numérica JSON e não disparam alerta local sozinhos." },',
  "CPTEC ATIVO"
);

// 7) Queimadas: remove números históricos/risco estrutural do card operacional.
// Tenta várias formas, pois JSX pode estar em arrays/cards.
replaceRegex(
  /API INPE indisponível — dados de referência histórica:[\s\S]*?Risco 2026\/27[\s\S]*?ALTO/g,
  "API INPE BDQueimadas indisponível no momento. Sem dado operacional de focos nas últimas 48h. Verifique junto ao INPE BDQueimadas.",
  "remove bloco histórico queimadas"
);

replaceRegex(
  /Focos 2022 \(recorde\)[\s\S]*?Risco 2026\/27[\s\S]*?ALTO/g,
  "Fonte primária INPE indisponível. Sem dado operacional de focos nas últimas 48h.",
  "remove métricas históricas queimadas"
);

replaceAll("Focos 2022 (recorde)", "Fonte primária INPE", "remove rótulo Focos 2022");
replaceAll("3.200+", "indisponível", "remove valor 3.200+");
replaceAll("Focos 2023", "Última consulta INPE", "remove rótulo Focos 2023");
replaceAll("~1.800", "sem dado operacional", "remove valor 1800");
replaceAll("Focos 2024", "Status", "remove rótulo Focos 2024");
replaceAll("~900", "verificar INPE", "remove valor 900");
replaceAll("Risco 2026/27", "Uso operacional", "remove rótulo Risco 2026/27");
replaceAll("ALTO", "NÃO USAR COMO ALERTA", "remove ALTO estrutural");

replaceRegex(
  /ℹ️ Probabilidades EFFIS[\s\S]*?Copernicus\./g,
  "ℹ️ EFFIS não está conectado em tempo real nesta versão. Não usar estimativa estrutural como alerta operacional.",
  "EFFIS sem probabilidade estrutural"
);

replaceAll(
  "🗓 Risco estrutural por bioma — dado de referência EFFIS, não tempo real. Valores reflectem histórico + sazonalidade + El Niño.",
  "🗓 Referência por bioma — EFFIS não conectado em tempo real nesta versão. Não aciona alerta operacional.",
  "EFFIS referência por bioma"
);

// 8) Health: Aguardando -> Carregando para fontes ainda não marcadas no primeiro render.
replaceAll(
  'const label = anaComplementar ? "Aguardando API" : never ? "Aguardando" : ok ? "OK" : "Falhou";',
  'const label = anaComplementar ? "Aguardando API" : never ? "Carregando" : ok ? "OK" : "Falhou";',
  "Aguardando -> Carregando"
);

// 9) Ajusta auditor se ele estiver muito rígido para "Focos 2022" em seção histórica.
// Não removemos do auditor aqui; a validação abaixo garante o App limpo.

// Validação final.
const forbidden = [
  "+0,9°C",
  "Risco 2026/27",
  "Focos 2022",
  "Focos 2023",
  "Focos 2024",
  "Sentinel-1 no próximo bloco",
  'CPTEC/INPE",                st:"PLANEJADO"',
  "Probabilidades EFFIS (Pampa Médio-Alto",
  "Cota de inundação",
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
console.log(`Correção V23 FIX aplicada. Alterações: ${changes}`);
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
console.log("node scripts\\auditar-coerencia-v23.cjs");
