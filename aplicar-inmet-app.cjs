const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-inmet");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-inmet");
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  return source.replace(search, replacement);
}

// 1) Adiciona códigos IBGE nas cidades monitoradas.
const stationReplacements = [
  [
    '{ id: "rs_porto_alegre",  name: "Porto Alegre",   lat: -30.03, lon: -51.23, type: "cidade", rioRef: "Guaíba — enchente mai/2024" }',
    '{ id: "rs_porto_alegre",  name: "Porto Alegre",   lat: -30.03, lon: -51.23, type: "cidade", ibgeCode: "4314902", rioRef: "Guaíba — enchente mai/2024" }'
  ],
  [
    '{ id: "rs_pelotas",       name: "Pelotas",        lat: -31.77, lon: -52.34, type: "cidade", rioRef: "Canal São Gonçalo" }',
    '{ id: "rs_pelotas",       name: "Pelotas",        lat: -31.77, lon: -52.34, type: "cidade", ibgeCode: "4314407", rioRef: "Canal São Gonçalo" }'
  ],
  [
    '{ id: "rs_rio_grande",    name: "Rio Grande",     lat: -32.03, lon: -52.10, type: "cidade", rioRef: "Lagoa dos Patos / litoral" }',
    '{ id: "rs_rio_grande",    name: "Rio Grande",     lat: -32.03, lon: -52.10, type: "cidade", ibgeCode: "4315602", rioRef: "Lagoa dos Patos / litoral" }'
  ],
  [
    '{ id: "rs_santa_maria",   name: "Santa Maria",    lat: -29.68, lon: -53.81, type: "cidade", rioRef: "Bacia do Vacacaí" }',
    '{ id: "rs_santa_maria",   name: "Santa Maria",    lat: -29.68, lon: -53.81, type: "cidade", ibgeCode: "4316907", rioRef: "Bacia do Vacacaí" }'
  ],
  [
    '{ id: "rs_caxias_sul",    name: "Caxias do Sul",  lat: -29.17, lon: -51.17, type: "cidade", rioRef: "Bacia do Caí" }',
    '{ id: "rs_caxias_sul",    name: "Caxias do Sul",  lat: -29.17, lon: -51.17, type: "cidade", ibgeCode: "4305108", rioRef: "Bacia do Caí" }'
  ],
  [
    '{ id: "rs_passo_fundo",   name: "Passo Fundo",    lat: -28.26, lon: -52.41, type: "cidade", rioRef: "Rio Passo Fundo" }',
    '{ id: "rs_passo_fundo",   name: "Passo Fundo",    lat: -28.26, lon: -52.41, type: "cidade", ibgeCode: "4314100", rioRef: "Rio Passo Fundo" }'
  ],
  [
    '{ id: "rs_lajeado",       name: "Lajeado",        lat: -29.47, lon: -51.96, type: "cidade", rioRef: "Rio Taquari — recorde 2023" }',
    '{ id: "rs_lajeado",       name: "Lajeado",        lat: -29.47, lon: -51.96, type: "cidade", ibgeCode: "4311403", rioRef: "Rio Taquari — recorde 2023" }'
  ],
  [
    '{ id: "rs_canoas",        name: "Canoas",         lat: -29.92, lon: -51.18, type: "cidade", rioRef: "Lago Guaíba / Gravataí" }',
    '{ id: "rs_canoas",        name: "Canoas",         lat: -29.92, lon: -51.18, type: "cidade", ibgeCode: "4304606", rioRef: "Lago Guaíba / Gravataí" }'
  ],
  [
    '{ id: "rs_sao_leopoldo",  name: "São Leopoldo",   lat: -29.76, lon: -51.14, type: "cidade", rioRef: "Rio dos Sinos" }',
    '{ id: "rs_sao_leopoldo",  name: "São Leopoldo",   lat: -29.76, lon: -51.14, type: "cidade", ibgeCode: "4318705", rioRef: "Rio dos Sinos" }'
  ],
  [
    '{ id: "rs_cachoeira_sul", name: "Cachoeira do Sul",lat: -29.88, lon: -52.89, type: "cidade", rioRef: "Rio Jacuí" }',
    '{ id: "rs_cachoeira_sul", name: "Cachoeira do Sul",lat: -29.88, lon: -52.89, type: "cidade", ibgeCode: "4303004", rioRef: "Rio Jacuí" }'
  ],
];

for (const [from, to] of stationReplacements) {
  if (app.includes(from)) {
    app = app.replace(from, to);
  }
}

// 2) Constante de endpoint INMET.
if (!app.includes("INMET_FORECAST_BASE_URL")) {
  app = replaceOnce(
    app,
    'const DEFESA_CIVIL_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs";\n',
    'const DEFESA_CIVIL_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs";\nconst INMET_FORECAST_BASE_URL = "https://apiprevmet3.inmet.gov.br/previsao";\n',
    "constante INMET_FORECAST_BASE_URL"
  );
}

