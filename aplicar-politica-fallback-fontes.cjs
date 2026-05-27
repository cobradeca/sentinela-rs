const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-politica-fallback-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

let changes = 0;

function replaceAllExact(search, replacement, label) {
  if (!app.includes(search)) {
    console.log(`AVISO: trecho não encontrado, pulando: ${label}`);
    return;
  }
  app = app.split(search).join(replacement);
  changes++;
  console.log(`OK: ${label}`);
}

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) {
    console.error(`ERRO: trecho não encontrado: ${label}`);
    process.exit(1);
  }
  app = app.replace(search, replacement);
  changes++;
  console.log(`OK: ${label}`);
}

function insertAfter(search, insert, label) {
  if (!app.includes(search)) {
    console.error(`ERRO: âncora não encontrada: ${label}`);
    process.exit(1);
  }
  if (app.includes(insert.trim().slice(0, 80))) {
    console.log(`OK: já existia: ${label}`);
    return;
  }
  app = app.replace(search, search + insert);
  changes++;
  console.log(`OK: ${label}`);
}

// 1) Helpers de órgão responsável e aviso de fallback.
if (!app.includes("function getResponsibleAgencyText")) {
  insertAfter(
`function getLagoaSourceText(lagoa) {
  if (!lagoa?.isReal) return "Sem leitura";
  const suffix = lagoa?.isFallback ? " · última salva" : "";
  if (lagoa?.hidrosens) return "HidroSens/UFPel" + suffix;
  if (lagoa?.radar) return "RADAR Lagoa dos Patos" + suffix;
  if (lagoa?.anaLevel !== null && lagoa?.anaLevel !== undefined) return "ANA HidroWeb";
  return "Fonte validada" + suffix;
}
`,
`
function getResponsibleAgencyText(source) {
  const text = String(source || "").toUpperCase();
  if (text.includes("HIDROSENS")) return "HidroSens/UFPel";
  if (text.includes("RADAR")) return "Rede RADAR Lagoa dos Patos";
  if (text.includes("ANA")) return "ANA HidroWeb";
  if (text.includes("CEMADEN")) return "CEMADEN/MCTI";
  if (text.includes("INMET")) return "INMET";
  if (text.includes("DEFESA")) return "Defesa Civil RS";
  if (text.includes("COPERNICUS")) return "Copernicus Data Space / Sentinel Hub";
  if (text.includes("NOAA") || text.includes("IRI")) return "NOAA/CPC ou IRI/CCSR";
  return "órgão responsável pela fonte";
}

function getFallbackWarningText(source, ageMinutes = null) {
  const ageText = typeof ageMinutes === "number" ? \` há \${ageMinutes} min\` : "";
  return \`Fonte primária indisponível. Exibindo última leitura válida salva\${ageText}. Verifique a informação junto ao órgão responsável: \${getResponsibleAgencyText(source)}.\`;
}
`,
"helpers de política de fallback"
  );
}

// 2) Fallback na Lagoa: texto explícito com órgão responsável.
replaceAllExact(
`fallback local · última leitura salva{lagoa.fallback_age_minutes ? \` há \${lagoa.fallback_age_minutes} min\` : ""}`,
`{getFallbackWarningText(sourceText, lagoa.fallback_age_minutes)}`,
"texto de fallback no card da Lagoa"
);

// 3) Se houver explicação de fallback no modal da Lagoa, torna explícita.
replaceAllExact(
`Leitura de fallback/localStorage. Não deve gerar novo alerta automático se estiver vencida.`,
`Fonte primária indisponível. Esta é a última leitura válida salva. Verifique a informação junto ao órgão responsável pela fonte antes de qualquer decisão operacional. Fallback vencido não dispara novo alerta automático.`,
"texto de fallback no modal explicativo"
);

