const fs = require("fs");
const path = require("path");

const auditorPath = path.join(process.cwd(), "scripts", "auditar-sitrep-hardcoded-fontes.cjs");

if (!fs.existsSync(auditorPath)) {
  console.error("ERRO: não encontrei scripts/auditar-sitrep-hardcoded-fontes.cjs");
  process.exit(1);
}

let src = fs.readFileSync(auditorPath, "utf8");
const backup = path.join(process.cwd(), "scripts", `auditar-sitrep-hardcoded-fontes.cjs.backup-ndvi-${Date.now()}`);
fs.writeFileSync(backup, src, "utf8");

const needle = `["Copernicus Sentinel-1", \`https://\${PROJECT_REF}.supabase.co/functions/v1/copernicus-sentinel1-water?aoi=lagoa_patos&days=18\`, (d) => (d.ok === true || d.status === "BAIXA_COBERTURA") && typeof d.water_like_percent === "number", "Contexto real: indicador SAR de água/alagamento sob nuvens"],`;
const insert = `${needle}
  ["Copernicus NDVI", \`https://\${PROJECT_REF}.supabase.co/functions/v1/copernicus-ndvi?aoi=entorno_lagoa_patos&days=30\`, (d) => d.ok === true && typeof d.ndvi_mean === "number", "Contexto real: indicador de vegetação/estiagem por Sentinel-2/NDVI"],`;

if (!src.includes(needle)) {
  console.error("ERRO: ponto de inserção Copernicus Sentinel-1 não encontrado no auditor.");
  process.exit(1);
}

if (!src.includes("copernicus-ndvi")) {
  src = src.replace(needle, insert);
  fs.writeFileSync(auditorPath, src, "utf8");
  console.log("Auditor atualizado com Copernicus NDVI.");
} else {
  console.log("Auditor já possui Copernicus NDVI.");
}

console.log("Backup:", path.relative(process.cwd(), backup));
