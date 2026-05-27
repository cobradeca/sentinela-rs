const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-saude-fontes-completa-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

let changes = 0;

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) {
    console.error("ERRO: trecho não encontrado:", label);
    process.exit(1);
  }
  app = app.replace(search, replacement);
  changes++;
  console.log("OK:", label);
}

function insertAfter(search, insert, label) {
  if (!app.includes(search)) {
    console.error("ERRO: âncora não encontrada:", label);
    process.exit(1);
  }
  if (app.includes(insert.trim().slice(0, 80))) {
    console.log("OK: já existia:", label);
    return;
  }
  app = app.replace(search, search + insert);
  changes++;
  console.log("OK:", label);
}

// 1) Helper para registrar saúde de fontes carregadas por useEffect fora do loadAllData.
if (!app.includes("function markSourceHealth")) {
  insertAfter(
`  const getRiskBg = (lvl) => {
    const r = RISK_LEVELS[lvl];
    return dark ? r.bg : r.bgLight;
  };
`,
`
  function markSourceHealth(name, ok, startedAt, error = null) {
    const next = {
      ...sourceHealthRef.current,
      [name]: {
        ok: Boolean(ok),
        lastOk: ok ? new Date().toISOString() : sourceHealthRef.current[name]?.lastOk || null,
        latencyMs: Date.now() - startedAt,
        error,
      },
    };
    sourceHealthRef.current = next;
    setSourceHealth({ ...next });
  }
`,
"helper markSourceHealth"
  );
}

// 2) CPTEC health.
replaceOnce(
`    async function loadCptecProducts() {
      const data = await fetchCptecInpeProducts();
      if (!alive || !data) return;
      setCptecProducts(data);
    }`,
`    async function loadCptecProducts() {
      const startedAt = Date.now();
      const data = await fetchCptecInpeProducts();
      if (!alive) return;
      markSourceHealth("CPTEC/INPE", Boolean(data), startedAt, data ? null : "sem produto oficial validado");
      if (!data) return;
      setCptecProducts(data);
    }`,
"saúde CPTEC"
);

// 3) Copernicus Water health.
replaceOnce(
`    async function loadCopernicusWater() {
      const data = await fetchCopernicusWater("lagoa_patos", 30);
      if (!alive) return;
      setCopernicusWater(data);
    }`,
`    async function loadCopernicusWater() {
      const startedAt = Date.now();
      const data = await fetchCopernicusWater("lagoa_patos", 30);
      if (!alive) return;
      markSourceHealth("Copernicus Water", Boolean(data?.ok && typeof data?.water_percent === "number"), startedAt, data?.error || (data ? data.status : "sem resposta"));
      setCopernicusWater(data);
    }`,
"saúde Copernicus Water"
);

// 4) Copernicus Sentinel-1 health.
replaceOnce(
`    async function loadCopernicusSentinel1() {
      const data = await fetchCopernicusSentinel1("lagoa_patos", 18);
      if (!alive) return;
      setCopernicusS1(data);
    }`,
`    async function loadCopernicusSentinel1() {
      const startedAt = Date.now();
      const data = await fetchCopernicusSentinel1("lagoa_patos", 18);
      if (!alive) return;
      markSourceHealth("Copernicus Sentinel-1", Boolean(data?.water_like_percent !== undefined), startedAt, data?.error || (data ? data.status : "sem resposta"));
      setCopernicusS1(data);
    }`,
"saúde Copernicus Sentinel-1"
);

// 5) Copernicus NDVI health.
replaceOnce(
`    async function loadCopernicusNdvi() {
      const data = await fetchCopernicusNdvi("entorno_lagoa_patos", 30);
      if (!alive) return;
      setCopernicusNdvi(data);
    }`,
`    async function loadCopernicusNdvi() {
      const startedAt = Date.now();
      const data = await fetchCopernicusNdvi("entorno_lagoa_patos", 30);
      if (!alive) return;
      markSourceHealth("Copernicus NDVI", Boolean(data?.ok && typeof data?.ndvi_mean === "number"), startedAt, data?.error || (data ? data.status : "sem resposta"));
      setCopernicusNdvi(data);
    }`,
"saúde Copernicus NDVI"
);

