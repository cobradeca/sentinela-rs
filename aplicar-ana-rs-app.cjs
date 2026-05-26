const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-ana-rs");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-ana-rs");
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  return source.replace(search, replacement);
}

// 1) Constante da Edge Function ANA.
if (!app.includes("ANA_RS_FUNCTION_URL")) {
  if (app.includes('const CEMADEN_ATTRIBUTION = "DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC";\n')) {
    app = replaceOnce(
      app,
      'const CEMADEN_ATTRIBUTION = "DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC";\n',
      'const CEMADEN_ATTRIBUTION = "DADOS DA REDE OBSERVACIONAL DO CEMADEN/MCTIC";\nconst ANA_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/ana-rs";\n',
      "constante ANA_RS_FUNCTION_URL"
    );
  } else {
    console.error("ERRO: não encontrei ponto para inserir ANA_RS_FUNCTION_URL.");
    process.exit(1);
  }
}

// 2) Substitui fetchAnaLevel antigo por versão via Supabase.
// O método antigo chamava a ANA com datas vazias e procurava <Cota>,
// mas o retorno validado usa <Nivel> e precisa de período com datas.
const oldFunction = `// ANA HidroWeb — nível real da lagoa
async function fetchAnaLevel(anaCode) {
  try {
    const url = \`https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=\${anaCode}&dataInicio=&dataFim=\`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/<Cota>([\\d.]+)<\\/Cota>/);
    return match ? parseFloat(match[1]) / 100 : null;
  } catch { return null; }
}
`;

const newFunction = `// ANA HidroWeb — nível real via Supabase Edge Function.
// A função ana-rs consulta a ANA com datas reais, lê <Nivel> e converte cm → m.
async function fetchAnaLevel(anaCode) {
  try {
    const res = await fetch(\`\${ANA_RS_FUNCTION_URL}?codEstacao=\${encodeURIComponent(anaCode)}\`, {
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (!data?.ok || typeof data?.latest?.level_m !== "number") {
      return null;
    }

    return data.latest.level_m;
  } catch {
    return null;
  }
}
`;

if (app.includes(oldFunction)) {
  app = app.replace(oldFunction, newFunction);
} else if (!app.includes("ANA HidroWeb — nível real via Supabase Edge Function")) {
  console.error("ERRO: não encontrei a função fetchAnaLevel antiga para substituir.");
  process.exit(1);
}

// 3) Atualiza status da ANA em Fontes de Dados, se o item existir.
app = app.replace(
  /{ n:"ANA HidroWeb"[^}]+}/,
  `{ n:"ANA HidroWeb",               st:"ATIVO PARCIAL", c:"#22c55e", d:"Nível real por telemetria ANA quando a estação possui dados no período. A estação 87450004 retornou Nivel válido; outras estações podem retornar sem dados.", a:"Supabase Edge Function", h:"Endpoint: ana-rs?codEstacao=. Parser usa <Nivel> em cm e converte para metros." }`
);

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado com ANA via Supabase Edge Function.");
console.log("Backup preservado em src/App.jsx.backup-ana-rs.");
console.log("Agora rode: npm run build");
