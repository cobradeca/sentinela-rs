const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-voltar-6-cards-lagoa");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-voltar-6-cards-lagoa");
}

function fail(label) {
  console.error(`ERRO: trecho não encontrado para: ${label}`);
  process.exit(1);
}

function replaceRegex(regex, replacement, label) {
  if (!regex.test(app)) fail(label);
  app = app.replace(regex, replacement);
}

// Volta a aba Lagoa para somente os 6 pontos da Lagoa dos Patos.
// Remove Guaíba / Sul POA da lista da Lagoa.
// Ordem definida:
// 1. Itapuã
// 2. Arambaré
// 3. São Lourenço do Sul
// 4. Pelotas / Laranjal
// 5. São José do Norte
// 6. Rio Grande / FURG CCMAR
const stationsLagoa = `const STATIONS_LAGOA = [
  { id: "lagoa_patos_poa",      name: "Itapuã",                   displayName: "Lagoa dos Patos — Itapuã",              lat: -30.36, lon: -51.03, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 1 },
  { id: "lagoa_patos_arambare", name: "Arambaré",                 displayName: "Lagoa dos Patos — Arambaré",            lat: -30.91, lon: -51.50, type: "lagoa", anaCode: "87540000", sourceHint: "RADAR", ordemEscoamento: 2 },
  { id: "lagoa_sao_lourenco",   name: "São Lourenço do Sul",      displayName: "Lagoa dos Patos — São Lourenço do Sul", lat: -31.36, lon: -51.98, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 3 },
  { id: "lagoa_patos_pelotas",  name: "Pelotas / Laranjal",       displayName: "Lagoa dos Patos — Pelotas / Laranjal",  lat: -31.77, lon: -52.34, type: "lagoa", anaCode: "87955000", sourceHint: "HIDROSENS", ordemEscoamento: 4 },
  { id: "lagoa_sao_jose_norte", name: "São José do Norte",        displayName: "Lagoa dos Patos — São José do Norte",   lat: -32.02, lon: -52.04, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 5 },
  { id: "lagoa_rio_grande",     name: "Rio Grande / FURG CCMAR",  displayName: "Lagoa dos Patos — Rio Grande / Barra",  lat: -32.03, lon: -52.10, type: "lagoa", anaCode: "87980000", sourceHint: "RADAR", ordemEscoamento: 6 },
];`;

replaceRegex(/const STATIONS_LAGOA = \[[\s\S]*?\];/, stationsLagoa, "STATIONS_LAGOA com 6 cards");

// Garante que o dashboard continue separado das cidades, se essa arquitetura já foi aplicada.
if (app.includes("const STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];")) {
  app = app.replace(
    "const STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];",
    "const STATIONS = [...STATIONS_CIDADES];\nconst ALL_STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];"
  );
}

if (app.includes("for (const st of STATIONS) {")) {
  app = app.replace("for (const st of STATIONS) {", "for (const st of ALL_STATIONS) {");
}

// Textos de cabeçalho/resumo: remover Guaíba da narrativa da Lagoa.
app = app.replaceAll(
  "Organização visual: Itapuã / Norte POA → Guaíba / Sul POA → margem oeste/sul → saída para o mar.",
  "Organização visual: Itapuã → Arambaré → São Lourenço do Sul → Pelotas / Laranjal → São José do Norte → Rio Grande."
);

app = app.replaceAll(
  "Organização visual: Guaíba / Sul POA → Itapuã / Norte POA → margem oeste/sul → saída para o mar.",
  "Organização visual: Itapuã → Arambaré → São Lourenço do Sul → Pelotas / Laranjal → São José do Norte → Rio Grande."
);

app = app.replaceAll(
  "ordem Itapuã → Guaíba → Lagoa → mar",
  "ordem Itapuã → Rio Grande"
);

app = app.replaceAll(
  "ordem Guaíba → Lagoa → mar",
  "ordem Itapuã → Rio Grande"
);

app = app.replaceAll("Itapuã / Norte POA", "Itapuã");
app = app.replaceAll("Sistema Guaíba — Sul POA", "Sistema Guaíba — Sul POA");

// Se sobrou algum card/texto de Guaíba em seção da Lagoa, ele não será renderizado porque saiu de STATIONS_LAGOA.
// Mantém ANA 87450004 fora da Lagoa.

fs.writeFileSync(appPath, app, "utf8");

console.log("Aba Lagoa revertida para 6 cards, sem Guaíba / Sul POA.");
console.log("Backup preservado em src/App.jsx.backup-voltar-6-cards-lagoa.");
console.log("Agora rode: npm run build");
