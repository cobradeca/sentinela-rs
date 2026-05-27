const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-hidrosens-limiares");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-hidrosens-limiares");
}

// Limiares adotados para Pelotas / Laranjal — Sensor HidroSens UFPel:
// Cota de Alerta: 1,20 m
// Cota de Inundação Crítica: 1,40 m

// 1) Atualiza o retorno do fetchHidroSensLaranjalLevel no App.jsx para carregar os limiares.
app = app.replace(
  "threshold_m: data.threshold_m ?? null,\n      threshold_cm: data.threshold_cm ?? null,\n      status: data.status || \"SEM_LIMIAR\",",
  "threshold_m: data.threshold_m ?? 1.20,\n      threshold_cm: data.threshold_cm ?? 120,\n      critical_threshold_m: data.critical_threshold_m ?? 1.40,\n      critical_threshold_cm: data.critical_threshold_cm ?? 140,\n      status: data.status || (data.level_m >= 1.40 ? \"ALERTA\" : data.level_m >= 1.20 ? \"ATENCAO\" : \"NORMAL\"),"
);

// 2) Atualiza o cálculo local do objeto lagoa para aceitar o limiar do HidroSens.
app = app.replace(
  "threshold_m: hidrosensLevel?.threshold_m ?? radarLevel?.threshold_m ?? null,\n          levelStatus: hidrosensLevel?.status ?? radarLevel?.status ?? (realLevel !== null ? \"SEM_LIMIAR\" : \"SEM_LEITURA\"),",
  "threshold_m: hidrosensLevel?.threshold_m ?? radarLevel?.threshold_m ?? null,\n          critical_threshold_m: hidrosensLevel?.critical_threshold_m ?? null,\n          levelStatus: hidrosensLevel?.status ?? radarLevel?.status ?? (realLevel !== null ? \"SEM_LIMIAR\" : \"SEM_LEITURA\"),"
);

// 3) Alerta automático: agora HidroSens com limiar também pode elevar risco.
app = app.replace(
  "const levelRisk = (lagoa?.radar && lagoa?.threshold_m) ? radarRiskToLevel(lagoa.levelStatus) : \"NORMAL\";",
  "const levelRisk = ((lagoa?.radar || lagoa?.hidrosens) && lagoa?.threshold_m) ? radarRiskToLevel(lagoa.levelStatus) : \"NORMAL\";"
);

// Caso o trecho antigo ainda exista:
app = app.replace(
  "const levelRisk = lagoa?.radar ? radarRiskToLevel(lagoa.levelStatus) : \"NORMAL\";",
  "const levelRisk = ((lagoa?.radar || lagoa?.hidrosens) && lagoa?.threshold_m) ? radarRiskToLevel(lagoa.levelStatus) : \"NORMAL\";"
);

// 4) Remove nota antiga de Pelotas que dizia limiar não validado.
app = app.replace(
  "nível real calculado por Distance; limiar de inundação ainda não validado",
  "Sensor HidroSens UFPel · alerta 1,20 m · inundação crítica 1,40 m"
);

// 5) Troca textos visuais para Pelotas quando houver limiar.
app = app.replaceAll(
  "não gera alerta por nível",
  "alerta automático conforme limiar"
);

app = app.replaceAll(
  "alerta automático desligado",
  "alerta automático conforme limiar"
);

// 6) Se houver bloco de máximo maio/2024, não altera. O máximo histórico de Pelotas continua ausente se não foi validado.

// 7) Melhora label: se status for ATENCAO por HidroSens, usa Atenção; se ALERTA, mantém acima da cota.
// A função lagoaStatusLabel já cobre ATENCAO/ALERTA/NORMAL.

fs.writeFileSync(appPath, app, "utf8");

console.log("Limiares HidroSens/Laranjal aplicados: alerta 1,20 m; inundação crítica 1,40 m.");
console.log("Backup preservado em src/App.jsx.backup-hidrosens-limiares.");
console.log("Agora rode: npm run build");
