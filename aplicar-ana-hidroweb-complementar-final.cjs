const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", "App.jsx.backup-ana-complementar-final");
if (!fs.existsSync(backup)) fs.writeFileSync(backup, app, "utf8");

const oldBlock = `                  const h = sourceHealth[name];
                  const ok   = h?.ok;
                  const never = !h;
                  const color = never ? "#64748b" : ok ? "#22c55e" : "#ef4444";
                  const label = never ? "Aguardando" : ok ? "OK" : "Falhou";`;

const newBlock = `                  const h = sourceHealth[name];
                  const ok   = h?.ok;
                  const never = !h;
                  const anaComplementar = name === "ANA HidroWeb" && h && !ok;
                  const color = never ? "#64748b" : anaComplementar ? "#eab308" : ok ? "#22c55e" : "#ef4444";
                  const label = never ? "Aguardando" : anaComplementar ? "Complementar" : ok ? "OK" : "Falhou";`;

if (!app.includes(oldBlock)) {
  console.error("ERRO: bloco de saúde das fontes não encontrado.");
  process.exit(1);
}

app = app.replace(oldBlock, newBlock);

const oldError = `{h.error && !ok && <div style={{ fontSize:8, color:"#ef4444", marginTop:2 }}>{h.error}</div>}`;
const newError = `{h.error && !ok && (
                            <div style={{ fontSize:8, color:anaComplementar ? "#eab308" : "#ef4444", marginTop:2 }}>
                              {anaComplementar ? "sem leitura operacional validada" : h.error}
                            </div>
                          )}`;

if (!app.includes(oldError)) {
  console.error("ERRO: linha de erro da saúde das fontes não encontrada.");
  process.exit(1);
}

app = app.replace(oldError, newError);

fs.writeFileSync(appPath, app, "utf8");

console.log("ANA HidroWeb ajustada visualmente para Complementar.");
console.log("Backup: src/App.jsx.backup-ana-complementar-final");
console.log("Agora rode: npm run build");
