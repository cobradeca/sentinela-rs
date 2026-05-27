const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-coerencia-v23-${Date.now()}`);
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

function replaceRegex(regex, replacement, label, required = false) {
  const before = app;
  app = app.replace(regex, replacement);
  if (before === app) {
    if (required) {
      console.error(`ERRO: não consegui aplicar: ${label}`);
      process.exit(1);
    }
    console.log(`AVISO: não aplicou: ${label}`);
    return false;
  }
  changes++;
  console.log(`OK: ${label}`);
  return true;
}

function insertAfter(anchor, insert, label) {
  if (!app.includes(anchor)) {
    console.error(`ERRO: âncora não encontrada: ${label}`);
    process.exit(1);
  }
  if (app.includes(insert.trim().slice(0, 80))) {
    console.log(`OK: já existia: ${label}`);
    return false;
  }
  app = app.replace(anchor, anchor + insert);
  changes++;
  console.log(`OK: ${label}`);
  return true;
}

// 1) Corrige mapeamento WMO/Open-Meteo.
// Antes o app mapeava faixas amplas e podia chamar chuva de neve.
// Mapeamento oficial resumido por códigos WMO.
const oldWmo = /const wmoDesc\s*=\s*\(c\)\s*=>\s*c<=3\?"Céu claro":c<=9\?"Neblina":c<=29\?"Chuva":c<=39\?"Neve":c<=59\?"Garoa":c<=79\?"Neve intensa":c<=84\?"Pancadas":c<=94\?"Tempestade":"Tempestade severa";\s*\nconst wmoEmoji\s*=\s*\(c\)\s*=>\s*c<=3\?"☀️":c<=9\?"🌫️":c<=29\?"🌧️":c<=39\?"❄️":c<=59\?"🌧️":c<=79\?"❄️":c<=84\?"⛈️":"🌪️";/;

replaceRegex(
  oldWmo,
`const WMO_WEATHER = {
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
const wmoEmoji = (c) => WMO_WEATHER[Number(c)]?.[0] || "🌦️";`,
  "mapeamento WMO correto"
);

// 2) Ajusta risco diário: 19mm não pode ser Normal puro.
// Procura função/trecho comum de classificação diária por p, tn, w.
replaceRegex(
  /const dailyRisk\s*=\s*\(p,tn,w\)\s*=>\s*\{[^}]*if\s*\(p\*1\.5>80\|\|w>80\|\|tn<0\)\s*return\s*"CRITICO";[^}]*if\s*\(p\*1\.5>50\|\|w>50\|\|tn<5\)\s*return\s*"ALERTA";[^}]*if\s*\(p\*1\.5>30\|\|w>35\|\|tn<10\)\s*return\s*"ATENCAO";[^}]*return\s*"NORMAL";\s*\}/s,
`const dailyRisk = (p,tn,w) => {
  // Critério diário conservador:
  // 10–20mm = acompanhamento/atenção leve; 20mm+ = atenção operacional.
  // Não é alerta oficial; é triagem local para o card diário.
  if (p >= 80 || w >= 80 || tn < 0) return "CRITICO";
  if (p >= 40 || w >= 50 || tn < 5) return "ALERTA";
  if (p >= 10 || w >= 30 || tn < 10) return "ATENCAO";
  return "NORMAL";
}`,
  "critério diário p>=10mm ou temp<10 vira Atenção",
  false
);

// Fallback se o nome da função for outro, corrige gatilhos comuns p*1.5 > 30.
replaceAll("p*1.5>30||w>35||tn<10", "p>=10||w>=30||tn<10", "critério diário inline");
replaceAll("p * 1.5 > 30 || w > 35 || tn < 10", "p >= 10 || w >= 30 || tn < 10", "critério diário inline espaçado");

// 3) Corrige texto da aba Alertas hardcoded +0,9°C.
replaceRegex(
  /🌡️\s*El Niño\s*\(\+0,9°C\)\s*em desenvolvimento\.\s*Probabilidade[^<\n]*?Risco elevado no RS\./g,
  "🌡️ ENSO — contexto climático: condição observada Neutro · Niño 3.4 +0.47°C. IRI/CCSR: 98% de probabilidade de El Niño em Mai–Jul 2026. Não gera alerta operacional sozinho.",
  "remove texto hardcoded +0,9°C em Alertas"
);

// Se o texto estiver em JSX com entidades/quebras, usa substituições específicas.
replaceAll(
  "🌡️ El Niño (+0,9°C) em desenvolvimento. Probabilidade–jul 2026: 98% (NOAA/IRI). Risco elevado no RS.",
  "🌡️ ENSO — contexto climático: condição observada Neutro · Niño 3.4 +0.47°C. IRI/CCSR: 98% de probabilidade de El Niño em Mai–Jul 2026. Não gera alerta operacional sozinho.",
  "remove texto hardcoded exato Alertas"
);

// 4) Copernicus Water: texto antigo diz próximo bloco.
replaceAll(
  "Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, usar Sentinel-1 no próximo bloco.",
  "Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, compare com o indicador Sentinel-1 abaixo.",
  "Copernicus Water aponta para Sentinel-1 já ativo"
);

// 5) Lagoa: Pelotas/HidroSens 1,20m é cota de alerta, não cota de inundação.
// Alteração global do rótulo é mais segura operacionalmente porque os limiares são limiares de alerta/cota.
replaceAll(">Cota de inundação<", ">Cota de alerta<", "rótulo Cota de alerta");

// 6) CPTEC/INPE na lista de fontes não pode ficar PLANEJADO.
replaceAll(
  '{ n:"CPTEC/INPE",                st:"PLANEJADO", c:"#eab308", d:"Produtos sazonais/subsazonais oficiais por imagem via Edge Function.",           a:"API pública", h:"1. servicos.cptec.inpe.br/XML/cidade/{id}/previsao.xml\\n2. Proxy via Supabase Edge Function (CORS)" },',
  '{ n:"CPTEC/INPE",                st:"ATIVO", c:"#22c55e", d:"Produtos sazonais/subsazonais oficiais por imagem via Edge Function. Uso: contexto climático, não alerta local imediato.", a:"API pública via Supabase Edge Function", h:"Endpoint: cptec-inpe-produtos. Produtos gráficos oficiais sazonais/subsazonais. Não são série numérica JSON e não disparam alerta local sozinhos." },',
  "CPTEC/INPE ATIVO na lista de fontes"
);

// 7) Queimadas/APAs: remover hardcoded operacional/histórico do card principal quando INPE falha.
replaceRegex(
  /API INPE indisponível — dados de referência histórica:[\s\S]*?Risco 2026\/27[\s\S]*?ALTO/g,
  "API INPE BDQueimadas indisponível no momento. Sem dado operacional de focos nas últimas 48h. Verifique junto ao INPE BDQueimadas.",
  "Queimadas: remove histórico como card operacional"
);

replaceRegex(
  /ℹ️ Probabilidades EFFIS[\s\S]*?Copernicus\./g,
  "ℹ️ EFFIS não está conectado em tempo real nesta versão. Não usar estimativa estrutural como alerta operacional.",
  "Queimadas: EFFIS sem estimativa operacional"
);

replaceAll(
  "🗓 Risco estrutural por bioma — dado de referência EFFIS, não tempo real. Valores reflectem histórico + sazonalidade + El Niño.",
  "🗓 Referência por bioma — EFFIS não conectado em tempo real nesta versão. Não aciona alerta operacional.",
  "Queimadas: EFFIS referência"
);

// 8) Contexto climático 98% em cards/análise: torna explícito que é El Niño provável.
replaceAll(
  "Contexto climático</div>\\n                    <div style={{ fontSize:16, fontWeight:800, color:t.accent }}>98%</div>",
  "Contexto climático</div>\\n                    <div style={{ fontSize:16, fontWeight:800, color:t.accent }}>El Niño provável · 98%</div>",
  "Contexto climático explícito"
);

// 9) Painel de saúde: se a fonte já carregou em outro useEffect, mas ainda aparece aguardando no primeiro render, reduzir confusão com label mais preciso.
replaceAll(
  'const label = anaComplementar ? "Aguardando API" : never ? "Aguardando" : ok ? "OK" : "Falhou";',
  'const label = anaComplementar ? "Aguardando API" : never ? "Carregando" : ok ? "OK" : "Falhou";',
  "Fontes: Aguardando -> Carregando"
);

// 10) Validações: textos proibidos não podem sobrar.
const forbidden = [
  "+0,9°C",
  "Risco 2026/27",
  "Focos 2022",
  "Focos 2023",
  "Focos 2024",
  "Sentinel-1 no próximo bloco",
  'CPTEC/INPE",                st:"PLANEJADO"',
  "Probabilidades EFFIS (Pampa Médio-Alto",
];

const leftovers = forbidden.filter((needle) => app.includes(needle));
if (leftovers.length) {
  console.error("ERRO: ainda restam textos proibidos/desatualizados:");
  for (const item of leftovers) console.error(" - " + item);
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log(`Correções de coerência operacional aplicadas. Alterações: ${changes}`);
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
