const fs = require("fs");
const path = require("path");

const root = process.cwd();

const patterns = [
  /^App\.restaurado\.jsx$/,
  /^aplicar-.*\.cjs$/,
  /^corrigir-.*\.cjs$/,
  /^restaurar-.*\.cjs$/,
  /^auditar-copernicus-health\.cjs$/,
  /^src[\\\/]App\.restaurado\.jsx$/,
  /^src[\\\/]App\.jsx\.backup-.+$/,
];

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "dist") continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(root);
const matches = files
  .map((full) => path.relative(root, full))
  .filter((rel) => patterns.some((p) => p.test(rel)));

if (!matches.length) {
  console.log("Nenhum arquivo temporário encontrado.");
  process.exit(0);
}

console.log("Arquivos que serão removidos:");
for (const rel of matches) console.log("- " + rel);

for (const rel of matches) {
  fs.unlinkSync(path.join(root, rel));
}

console.log("\nLimpeza concluída.");
console.log("Agora rode:");
console.log("npm run build");
console.log("git status");
