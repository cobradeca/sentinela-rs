const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-lagoa-ajuste-ordem-layout");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-lagoa-ajuste-ordem-layout");
}

function fail(label) {
  console.error(`ERRO: trecho não encontrado para: ${label}`);
  process.exit(1);
}

function replaceRegex(regex, replacement, label) {
  if (!regex.test(app)) fail(label);
  app = app.replace(regex, replacement);
}

// 1) Ordem corrigida conforme definido pelo usuário.
//    Itapuã vem antes de Guaíba / Sul POA.
//    Guaíba permanece como ponto complementar ANA; se não retornar leitura, deve aparecer como sem leitura.
const stationsLagoa = `const STATIONS_LAGOA = [
  // Ordem operacional visual: Itapuã / Norte POA → Guaíba / Sul POA → margem oeste/sul → saída para o mar.
  { id: "lagoa_patos_poa",      name: "Itapuã / Norte POA",           displayName: "Lagoa dos Patos — Itapuã / Norte POA", lat: -30.36, lon: -51.03, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 1 },
  { id: "guaiba_sul_poa",       name: "Guaíba / Sul POA",             displayName: "Sistema Guaíba — Sul POA",              lat: -30.11, lon: -51.18, type: "lagoa", anaCode: "87450004", sourceHint: "ANA", ordemEscoamento: 2 },
  { id: "lagoa_patos_arambare", name: "Arambaré",                     displayName: "Lagoa dos Patos — Arambaré",           lat: -30.91, lon: -51.50, type: "lagoa", anaCode: "87540000", sourceHint: "RADAR", ordemEscoamento: 3 },
  { id: "lagoa_sao_lourenco",   name: "São Lourenço do Sul",          displayName: "Lagoa dos Patos — São Lourenço do Sul",lat: -31.36, lon: -51.98, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 4 },
  { id: "lagoa_patos_pelotas",  name: "Pelotas / Laranjal",           displayName: "Lagoa dos Patos — Pelotas / Laranjal",lat: -31.77, lon: -52.34, type: "lagoa", anaCode: "87955000", sourceHint: "HIDROSENS", ordemEscoamento: 5 },
  { id: "lagoa_sao_jose_norte", name: "São José do Norte",            displayName: "Lagoa dos Patos — São José do Norte",  lat: -32.02, lon: -52.04, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 6 },
  { id: "lagoa_rio_grande",     name: "Rio Grande / FURG CCMAR",      displayName: "Lagoa dos Patos — Rio Grande / Barra", lat: -32.03, lon: -52.10, type: "lagoa", anaCode: "87980000", sourceHint: "RADAR", ordemEscoamento: 7 },
];`;

replaceRegex(/const STATIONS_LAGOA = \[[\s\S]*?\];/, stationsLagoa, "STATIONS_LAGOA na ordem definida");

// 2) Atualiza texto do cabeçalho da aba Lagoa, se existir.
app = app.replaceAll(
  "Organização visual: Guaíba / Sul POA → Itapuã / Norte POA → margem oeste/sul → saída para o mar.",
  "Organização visual: Itapuã / Norte POA → Guaíba / Sul POA → margem oeste/sul → saída para o mar."
);

app = app.replaceAll(
  "ordem Guaíba → Lagoa → mar",
  "ordem Itapuã → Guaíba → Lagoa → mar"
);

// 3) Aumenta a legibilidade dos cards na aba Lagoa em 100% de zoom.
//    Objetivo: aproximar o tamanho visual que você gostou ao usar 150%, sem depender do zoom do navegador.
app = app.replaceAll(
  'gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))"',
  'gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))"'
);

app = app.replaceAll(
  "fontSize:18, fontWeight:800, color:t.text, marginTop:2 }}>Monitoramento em ordem de escoamento",
  "fontSize:22, fontWeight:900, color:t.text, marginTop:2 }}>Monitoramento em ordem de escoamento"
);

app = app.replaceAll(
  "fontSize:14, fontWeight:800, color:t.text }}>{point.name}",
  "fontSize:18, fontWeight:900, color:t.text }}>{point.name}"
);

app = app.replaceAll(
  "fontSize:22, fontWeight:900, color:rColor }}>{(lagoa.atual*100).toFixed(1)} cm",
  "fontSize:30, fontWeight:900, color:rColor }}>{(lagoa.atual*100).toFixed(1)} cm"
);

app = app.replaceAll(
  "fontSize:12, fontWeight:800, color:t.text }}>{sourceText}",
  "fontSize:15, fontWeight:900, color:t.text }}>{sourceText}"
);

app = app.replaceAll(
  "fontSize:14, fontWeight:800, color:threshold ? \"#f97316\" : t.textFaint",
  "fontSize:18, fontWeight:900, color:threshold ? \"#f97316\" : t.textFaint"
);

app = app.replaceAll(
  "fontSize:14, fontWeight:800, color:max2024 ? \"#60a5fa\" : t.textFaint",
  "fontSize:18, fontWeight:900, color:max2024 ? \"#60a5fa\" : t.textFaint"
);

// 4) Melhora mensagem do card sem dados, deixando claro quando o ponto é ANA complementar.
const oldNoData = `Sem leitura operacional validada no período.`;
const newNoData = `{point.sourceHint === "ANA" ? "Sem leitura ANA operacional validada no período." : "Sem leitura operacional validada no período."}`;

if (app.includes(oldNoData) && !app.includes("Sem leitura ANA operacional validada")) {
  app = app.replace(oldNoData, newNoData);
}

// 5) Ajusta resumo 6/7: ele deve continuar correto. Guaíba sem dados conta como ponto total, não como leitura real.

fs.writeFileSync(appPath, app, "utf8");

console.log("Aba Lagoa ajustada: ordem corrigida e cards maiores para 100% de zoom.");
console.log("Backup preservado em src/App.jsx.backup-lagoa-ajuste-ordem-layout.");
console.log("Agora rode: npm run build");
