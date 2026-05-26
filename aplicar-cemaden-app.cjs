const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-cemaden");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-cemaden");
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  return source.replace(search, replacement);
}

// 1) Constante da função CEMADEN.
if (!app.includes("CEMADEN_RS_FUNCTION_URL")) {
  if (app.includes('const INMET_FORECAST_BASE_URL = "https://apiprevmet3.inmet.gov.br/previsao";\n')) {
    app = replaceOnce(
      app,
      'const INMET_FORECAST_BASE_URL = "https://apiprevmet3.inmet.gov.br/previsao";\n',
      'const INMET_FORECAST_BASE_URL = "https://apiprevmet3.inmet.gov.br/previsao";\nconst CEMADEN_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cemaden-rs";\n',
      "constante CEMADEN_RS_FUNCTION_URL"
    );
  } else {
    app = replaceOnce(
      app,
      'const DEFESA_CIVIL_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs";\n',
      'const DEFESA_CIVIL_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs";\nconst CEMADEN_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cemaden-rs";\n',
      "constante CEMADEN_RS_FUNCTION_URL alternativa"
    );
  }
}

// 2) Função CEMADEN.
const cemadenFunctions = `
// CEMADEN — chuva observada por acumulados recentes.
// O token fica no Supabase Secret CEMADEN_PED_TOKEN, nunca no App.jsx.
async function fetchCemadenAccumulations() {
  try {
    const res = await fetch(CEMADEN_RS_FUNCTION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return {};

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.cities)) return {};

    return Object.fromEntries(
      data.cities
        .filter((city) => city?.ok && city?.city_id)
        .map((city) => [city.city_id, city])
    );
  } catch {
    return {};
  }
}

function formatCemadenRain(cemaden) {
  if (!cemaden) return "";
  const acc24 = typeof cemaden.max_acc24hr === "number" ? cemaden.max_acc24hr : null;
  const acc6 = typeof cemaden.max_acc6hr === "number" ? cemaden.max_acc6hr : null;

  if (acc24 !== null) return \`chuva observada 24h \${acc24.toFixed(1)}mm\`;
  if (acc6 !== null) return \`chuva observada 6h \${acc6.toFixed(1)}mm\`;

  return "chuva observada disponível";
}
`;

if (!app.includes("async function fetchCemadenAccumulations()")) {
  if (app.includes("// INMET — previsão oficial por município.")) {
    app = replaceOnce(
      app,
      "// INMET — previsão oficial por município.",
      `${cemadenFunctions}
// INMET — previsão oficial por município.`,
      "funções CEMADEN antes do INMET"
    );
  } else if (app.includes("// Defesa Civil RS — RSS oficial via Supabase Edge Function.")) {
    app = replaceOnce(
      app,
      "// Defesa Civil RS — RSS oficial via Supabase Edge Function.",
      `${cemadenFunctions}
// Defesa Civil RS — RSS oficial via Supabase Edge Function.`,
      "funções CEMADEN antes da Defesa Civil"
    );
  } else {
    console.error("ERRO: não encontrei ponto para inserir funções CEMADEN.");
    process.exit(1);
  }
}

// 3) Busca CEMADEN uma vez por carregamento e injeta nos cards.
if (!app.includes("const cemadenByCityId = await fetchCemadenAccumulations();")) {
  app = replaceOnce(
    app,
    `    const results = {};
    const newAlerts = [];
    for (const st of STATIONS) {
`,
    `    const results = {};
    const newAlerts = [];
    const cemadenByCityId = await fetchCemadenAccumulations();

    for (const st of STATIONS) {
`,
    "busca CEMADEN antes do loop"
  );
}

if (!app.includes("const cemaden = cemadenByCityId[st.id] || null;")) {
  app = replaceOnce(
    app,
    `        const inmet = st.ibgeCode ? await fetchInmetForecast(st.ibgeCode) : null;
        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
`,
    `        const inmet = st.ibgeCode ? await fetchInmetForecast(st.ibgeCode) : null;
        const cemaden = cemadenByCityId[st.id] || null;
        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
`,
    "variável cemaden por estação"
  );
}

if (app.includes(`results[st.id] = { weather, inmet, lagoa, precip, tempMin, windMax, risk, realLevel };`)) {
  app = app.replace(
    `results[st.id] = { weather, inmet, lagoa, precip, tempMin, windMax, risk, realLevel };`,
    `results[st.id] = { weather, inmet, cemaden, lagoa, precip, tempMin, windMax, risk, realLevel };`
  );
} else if (app.includes(`results[st.id] = { weather, lagoa, precip, tempMin, windMax, risk, realLevel };`)) {
  app = app.replace(
    `results[st.id] = { weather, lagoa, precip, tempMin, windMax, risk, realLevel };`,
    `results[st.id] = { weather, cemaden, lagoa, precip, tempMin, windMax, risk, realLevel };`
  );
} else if (!app.includes("weather, inmet, cemaden")) {
  console.error("ERRO: não encontrei o ponto de armazenamento results[st.id].");
  process.exit(1);
}

// 4) Mostra CEMADEN no Dashboard.
if (!app.includes("CEMADEN: {formatCemadenRain(d.cemaden)}")) {
  if (app.includes(`● INMET: {d.inmet.resumo}`)) {
    app = replaceOnce(
      app,
      `                      {d.inmet && (
                        <div style={{ fontSize:8, color:t.accent, marginTop:3 }}>
                          ● INMET: {d.inmet.resumo}
                        </div>
                      )}
`,
      `                      {d.inmet && (
                        <div style={{ fontSize:8, color:t.accent, marginTop:3 }}>
                          ● INMET: {d.inmet.resumo}
                        </div>
                      )}
                      {d.cemaden && (
                        <div style={{ fontSize:8, color:"#22c55e", marginTop:3 }}>
                          ● CEMADEN: {formatCemadenRain(d.cemaden)}
                        </div>
                      )}
`,
      "linha CEMADEN abaixo do INMET"
    );
  } else {
    console.error("ERRO: não encontrei a linha visual do INMET para inserir CEMADEN.");
    process.exit(1);
  }
}

// 5) Atualiza status CEMADEN em Fontes de Dados, se existir como planejado.
app = app.replace(
  /{ n:"CEMADEN"[^}]+}/,
  `{ n:"CEMADEN",                   st:"ATIVO",     c:"#22c55e", d:"Chuva observada por acumulados recentes das PCDs CEMADEN, via Supabase Edge Function com token protegido.", a:"Token PED via Supabase Secret", h:"Endpoint ativo: https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/cemaden-rs" }`
);

// 6) Atualiza rodapé de fontes, se ainda estiver sem CEMADEN.
app = app.replace(
  "Open-Meteo + ANA HidroWeb + NOAA ENSO + INPE + Copernicus",
  "Open-Meteo + INMET + CEMADEN + ANA HidroWeb + NOAA ENSO + INPE + Copernicus"
);

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado com CEMADEN.");
console.log("Backup preservado em src/App.jsx.backup-cemaden.");
console.log("Agora rode: npm run build");
