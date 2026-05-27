const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-hidrosens-max-maio-2024");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-hidrosens-max-maio-2024");
}

// Adota máximo maio/2024 para Pelotas / Laranjal — Sensor HidroSens/UFPel:
// Máx. maio/2024: 240 cm = 2,40 m

// 1) Adiciona max_may_2024_m no objeto retornado por fetchHidroSensLaranjalLevel().
app = app.replace(
  "critical_threshold_m: data.critical_threshold_m ?? 1.40,\n      critical_threshold_cm: data.critical_threshold_cm ?? 140,\n      status:",
  "critical_threshold_m: data.critical_threshold_m ?? 1.40,\n      critical_threshold_cm: data.critical_threshold_cm ?? 140,\n      max_may_2024_m: data.max_may_2024_m ?? 2.40,\n      max_may_2024_cm: data.max_may_2024_cm ?? 240,\n      status:"
);

// 2) getLagoaMaxMay2024 deve considerar HidroSens também, não só RADAR.
app = app.replace(
  "return lagoa?.radar?.max_may_2024_m ?? null;",
  "return lagoa?.hidrosens?.max_may_2024_m ?? lagoa?.radar?.max_may_2024_m ?? null;"
);

// 3) Troca nota específica de Pelotas, se existir.
app = app.replace(
  "Sensor HidroSens UFPel · alerta 1,20 m · inundação crítica 1,40 m",
  "Sensor HidroSens UFPel · alerta 1,20 m · crítica 1,40 m · máx. maio/2024 2,40 m"
);

fs.writeFileSync(appPath, app, "utf8");

console.log("Máx. maio/2024 do HidroSens/Laranjal adotado: 240 cm / 2,40 m.");
console.log("Backup preservado em src/App.jsx.backup-hidrosens-max-maio-2024.");
console.log("Agora rode: npm run build");