// 4) Marca ANA como aguardando credencial oficial na lista de fontes.
replaceAllExact(
`{ n:"ANA HidroWeb (Telemetria)", st:"ATIVO",     c:"#22c55e", d:"Nível real da Lagoa dos Patos em 4 pontos. Exibe '–' quando indisponível — sem simulação.",  a:"API pública, sem chave", h:null },`,
`{ n:"ANA HidroWeb (Telemetria)", st:"AGUARDANDO CREDENCIAL", c:"#eab308", d:"Uso atual: complementar/histórico. Integração operacional automatizada depende do acesso oficial à API solicitado à ANA. Não aciona alerta automático.", a:"Aguardando credencial oficial", h:"Solicitação enviada para telemetria@ana.gov.br. Até a liberação, a ANA permanece como fonte complementar; dados manuais/CSV não entram como leitura operacional." },`,
"ANA aguardando credencial"
);

// 5) Atualiza RADAR e HidroSens para explicitar política de fallback.
replaceAllExact(
`Endpoint: lagoa-patos-radar. Fallback local 6h ativado automaticamente.`,
`Endpoint: lagoa-patos-radar. Fallback local só entra após falha da fonte primária real, exibido como última leitura salva, com orientação de verificar junto à Rede RADAR Lagoa dos Patos. Fallback vencido não dispara novo alerta automático.`,
"política fallback RADAR"
);

replaceAllExact(
`Endpoint: hidrosens-laranjal. Altura do sensor: 5,06m. Fallback local 6h.`,
`Endpoint: hidrosens-laranjal. Altura do sensor: 5,06m. Fallback local só entra após falha da fonte primária real, exibido como última leitura salva, com orientação de verificar junto ao HidroSens/UFPel. Fallback vencido não dispara novo alerta automático.`,
"política fallback HidroSens"
);

// 6) Adiciona card de política na aba Fontes de Dados.
if (!app.includes("POLÍTICA OPERACIONAL — FONTE REAL E FALLBACK")) {
  replaceOnce(
`            {/* BLOCO D — Saúde das fontes em tempo real */}`,
`            <div style={{ ...s.card, border:"1px solid rgba(34,211,238,0.35)" }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:8 }}>POLÍTICA OPERACIONAL — FONTE REAL E FALLBACK</div>
              <div style={{ display:"grid", gap:6, fontSize:10, color:t.textMuted, lineHeight:1.55 }}>
                <div>✅ Dado operacional só é exibido como atual quando vem de endpoint real ativo, com fonte e horário.</div>
                <div>⚠️ Fallback só é permitido quando já existe endpoint real configurado e a fonte primária falha.</div>
                <div>📌 Quando fallback aparecer, o card deve informar que é última leitura válida salva e orientar verificação junto ao órgão responsável.</div>
                <div>🚫 Fallback vencido, CSV manual, referência histórica e dado complementar não disparam novo alerta automático.</div>
              </div>
            </div>

            {/* BLOCO D — Saúde das fontes em tempo real */}`,
"card política operacional em Fontes de Dados"
  );
}

// 7) Atualiza descrições estáticas que poderiam sugerir API real onde ainda não está operacional.
replaceAllExact(
`SENTINELA·RS v2.2 · Open-Meteo + INMET + CEMADEN + Lagoa RADAR + HidroSens + ANA HidroWeb + NOAA ENSO + INPE + Copernicus · Fonte CEMADEN: {CEMADEN_ATTRIBUTION}`,
`SENTINELA·RS v2.2 · Open-Meteo + INMET + CEMADEN + Lagoa RADAR + HidroSens + ANA complementar/aguardando API + NOAA ENSO + INPE + Copernicus · Fonte CEMADEN: {CEMADEN_ATTRIBUTION}`,
"rodapé ANA complementar"
);

// 8) Validação: não pode ficar "ANA HidroWeb (Telemetria) ATIVO" nem fallback genérico antigo.
const forbidden = [
  `Endpoint: hidrosens-laranjal. Altura do sensor: 5,06m. Fallback local 6h.`,
  `Endpoint: lagoa-patos-radar. Fallback local 6h ativado automaticamente.`,
  `ANA HidroWeb (Telemetria)", st:"ATIVO"`,
];

const foundForbidden = forbidden.filter((needle) => app.includes(needle));
if (foundForbidden.length) {
  console.error("ERRO: restaram trechos proibidos:");
  for (const item of foundForbidden) console.error(" - " + item);
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log(`Política de fallback aplicada. Alterações: ${changes}`);
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
