const fs = require("fs");
const path = require("path");

const edgePath = path.join(process.cwd(), "supabase", "functions", "hidrosens-laranjal", "index.ts");

if (!fs.existsSync(edgePath)) {
  console.error("ERRO: não encontrei supabase/functions/hidrosens-laranjal/index.ts.");
  process.exit(1);
}

let edge = fs.readFileSync(edgePath, "utf8");

const backupPath = path.join(process.cwd(), "supabase", "functions", "hidrosens-laranjal", "index.ts.backup-max-maio-2024");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, edge, "utf8");
  console.log("Backup criado em supabase/functions/hidrosens-laranjal/index.ts.backup-max-maio-2024");
}

// Adota máximo maio/2024 para Pelotas / Laranjal.
if (!edge.includes("LARANJAL_MAX_MAY_2024_M")) {
  edge = edge.replace(
    "const LARANJAL_CRITICAL_THRESHOLD_M = 1.40;",
    "const LARANJAL_CRITICAL_THRESHOLD_M = 1.40;\nconst LARANJAL_MAX_MAY_2024_M = 2.40;"
  );
}

// Acrescenta no JSON de retorno.
edge = edge.replace(
  "critical_threshold_m: LARANJAL_CRITICAL_THRESHOLD_M,\n      critical_threshold_cm: Number((LARANJAL_CRITICAL_THRESHOLD_M * 100).toFixed(0)),\n      status:",
  "critical_threshold_m: LARANJAL_CRITICAL_THRESHOLD_M,\n      critical_threshold_cm: Number((LARANJAL_CRITICAL_THRESHOLD_M * 100).toFixed(0)),\n      max_may_2024_m: LARANJAL_MAX_MAY_2024_M,\n      max_may_2024_cm: Number((LARANJAL_MAX_MAY_2024_M * 100).toFixed(0)),\n      status:"
);

edge = edge.replace(
  "Limiares adotados: alerta 1,20 m; inundação crítica 1,40 m.",
  "Limiares adotados: alerta 1,20 m; inundação crítica 1,40 m. Máx. maio/2024 adotado: 2,40 m."
);

fs.writeFileSync(edgePath, edge, "utf8");

console.log("Edge Function hidrosens-laranjal atualizada com máx. maio/2024 = 2,40 m.");
console.log("Agora rode: supabase functions deploy hidrosens-laranjal --no-verify-jwt");
