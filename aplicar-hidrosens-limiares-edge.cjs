const fs = require("fs");
const path = require("path");

const edgePath = path.join(process.cwd(), "supabase", "functions", "hidrosens-laranjal", "index.ts");

if (!fs.existsSync(edgePath)) {
  console.error("ERRO: não encontrei supabase/functions/hidrosens-laranjal/index.ts.");
  console.error("Aplique primeiro o pacote hidrosens-laranjal ou verifique o caminho.");
  process.exit(1);
}

let edge = fs.readFileSync(edgePath, "utf8");

const backupPath = path.join(process.cwd(), "supabase", "functions", "hidrosens-laranjal", "index.ts.backup-limiares");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, edge, "utf8");
  console.log("Backup criado em supabase/functions/hidrosens-laranjal/index.ts.backup-limiares");
}

// 1) Insere constantes dos limiares se ainda não existirem.
if (!edge.includes("LARANJAL_ALERT_THRESHOLD_M")) {
  edge = edge.replace(
    "const SENSOR_HEIGHT_M = 5.06;",
    "const SENSOR_HEIGHT_M = 5.06;\nconst LARANJAL_ALERT_THRESHOLD_M = 1.20;\nconst LARANJAL_CRITICAL_THRESHOLD_M = 1.40;"
  );
}

// 2) Atualiza classificação.
edge = edge.replace(
`function classifyLaranjal(levelM: number | null) {
  if (typeof levelM !== "number") return "SEM_LEITURA";

  // Ainda sem limiar oficial validado no Sentinela.
  // Por segurança, não gera ALERTA automático.
  return "SEM_LIMIAR";
}`,
`function classifyLaranjal(levelM: number | null) {
  if (typeof levelM !== "number") return "SEM_LEITURA";
  if (levelM >= LARANJAL_CRITICAL_THRESHOLD_M) return "ALERTA";
  if (levelM >= LARANJAL_ALERT_THRESHOLD_M) return "ATENCAO";
  return "NORMAL";
}`
);

// 3) Atualiza retorno JSON com limiares.
edge = edge.replace(
  "threshold_m: null,\n      threshold_cm: null,\n      status: classifyLaranjal(levelM),",
  "threshold_m: LARANJAL_ALERT_THRESHOLD_M,\n      threshold_cm: Number((LARANJAL_ALERT_THRESHOLD_M * 100).toFixed(0)),\n      critical_threshold_m: LARANJAL_CRITICAL_THRESHOLD_M,\n      critical_threshold_cm: Number((LARANJAL_CRITICAL_THRESHOLD_M * 100).toFixed(0)),\n      status: classifyLaranjal(levelM),"
);

edge = edge.replace(
  'note: "Nível calculado conforme dashboard público HidroSens: nivel = 5.06 - Distance.",',
  'note: "Nível calculado conforme dashboard público HidroSens: nivel = 5.06 - Distance. Limiares adotados: alerta 1,20 m; inundação crítica 1,40 m.",'
);

fs.writeFileSync(edgePath, edge, "utf8");

console.log("Edge Function hidrosens-laranjal atualizada com limiares.");
console.log("Agora rode: supabase functions deploy hidrosens-laranjal --no-verify-jwt");
