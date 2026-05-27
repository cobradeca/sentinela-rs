const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
const app = fs.readFileSync(appPath, "utf8");

let fail = false;

function ok(msg) { console.log(`✅ ${msg}`); }
function warn(msg) { console.log(`⚠️  ${msg}`); }
function bad(msg) { console.log(`❌ ${msg}`); fail = true; }

console.log("Auditoria — Fontes NOAA/CPC + IRI");

if (app.includes("NOAA_ENSO_FUNCTION_URL")) ok("NOAA ENSO Function URL presente.");
else bad("NOAA_ENSO_FUNCTION_URL ausente.");

if (app.includes("IRI_ENSO_PROB_FUNCTION_URL")) ok("IRI ENSO Prob Function URL presente.");
else bad("IRI_ENSO_PROB_FUNCTION_URL ausente.");

if (app.includes("NOAA/CPC + IRI — ENSO")) ok("Fonte NOAA/CPC + IRI aparece na UI.");
else bad("Fonte NOAA/CPC + IRI não encontrada na UI.");

if (app.includes("Niño 3.4, ONI e probabilidades ENSO atualizados")) ok("Texto indica dados ENSO atualizados.");
else warn("Texto de atualização ENSO não encontrado exatamente.");

if (app.includes("Copernicus — Indicadores de referência")) ok("Copernicus mantido como referência, não ativo indevido.");
else warn("Texto Copernicus de referência não encontrado exatamente.");

if (fail) process.exit(1);
console.log("\nOK: fontes NOAA/CPC + IRI refletidas no App.jsx.");