// 6) IRI health.
replaceOnce(
`    async function loadIriProbabilities() {
      const live = await fetchIriEnsoProbabilities();
      if (!alive || !live) return;
      setEnsoProbLive(live);
    }`,
`    async function loadIriProbabilities() {
      const startedAt = Date.now();
      const live = await fetchIriEnsoProbabilities();
      if (!alive) return;
      markSourceHealth("IRI/CCSR ENSO", Boolean(live), startedAt, live ? null : "sem probabilidade validada");
      if (!live) return;
      setEnsoProbLive(live);
    }`,
"saúde IRI/CCSR ENSO"
);

// 7) NOAA health.
replaceOnce(
`    async function loadEnsoLive() {
      const live = await fetchNoaaEnso();
      if (!alive || !live) return;

      setEnsoLive(live);
    }`,
`    async function loadEnsoLive() {
      const startedAt = Date.now();
      const live = await fetchNoaaEnso();
      if (!alive) return;
      markSourceHealth("NOAA/CPC ENSO", Boolean(live), startedAt, live ? null : "sem índice observado validado");
      if (!live) return;

      setEnsoLive(live);
    }`,
"saúde NOAA/CPC ENSO"
);

// 8) Lista do painel de saúde: inclui as fontes reais já conectadas.
replaceOnce(
`                  "Open-Meteo","ANA HidroWeb","INMET","CEMADEN","RADAR Lagoa","HidroSens","Defesa Civil RS",`,
`                  "Open-Meteo","INMET","CEMADEN","RADAR Lagoa","HidroSens","Defesa Civil RS",
                  "NOAA/CPC ENSO","IRI/CCSR ENSO","CPTEC/INPE","Copernicus Water","Copernicus Sentinel-1","Copernicus NDVI","ANA HidroWeb",`,
"lista completa saúde das fontes"
);

// 9) Ajusta lógica visual para ANA aguardando credencial/complementar.
replaceOnce(
`                  const anaComplementar = name === "ANA HidroWeb" && h && !ok;
                  const color = never ? "#64748b" : anaComplementar ? "#eab308" : ok ? "#22c55e" : "#ef4444";
                  const label = never ? "Aguardando" : anaComplementar ? "Complementar" : ok ? "OK" : "Falhou";`,
`                  const anaComplementar = name === "ANA HidroWeb" && (!h || !ok);
                  const color = never ? (anaComplementar ? "#eab308" : "#64748b") : anaComplementar ? "#eab308" : ok ? "#22c55e" : "#ef4444";
                  const label = anaComplementar ? "Aguardando API" : never ? "Aguardando" : ok ? "OK" : "Falhou";`,
"visual ANA aguardando API"
);

// 10) Mensagem em erro da ANA.
replaceOnce(
`                              {anaComplementar ? "sem leitura operacional validada" : h.error}`,
`                              {anaComplementar ? "aguardando credencial oficial da ANA" : h.error}`,
"mensagem ANA no health"
);

// 11) Atualiza nota do painel.
replaceOnce(
`                Atualizado a cada 30min junto com os dados. Latência medida no navegador.`,
`                Atualizado junto com os dados de cada fonte. Latência medida no navegador. Fontes complementares/aguardando credencial não reprovam o SITREP operacional.`,
"nota painel saúde"
);

// Validação.
const required = [
  '"Copernicus Water"',
  '"Copernicus Sentinel-1"',
  '"Copernicus NDVI"',
  '"NOAA/CPC ENSO"',
  '"IRI/CCSR ENSO"',
  '"CPTEC/INPE"',
  'markSourceHealth("Copernicus Water"',
  'markSourceHealth("Copernicus Sentinel-1"',
  'markSourceHealth("Copernicus NDVI"',
];

const missing = required.filter((m) => !app.includes(m));
if (missing.length) {
  console.error("ERRO: patch incompleto. Marcadores ausentes:");
  for (const m of missing) console.error(" - " + m);
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log(`Painel de saúde completo aplicado. Alterações: ${changes}`);
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
