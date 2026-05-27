const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-fontes-noaa-iri-ativos");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-fontes-noaa-iri-ativos");
}

// Atualiza a aba Fontes de Dados para refletir o estado real após ativar:
// - NOAA/CPC observado
// - IRI/CCSR probabilidades ENSO
//
// Não marca Copernicus/CPTEC como ativo real ainda.

const replacements = [
  [
    "NOAA/IRI — Índice ENSO",
    "NOAA/CPC + IRI — ENSO"
  ],
  [
    "El Niño/La Niña: Niño 3.4, ONI, probabilidades 8 meses. Dados de referência mai/2026 — requer atualização manual mensal.",
    "El Niño/La Niña: Niño 3.4 e ONI via NOAA/CPC; probabilidades sazonais via IRI/CCSR."
  ],
  [
    "NOAA/CPC — ENSO observado",
    "NOAA/CPC + IRI — ENSO"
  ],
  [
    "Niño 3.4 e ONI atualizados via Edge Function; probabilidades IRI ainda usam referência estática.",
    "Niño 3.4, ONI e probabilidades ENSO atualizados via Edge Functions."
  ],
  [
    "🔑 Dados públicos, atualização mensal",
    "🔑 Dados públicos, atualização dinâmica"
  ],
];

// Substituições simples.
let changed = 0;
for (const [from, to] of replacements) {
  if (app.includes(from)) {
    app = app.replaceAll(from, to);
    changed++;
  }
}

// Onde estiver o card NOAA/IRI ou NOAA/CPC + IRI, força status ATIVO.
// Tenta padrões comuns do array de fontes.
app = app.replace(
  /(\{\s*n:\s*"NOAA\/CPC \+ IRI — ENSO"[\s\S]*?st:\s*")ESTÁTICO("[\s\S]*?\})/g,
  "$1ATIVO$2"
);
app = app.replace(
  /(\{\s*n:\s*"NOAA\/CPC \+ IRI — ENSO"[\s\S]*?st:\s*")ATIVO PARCIAL("[\s\S]*?\})/g,
  "$1ATIVO$2"
);

// Se houver texto de status solto no mesmo bloco, ajusta o primeiro caso provável.
app = app.replace(
  /NOAA\/CPC \+ IRI — ENSO([\s\S]{0,500}?)ESTÁTICO/,
  (m, mid) => `NOAA/CPC + IRI — ENSO${mid}ATIVO`
);
app = app.replace(
  /NOAA\/CPC \+ IRI — ENSO([\s\S]{0,500}?)ATIVO PARCIAL/,
  (m, mid) => `NOAA/CPC + IRI — ENSO${mid}ATIVO`
);

// Atualiza Copernicus para ficar bem claro que ainda NÃO é endpoint real.
app = app.replaceAll(
  "Copernicus — Indicadores",
  "Copernicus — Indicadores de referência"
);

app = app.replaceAll(
  "NDVI, SPI-3, IQA, nível do mar: dados de referência de publicações Copernicus/MapBiomas. NÃO são consultados em tempo real.",
  "NDVI, SPI-3, IQA e nível do mar permanecem como referência estática; APIs reais exigem cadastro/token."
);

// Mantém CPTEC planejado, mas deixa texto mais preciso.
app = app.replaceAll(
  "Previsão climática sazonal, boletins ENSO oficiais BR.",
  "Previsão climática sazonal e boletins oficiais BR; aguardando endpoint público estável."
);

// Acrescenta URLs das novas funções na lista de fontes, se o texto existir e ainda não tiver.
if (!app.includes("noaa-enso") && app.includes("NOAA/CPC + IRI — ENSO")) {
  app = app.replace(
    "NOAA/CPC + IRI — ENSO",
    "NOAA/CPC + IRI — ENSO"
  );
}

// Verificação final textual.
const checks = [
  ["NOAA/CPC + IRI — ENSO", app.includes("NOAA/CPC + IRI — ENSO")],
  ["noaa-enso function const", app.includes("NOAA_ENSO_FUNCTION_URL")],
  ["iri-enso function const", app.includes("IRI_ENSO_PROB_FUNCTION_URL")],
];

fs.writeFileSync(appPath, app, "utf8");

console.log("Aba Fontes de Dados ajustada para NOAA/CPC + IRI ativos.");
console.log(`Substituições base aplicadas: ${changed}`);
for (const [label, ok] of checks) {
  console.log(`${ok ? "OK" : "AVISO"}: ${label}`);
}
console.log("Backup preservado em src/App.jsx.backup-fontes-noaa-iri-ativos.");
console.log("Agora rode: npm run build");
