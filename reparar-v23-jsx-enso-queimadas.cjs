const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-reparo-v23-jsx-${Date.now()}`);
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

// 1) Remove +0,9°C que sobrou em referências/contextos.
replaceAll(
  'current:"contexto histórico (+0,9°C) eleva risco de recorrência em 2026/27."',
  'current:"contexto histórico; não é dado operacional atual."',
  "remove +0,9°C em COPERNICUS_REFERENCE enchentes"
);

replaceRegex(
  /El Niño\s*\(\+0,9°C\)\s*amplifica risco no Pampa e Serra Gaúcha\./g,
  "ENSO é contexto climático e não aciona alerta de queimadas sozinho.",
  "remove +0,9°C em nota queimadas"
);

// Fallback conservador: qualquer sobra literal vira referência ao valor observado atual, sem alarme.
replaceAll("+0,9°C", "+0.47°C", "substitui literal +0,9°C remanescente");

// 2) Repara o JSX quebrado no fallback do INPE BDQueimadas.
// O patch anterior substituiu só o início da lista e deixou resto de ].map(...).
const fireNeedle = "API INPE BDQueimadas indisponível no momento. Sem dado operacional de focos nas últimas 48h. Verifique junto ao INPE BDQueimadas.";
let firePos = app.indexOf(fireNeedle);

if (firePos >= 0) {
  const branchStart = app.lastIndexOf("              ) : (", firePos);
  const branchEnd = app.indexOf("\n              )}", firePos);

  if (branchStart >= 0 && branchEnd > branchStart) {
    const replacement = `              ) : (
                <div>
                  <div style={{ fontSize:11, color:t.textMuted, marginBottom:8 }}>
                    API INPE BDQueimadas indisponível no momento. Sem dado operacional de focos nas últimas 48h. Verifique junto ao INPE BDQueimadas.
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                    <div style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:3 }}>
                      <div style={{ fontSize:8, color:t.textMuted }}>Fonte primária</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#eab308" }}>indisponível</div>
                    </div>
                    <div style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"9px 11px", borderRadius:3 }}>
                      <div style={{ fontSize:8, color:t.textMuted }}>Uso operacional</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#eab308" }}>não aciona alerta</div>
                    </div>
                  </div>
                  <div style={{ marginTop:10, padding:"8px 12px", background: dark?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.04)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:4, fontSize:9, color:t.textMuted }}>
                    ℹ️ EFFIS não está conectado em tempo real nesta versão. Não usar estimativa estrutural como alerta operacional.
                  </div>
                  <button onClick={loadQueimadas} style={{ marginTop:10, background: dark?"rgba(249,115,22,0.1)":"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.4)", color:"#fdba74", padding:"7px 14px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:10 }}>
                    ↻ Tentar novamente
                  </button>
                </div>
              )}`;
    app = app.slice(0, branchStart) + replacement + app.slice(branchEnd + "\n              )}".length);
    changes++;
    console.log("OK: repara branch fallback INPE/Queimadas");
  } else {
    console.log("AVISO: não consegui delimitar branch fallback INPE/Queimadas");
  }
} else {
  console.log("AVISO: needle INPE indisponível não encontrado; tentando limpeza regex");
}

// Limpeza extra de qualquer resto de array quebrado que tenha ficado.
replaceRegex(
  /<div style=\{\{ fontSize:11, color:t\.textMuted, marginBottom:8 \}\}>API INPE BDQueimadas indisponível[\s\S]*?\]\.map\(item=>\([\s\S]*?\)\)\}/g,
  `<div style={{ fontSize:11, color:t.textMuted, marginBottom:8 }}>
                    API INPE BDQueimadas indisponível no momento. Sem dado operacional de focos nas últimas 48h. Verifique junto ao INPE BDQueimadas.
                  </div>`,
  "limpeza regex fallback INPE quebrado"
);

// 3) Critério diário: substitui a linha de cálculo no render.
// Antes: getRiskLevel(p*1.5,tn,w) deixava 19mm como Normal.
replaceAll(
  "const dr=getRiskLevel(p*1.5,tn,w);",
  `const baseDr=getRiskLevel(p*1.5,tn,w);
                    const dr=["CRITICO","EMERGENCIA","ALERTA"].includes(baseDr) ? baseDr : ((p>=10||w>=30||tn<10) ? "ATENCAO" : baseDr);`,
  "critério diário render p>=10/w>=30/tn<10"
);

// 4) Texto de explicação diária: evita dizer ponderação 28,5mm como se fosse dado.
replaceAll(
  "`Chuva prevista no dia: ${p.toFixed(0)}mm. Ponderação operacional usada no cálculo diário: ${weightedPrecip.toFixed(1)}mm.`,",
  "`Chuva prevista no dia: ${p.toFixed(0)}mm. Critério: 10mm ou mais entra em acompanhamento/atenção leve.`,",
  "explicação diária sem ponderação confusa"
);

// 5) Validações críticas.
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
  'BDQueimadas.", c:"#f97316"'
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
console.log(`Reparo V23 JSX/ENSO aplicado. Alterações: ${changes}`);
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
console.log("node scripts\\auditar-coerencia-v23.cjs");
