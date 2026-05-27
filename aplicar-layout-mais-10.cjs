const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-layout-mais-10");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-layout-mais-10");
}

// Aumenta a área útil/visual em aproximadamente 10%.
// Foco: aba Lagoa dos Patos e cards principais.
// Faz substituições tolerantes, sem depender de um único estado do arquivo.

const replacements = [
  // Cards da Lagoa: largura mínima maior.
  ['gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))"', 'gridTemplateColumns:"repeat(auto-fill,minmax(341px,1fr))"'],
  ['gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))"', 'gridTemplateColumns:"repeat(auto-fit,minmax(418px,1fr))"'],
  ['gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))"', 'gridTemplateColumns:"repeat(auto-fill,minmax(418px,1fr))"'],

  // Cards de cidade/dashboard: leve aumento.
  ['gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))"', 'gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))"'],

  // Títulos e valores principais da Lagoa.
  ['fontSize:18, fontWeight:900, color:t.text }}>{point.name}', 'fontSize:20, fontWeight:900, color:t.text }}>{point.name}'],
  ['fontSize:18, fontWeight:800, color:t.text }}>{point.name}', 'fontSize:20, fontWeight:900, color:t.text }}>{point.name}'],
  ['fontSize:14, fontWeight:800, color:t.text }}>{point.name}', 'fontSize:16, fontWeight:900, color:t.text }}>{point.name}'],

  ['fontSize:30, fontWeight:900, color:rColor }}>{(lagoa.atual*100).toFixed(1)} cm', 'fontSize:33, fontWeight:900, color:rColor }}>{(lagoa.atual*100).toFixed(1)} cm'],
  ['fontSize:22, fontWeight:900, color:rColor }}>{(lagoa.atual*100).toFixed(1)} cm', 'fontSize:24, fontWeight:900, color:rColor }}>{(lagoa.atual*100).toFixed(1)} cm'],

  // Subvalores dos cards.
  ['fontSize:15, fontWeight:900, color:t.text }}>{sourceText}', 'fontSize:17, fontWeight:900, color:t.text }}>{sourceText}'],
  ['fontSize:12, fontWeight:800, color:t.text }}>{sourceText}', 'fontSize:13, fontWeight:900, color:t.text }}>{sourceText}'],

  ['fontSize:18, fontWeight:900, color:threshold ? "#f97316" : t.textFaint', 'fontSize:20, fontWeight:900, color:threshold ? "#f97316" : t.textFaint'],
  ['fontSize:18, fontWeight:900, color:max2024 ? "#60a5fa" : t.textFaint', 'fontSize:20, fontWeight:900, color:max2024 ? "#60a5fa" : t.textFaint'],

  // Cabeçalho da aba.
  ['fontSize:22, fontWeight:900, color:t.text, marginTop:2 }}>Monitoramento', 'fontSize:24, fontWeight:900, color:t.text, marginTop:2 }}>Monitoramento'],
  ['fontSize:18, fontWeight:800, color:t.text, marginTop:2 }}>Monitoramento', 'fontSize:20, fontWeight:900, color:t.text, marginTop:2 }}>Monitoramento'],

  // Padding interno dos blocos dos cards, quando encontrado.
  ['padding:"8px 10px"', 'padding:"9px 11px"'],
  ['padding:"7px 9px"', 'padding:"8px 10px"'],
  ['gap:7, marginBottom:9', 'gap:8, marginBottom:10'],
  ['gap:10 }}', 'gap:11 }}'],
];

let changed = 0;
for (const [from, to] of replacements) {
  const before = app;
  app = app.replaceAll(from, to);
  if (app !== before) changed++;
}

// Ajuste adicional: se existir container principal com maxWidth, aumenta 10%.
app = app.replaceAll("maxWidth:1200", "maxWidth:1320");
app = app.replaceAll("maxWidth:1280", "maxWidth:1408");
app = app.replaceAll("maxWidth:1400", "maxWidth:1540");

fs.writeFileSync(appPath, app, "utf8");

console.log(`Layout aumentado cerca de 10%. Grupos de substituição aplicados: ${changed}`);
console.log("Backup preservado em src/App.jsx.backup-layout-mais-10.");
console.log("Agora rode: npm run build");
