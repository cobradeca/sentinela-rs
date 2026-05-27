const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", "App.jsx.backup-ana-complementar");
if (!fs.existsSync(backup)) fs.writeFileSync(backup, app, "utf8");

let changed = 0;

// Ajuste textual geral
const reps = [
  ["ANA HidroWeb", "ANA HidroWeb"],
  ["Falhou", "Complementar"],
  ["sem leitura", "sem leitura operacional validada"],
];

// Faz ajuste específico e seguro no trecho de saúde das fontes, sem mudar lógica da Lagoa.
app = app.replace(
  /(\["ANA HidroWeb"\][\s\S]{0,800}?)(Falhou)([\s\S]{0,800}?sem leitura)/g,
  (m) => {
    changed++;
    return m.replace("Falhou", "Complementar").replace("sem leitura", "sem leitura operacional validada");
  }
);

// Ajuste tolerante para cards que usam health ok=false como Falhou.
// Troca somente quando a fonte renderizada é ANA HidroWeb.
app = app.replace(
  /(ANA HidroWeb[\s\S]{0,1200}?)(Falhou)([\s\S]{0,1200}?)(sem leitura)([\s\S]{0,400})/g,
  (m) => {
    changed++;
    return m.replace("Falhou", "Complementar").replace("sem leitura", "sem leitura operacional validada");
  }
);

// Se houver lógica de label genérica por health ok, adiciona exceção visual ANA quando possível.
app = app.replace(
  /\{h\?\.ok\s*\?\s*"OK"\s*:\s*"Falhou"\}/g,
  '{name === "ANA HidroWeb" && !h?.ok ? "Complementar" : (h?.ok ? "OK" : "Falhou")}'
);

app = app.replace(
  /\{h\?\.error\s*\|\|\s*"sem leitura"\}/g,
  '{name === "ANA HidroWeb" && !h?.ok ? "sem leitura operacional validada" : (h?.error || "sem leitura")}'
);

// Se a estrutura usa key em vez de name.
app = app.replace(
  /\{health\?\.ok\s*\?\s*"OK"\s*:\s*"Falhou"\}/g,
  '{key === "ANA HidroWeb" && !health?.ok ? "Complementar" : (health?.ok ? "OK" : "Falhou")}'
);

fs.writeFileSync(appPath, app, "utf8");

console.log("Ajuste visual ANA aplicado.");
console.log(`Substituições/ajustes: ${changed}`);
console.log("Backup: src/App.jsx.backup-ana-complementar");
console.log("Agora rode: npm run build");