// 3) Funções INMET.
const inmetFunctions = `
// INMET — previsão oficial por município.
// Endpoint validado no navegador: apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}
function pickInmetPeriod(dayData) {
  if (!dayData || typeof dayData !== "object") return null;
  return dayData.manha || dayData.tarde || dayData.noite || Object.values(dayData)[0] || null;
}

function normalizeInmetForecast(raw, ibgeCode) {
  const cityBlock = raw?.[ibgeCode];
  if (!cityBlock || typeof cityBlock !== "object") return null;

  const todayKey = Object.keys(cityBlock)[0];
  const period = pickInmetPeriod(cityBlock[todayKey]);

  if (!todayKey || !period) return null;

  return {
    source: "INMET",
    official: true,
    ibgeCode,
    date: todayKey,
    city: period.entidade || "",
    resumo: period.resumo || "",
    tempMax: period.temp_max ?? null,
    tempMin: period.temp_min ?? null,
    windDirection: period.dir_vento || "",
    windIntensity: period.int_vento || "",
    humidityMax: period.umidade_max ?? null,
    humidityMin: period.umidade_min ?? null,
    weekday: period.dia_semana || "",
  };
}

async function fetchInmetForecast(ibgeCode) {
  if (!ibgeCode) return null;

  try {
    const res = await fetch(\`\${INMET_FORECAST_BASE_URL}/\${ibgeCode}\`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const raw = await res.json();
    return normalizeInmetForecast(raw, ibgeCode);
  } catch {
    return null;
  }
}
`;

if (!app.includes("function fetchInmetForecast(ibgeCode)")) {
  app = replaceOnce(
    app,
    `// Defesa Civil RS — RSS oficial via Supabase Edge Function.
// Não buscar o RSS direto no navegador: o site oficial bloqueia por CORS.
`,
    `${inmetFunctions}
// Defesa Civil RS — RSS oficial via Supabase Edge Function.
// Não buscar o RSS direto no navegador: o site oficial bloqueia por CORS.
`,
    "funções INMET"
  );
}

// 4) Busca INMET dentro do carregamento, apenas para cidades com ibgeCode.
if (!app.includes("const inmet = st.ibgeCode ? await fetchInmetForecast(st.ibgeCode) : null;")) {
  app = replaceOnce(
    app,
    `        if (st.anaCode) realLevel = await fetchAnaLevel(st.anaCode);
        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
`,
    `        if (st.anaCode) realLevel = await fetchAnaLevel(st.anaCode);
        const inmet = st.ibgeCode ? await fetchInmetForecast(st.ibgeCode) : null;
        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
`,
    "chamada INMET no loop de estações"
  );

  app = replaceOnce(
    app,
    `        results[st.id] = { weather, lagoa, precip, tempMin, windMax, risk, realLevel };
`,
    `        results[st.id] = { weather, inmet, lagoa, precip, tempMin, windMax, risk, realLevel };
`,
    "armazenamento INMET no stationData"
  );
}

// 5) Exibe selo compacto INMET nos cards do dashboard.
if (!app.includes('INMET: {d.inmet.resumo}')) {
  app = replaceOnce(
    app,
    `{station.rioRef && <div style={{ fontSize:8, color:t.textFaint, marginTop:1 }}>{station.rioRef}</div>}
                    </div>
                    <div style={{ fontSize:9, fontWeight:700, padding:"2px 7px", border:\`1px solid \${rColor}\`, color:rColor, borderRadius:3 }}>{risk.icon} {risk.label}</div>
`,
    `{station.rioRef && <div style={{ fontSize:8, color:t.textFaint, marginTop:1 }}>{station.rioRef}</div>}
                      {d.inmet && (
                        <div style={{ fontSize:8, color:t.accent, marginTop:3 }}>
                          ● INMET: {d.inmet.resumo}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:9, fontWeight:700, padding:"2px 7px", border:\`1px solid \${rColor}\`, color:rColor, borderRadius:3 }}>{risk.icon} {risk.label}</div>
`,
    "selo INMET nos cards do dashboard"
  );
}

// 6) Atualiza status da fonte INMET na aba Fontes de Dados.
app = app.replace(
  `{ n:"INMET",                     st:"PLANEJADO", c:"#eab308", d:"Estações automáticas RS: temperatura, umidade, pressão em tempo real.", a:"Token gratuito", h:"1. portal.inmet.gov.br → Dados → API\\n2. Token gratuito\\n3. GET apitempo.inmet.gov.br/estacao/{token}/{data}/{est}" }`,
  `{ n:"INMET",                     st:"ATIVO",     c:"#22c55e", d:"Previsão oficial por município via apiprevmet3.inmet.gov.br/previsao/{codigo_ibge}. Conectado diretamente no navegador.", a:"API pública, sem chave", h:"Endpoint validado: https://apiprevmet3.inmet.gov.br/previsao/4315602" }`
);

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado com conexão INMET.");
console.log("Backup preservado em src/App.jsx.backup-inmet.");
console.log("Agora rode: npm run build");
