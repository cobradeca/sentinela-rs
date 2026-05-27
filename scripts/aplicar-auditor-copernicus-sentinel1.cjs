const fs = require("fs");
const path = require("path");

const auditorPath = path.join(process.cwd(), "scripts", "auditar-sitrep-hardcoded-fontes.cjs");

if (!fs.existsSync(auditorPath)) {
  console.error("ERRO: não encontrei scripts/auditar-sitrep-hardcoded-fontes.cjs");
  process.exit(1);
}

let src = fs.readFileSync(auditorPath, "utf8");
const backup = path.join(process.cwd(), "scripts", `auditar-sitrep-hardcoded-fontes.cjs.backup-sentinel1-${Date.now()}`);
fs.writeFileSync(backup, src, "utf8");

const needle = `["Copernicus Water", \`https://\${PROJECT_REF}.supabase.co/functions/v1/copernicus-water?aoi=lagoa_patos&days=30\`, (d) => d.ok === true && typeof d.water_percent === "number", "Contexto real: indicador de água por Sentinel-2/NDWI"],`;
const insert = `${needle}
  ["Copernicus Sentinel-1", \`https://\${PROJECT_REF}.supabase.co/functions/v1/copernicus-sentinel1-water?aoi=lagoa_patos&days=18\`, (d) => (d.ok === true || d.status === "BAIXA_COBERTURA") && typeof d.water_like_percent === "number", "Contexto real: indicador SAR de água/alagamento sob nuvens"],`;

if (!src.includes(needle)) {
  console.error("ERRO: ponto de inserção Copernicus Water não encontrado no auditor.");
  process.exit(1);
}

if (!src.includes("copernicus-sentinel1-water")) {
  src = src.replace(needle, insert);
  fs.writeFileSync(auditorPath, src, "utf8");
  console.log("Auditor atualizado com Copernicus Sentinel-1.");
} else {
  console.log("Auditor já possui Copernicus Sentinel-1.");
}

console.log("Backup:", path.relative(process.cwd(), backup));
