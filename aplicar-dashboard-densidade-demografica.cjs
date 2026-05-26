const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-dashboard-densidade");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-dashboard-densidade");
}

function fail(label) {
  console.error(`ERRO: trecho não encontrado para: ${label}`);
  process.exit(1);
}

function replaceRegex(regex, replacement, label) {
  if (!regex.test(app)) fail(label);
  app = app.replace(regex, replacement);
}

// Dashboard organizado por densidade demográfica decrescente.
// Campo demDensity: hab/km², referência operacional baseada no Censo 2022/IBGE.
// A ordem visual prioriza maior concentração populacional para leitura rápida de impacto urbano.
const stationsCidadesOrdenado = `// Municípios com histórico real de enchentes no RS — dashboard em ordem decrescente de densidade demográfica
const STATIONS_CIDADES = [
  { id: "rs_porto_alegre",  name: "Porto Alegre",    lat: -30.03, lon: -51.23, type: "cidade", ibgeCode: "4314902", rioRef: "Guaíba — enchente mai/2024", demDensity: 2681 },
  { id: "rs_canoas",        name: "Canoas",          lat: -29.92, lon: -51.18, type: "cidade", ibgeCode: "4304606", rioRef: "Lago Guaíba / Gravataí", demDensity: 2654 },
  { id: "rs_sao_leopoldo",  name: "São Leopoldo",    lat: -29.76, lon: -51.14, type: "cidade", ibgeCode: "4318705", rioRef: "Rio dos Sinos", demDensity: 2131 },
  { id: "rs_lajeado",       name: "Lajeado",         lat: -29.47, lon: -51.96, type: "cidade", ibgeCode: "4311403", rioRef: "Rio Taquari — recorde 2023", demDensity: 1032 },
  { id: "rs_caxias_sul",    name: "Caxias do Sul",   lat: -29.17, lon: -51.17, type: "cidade", ibgeCode: "4305108", rioRef: "Bacia do Caí", demDensity: 282 },
  { id: "rs_passo_fundo",   name: "Passo Fundo",     lat: -28.26, lon: -52.41, type: "cidade", ibgeCode: "4314100", rioRef: "Rio Passo Fundo", demDensity: 263 },
  { id: "rs_pelotas",       name: "Pelotas",         lat: -31.77, lon: -52.34, type: "cidade", ibgeCode: "4314407", rioRef: "Canal São Gonçalo", demDensity: 202 },
  { id: "rs_santa_maria",   name: "Santa Maria",     lat: -29.68, lon: -53.81, type: "cidade", ibgeCode: "4316907", rioRef: "Bacia do Vacacaí", demDensity: 153 },
  { id: "rs_rio_grande",    name: "Rio Grande",      lat: -32.03, lon: -52.10, type: "cidade", ibgeCode: "4315602", rioRef: "Lagoa dos Patos / litoral", demDensity: 68 },
  { id: "rs_cachoeira_sul", name: "Cachoeira do Sul",lat: -29.88, lon: -52.89, type: "cidade", ibgeCode: "4303004", rioRef: "Rio Jacuí", demDensity: 21 },
];`;

replaceRegex(
  /\/\/ Municípios com histórico real de enchentes no RS[\s\S]*?const STATIONS_CIDADES = \[[\s\S]*?\];/,
  stationsCidadesOrdenado,
  "STATIONS_CIDADES ordenado por densidade"
);

// Acrescenta a densidade no card do Dashboard, logo abaixo do rioRef.
const oldSub = `<div style={{ fontSize:8, color:t.textFaint, marginTop:2 }}>{station.rioRef}</div>`;
const newSub = `<div style={{ fontSize:8, color:t.textFaint, marginTop:2 }}>{station.rioRef}</div>
                  {station.demDensity && (
                    <div style={{ fontSize:8, color:t.textMuted, marginTop:2 }}>
                      Densidade: {station.demDensity.toLocaleString("pt-BR")} hab/km²
                    </div>
                  )}`;

if (app.includes(oldSub) && !app.includes("Densidade: {station.demDensity")) {
  app = app.replace(oldSub, newSub);
}

// Ajusta o texto do Dashboard para deixar claro o critério.
app = app.replaceAll(
  "cards das cidades",
  "cards das cidades em ordem decrescente de densidade demográfica"
);

// Se existir o resumo da Lagoa no Dashboard, mantém antes dos cards de cidade; a grid já usará STATIONS_CIDADES ordenado.

fs.writeFileSync(appPath, app, "utf8");

console.log("Dashboard organizado por densidade demográfica decrescente.");
console.log("Backup preservado em src/App.jsx.backup-dashboard-densidade.");
console.log("Agora rode: npm run build");
