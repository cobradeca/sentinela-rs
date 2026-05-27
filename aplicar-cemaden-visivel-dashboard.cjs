const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backup = path.join(process.cwd(), "src", "App.jsx.backup-cemaden-visivel");
if (!fs.existsSync(backup)) fs.writeFileSync(backup, app, "utf8");

const oldBlock = `                      {d.cemaden && (
                        <div title={CEMADEN_ATTRIBUTION} style={{ fontSize:8, color:"#22c55e", marginTop:3 }}>
                          ● CEMADEN: {formatCemadenRain(d.cemaden)}
                        </div>
                      )}`;

const newBlock = `                      <div title={CEMADEN_ATTRIBUTION} style={{ fontSize:8, color:d.cemaden ? "#22c55e" : t.textFaint, marginTop:3 }}>
                        ● CEMADEN: {d.cemaden ? formatCemadenRain(d.cemaden) : "sem leitura observada"}
                      </div>`;

if (!app.includes(oldBlock)) {
  console.error("ERRO: bloco CEMADEN atual não encontrado. Nenhuma alteração feita.");
  process.exit(1);
}

app = app.replace(oldBlock, newBlock);
fs.writeFileSync(appPath, app, "utf8");

console.log("CEMADEN ficará sempre visível nos cards de cidades.");
console.log("Backup: src/App.jsx.backup-cemaden-visivel");
console.log("Agora rode: npm run build");
