const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-defesa-civil");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-defesa-civil");
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`ERRO: trecho não encontrado para: ${label}`);
    process.exit(1);
  }
  return source.replace(search, replacement);
}

if (!app.includes("DEFESA_CIVIL_RS_FUNCTION_URL")) {
  app = replaceOnce(
    app,
    'const dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];\n',
    'const dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];\n\nconst DEFESA_CIVIL_RS_FUNCTION_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs";\n',
    "constante DEFESA_CIVIL_RS_FUNCTION_URL"
  );
}

const defesaFunction = `
// Defesa Civil RS — RSS oficial via Supabase Edge Function.
// Não buscar o RSS direto no navegador: o site oficial bloqueia por CORS.
function normalizeOfficialRiskLevel(alert) {
  const text = \`\${alert?.title || ""} \${alert?.message || ""}\`.toUpperCase();

  if (text.includes("RISCO EXTREMO") || text.includes("EMERGÊNCIA METEOROLÓGICA") || text.includes("EMERGENCIA METEOROLOGICA")) {
    return "EMERGENCIA";
  }

  if (text.includes("RISCO MUITO ALTO") || text.includes("CRÍTICO") || text.includes("CRITICO")) {
    return "CRITICO";
  }

  if (text.includes("ALERTA") || text.includes("RISCO ALTO")) {
    return "ALERTA";
  }

  return alert?.risk_level || "ATENCAO";
}

async function fetchDefesaCivilAlerts() {
  try {
    const res = await fetch(DEFESA_CIVIL_RS_FUNCTION_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.alerts)) return [];

    return data.alerts.map((alert) => ({
      ...alert,
      id: alert.id || \`defesa_civil_rs_\${alert.at || alert.title}\`,
      station: alert.station || "Defesa Civil RS",
      risk_level: normalizeOfficialRiskLevel(alert),
      official: true,
      source: "Defesa Civil RS",
    }));
  } catch {
    return [];
  }
}
`;

if (!app.includes("function fetchDefesaCivilAlerts()")) {
  app = replaceOnce(
    app,
    `// INPE BDQueimadas
async function fetchQueimadas() {
  try {
    const url = "https://queimadas.dgi.inpe.br/api/focos/?pais_id=33&estado_id=43&quantidade=100";
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}
`,
    `// INPE BDQueimadas
async function fetchQueimadas() {
  try {
    const url = "https://queimadas.dgi.inpe.br/api/focos/?pais_id=33&estado_id=43&quantidade=100";
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}
${defesaFunction}`,
    "função fetchDefesaCivilAlerts"
  );
}

if (!app.includes("setAlerts([...officialAlerts, ...newAlerts]);")) {
  app = replaceOnce(
    app,
    `    setStationData(results);
    setAlerts(newAlerts);
    setLastUpdate(new Date());
    setLoading(false);
`,
    `    const officialAlerts = await fetchDefesaCivilAlerts();

    setStationData(results);
    setAlerts([...officialAlerts, ...newAlerts]);
    setLastUpdate(new Date());
    setLoading(false);
`,
    "junção dos alertas oficiais com alertas operacionais"
  );
}

app = app.replace(
  `{ i:"📢", n:"Defesa Civil RS",    s:"Webhook planejado",        ok:false, h:"1. alertas.rs.gov.br/rss\\n2. Edge Function lê RSS a cada 30min\\n3. Badge OFICIAL nos alertas" }`,
  `{ i:"📢", n:"Defesa Civil RS",    s:"Ativo — RSS oficial",      ok:true,  h:"Fonte oficial conectada via Supabase Edge Function. RSS: www.defesacivil.rs.gov.br/rss" }`
);

app = app.replace(
  `{ n:"AlertaRS / Defesa Civil",   st:"PLANEJADO", c:"#eab308", d:"Boletins e avisos oficiais de catástrofes do Estado.",             a:"RSS / Webhook", h:"1. alertas.rs.gov.br/rss\\n2. Edge Function lê RSS a cada 30min" }`,
  `{ n:"Defesa Civil RS",           st:"ATIVO",     c:"#22c55e", d:"Avisos oficiais via RSS da Defesa Civil do Rio Grande do Sul, consumidos por Supabase Edge Function para evitar bloqueio CORS.", a:"RSS oficial via proxy", h:"Endpoint ativo: https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/defesa-civil-rs" }`
);

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado com conexão da Defesa Civil RS.");
console.log("Backup preservado em src/App.jsx.backup-defesa-civil.");
console.log("Agora rode: npm run build");
