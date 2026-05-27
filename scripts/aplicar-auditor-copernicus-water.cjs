const fs = require("fs");
const path = require("path");

const auditorPath = path.join(process.cwd(), "scripts", "auditar-sitrep-hardcoded-fontes.cjs");

if (!fs.existsSync(auditorPath)) {
  console.error("ERRO: não encontrei scripts/auditar-sitrep-hardcoded-fontes.cjs");
  process.exit(1);
}

let src = fs.readFileSync(auditorPath, "utf8");
const backup = path.join(process.cwd(), "scripts", `auditar-sitrep-hardcoded-fontes.cjs.backup-copernicus-water-${Date.now()}`);
fs.writeFileSync(backup, src, "utf8");

const needle = `["Copernicus Health", \`https://\${PROJECT_REF}.supabase.co/functions/v1/copernicus-health\`, (d) => d.status === "AUTH_OK" || d.status === "NOT_CONFIGURED" || d.status === "AUTH_FAILED", "Infraestrutura: auth, não SITREP ainda"],`;

const insert = `${needle}
  ["Copernicus Water", \`https://\${PROJECT_REF}.supabase.co/functions/v1/copernicus-water?aoi=lagoa_patos&days=30\`, (d) => d.ok === true && typeof d.water_percent === "number", "Contexto real: indicador de água por Sentinel-2/NDWI"],`;

if (!src.includes(needle)) {
  console.error("ERRO: ponto de inserção Copernicus Health não encontrado.");
  process.exit(1);
}

if (!src.includes("copernicus-water")) {
  src = src.replace(needle, insert);
  fs.writeFileSync(auditorPath, src, "utf8");
  console.log("Auditor atualizado com Copernicus Water.");
} else {
  console.log("Auditor já possui Copernicus Water.");
}

console.log("Backup:", path.relative(process.cwd(), backup));
