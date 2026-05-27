const fs = require("fs");
const path = require("path");

const root = process.cwd();

const KEEP = new Set([
  "package.json",
  "package-lock.json",
  "vite.config.js",
  "index.html",
  ".gitignore",
  "README.md",
]);

const ROOT_FILE_PATTERNS = [
  /^aplicar-.*\.cjs$/,
  /^auditar-.*\.cjs$/,
  /^corrigir-.*\.cjs$/,
  /^investigar-.*\.cjs$/,
  /^remover-.*\.cjs$/,
  /^restaurar-.*\.cjs$/,
  /^testar-.*\.cjs$/,
  /^App\.restaurado\.jsx$/,
  /^cptec-api\.js$/,
  /^cptec-.*\.html$/,
  /^lagoa-.*\.(html|js|json)$/,
  /^hidrosens-.*\.(html|json)$/,
  /^ana-.*\.json$/,
  /^.*backup.*$/,
];

const ROOT_DIR_PATTERNS = [
  /^cptec-inpe-investigacao$/,
];

function shouldDeleteRootFile(name) {
  if (KEEP.has(name)) return false;
  return ROOT_FILE_PATTERNS.some((p) => p.test(name));
}

function shouldDeleteRootDir(name) {
  return ROOT_DIR_PATTERNS.some((p) => p.test(name));
}

const dryRun = process.argv.includes("--dry-run");
const entries = fs.readdirSync(root, { withFileTypes: true });

const targets = [];

for (const entry of entries) {
  if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist" || entry.name === "src" || entry.name === "supabase" || entry.name === "public") continue;

  if (entry.isFile() && shouldDeleteRootFile(entry.name)) {
    targets.push(entry.name);
  }

  if (entry.isDirectory() && shouldDeleteRootDir(entry.name)) {
    targets.push(entry.name);
  }
}

// Também remove backups dentro de src
const srcDir = path.join(root, "src");
if (fs.existsSync(srcDir)) {
  for (const name of fs.readdirSync(srcDir)) {
    if (/^App\.jsx\.backup-.+$/.test(name) || name === "App.restaurado.jsx") {
      targets.push(path.join("src", name));
    }
  }
}

if (!targets.length) {
  console.log("Nada para limpar.");
  process.exit(0);
}

console.log(dryRun ? "Arquivos/pastas que seriam removidos:" : "Removendo:");
for (const rel of targets) console.log("- " + rel);

if (dryRun) {
  console.log("\nDry-run apenas. Para apagar de verdade:");
  console.log("node limpar-raiz-sentinela.cjs");
  process.exit(0);
}

for (const rel of targets) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) fs.rmSync(full, { recursive: true, force: true });
  else fs.unlinkSync(full);
}

console.log("\nLimpeza concluída.");
console.log("Agora rode:");
console.log("npm run build");
console.log("git status");
