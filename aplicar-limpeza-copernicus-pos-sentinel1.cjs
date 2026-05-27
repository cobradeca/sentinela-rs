const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appPath = path.join(root, "src", "App.jsx");
const auditorPath = path.join(root, "scripts", "auditar-sitrep-hardcoded-fontes.cjs");
const healthPath = path.join(root, "supabase", "functions", "copernicus-health", "index.ts");

let changed = 0;

function backup(filePath, label) {
  const b = `${filePath}.backup-limpeza-copernicus-${Date.now()}`;
  fs.copyFileSync(filePath, b);
  console.log(`Backup ${label}: ${path.relative(root, b)}`);
}

function replaceAll(filePath, search, replacement, label) {
  let txt = fs.readFileSync(filePath, "utf8");
  if (!txt.includes(search)) {
    console.log(`AVISO: não encontrei "${label}", pulando.`);
    return false;
  }
  txt = txt.split(search).join(replacement);
  fs.writeFileSync(filePath, txt, "utf8");
  changed++;
  console.log(`OK: ${label}`);
  return true;
}

function replaceRegex(filePath, regex, replacement, label) {
  let txt = fs.readFileSync(filePath, "utf8");
  const before = txt;
  txt = txt.replace(regex, replacement);
  if (txt === before) {
    console.log(`AVISO: regex não encontrou "${label}", pulando.`);
    return false;
  }
  fs.writeFileSync(filePath, txt, "utf8");
  changed++;
  console.log(`OK: ${label}`);
  return true;
}

// 1) Atualiza a função copernicus-health para não falar que água/Sentinel-1 ainda precisam ser criados.
if (fs.existsSync(healthPath)) {
  backup(healthPath, "copernicus-health");

  replaceAll(
    healthPath,
    "Configure os Supabase Secrets para ativar APIs reais do Copernicus. Nenhuma credencial deve ir para o App.jsx.",
    "Configure os Supabase Secrets para ativar APIs reais do Copernicus. Nenhuma credencial deve ir para o App.jsx.",
    "mantém nota NOT_CONFIGURED"
  );

  replaceAll(
    healthPath,
    "Autenticação Copernicus validada. Próximo passo: criar endpoints NDVI/água/Sentinel-1 conforme o produto escolhido.",
    "Autenticação Copernicus validada. Produtos reais já ativos: Copernicus Water/Sentinel-2 e Copernicus Sentinel-1 SAR. Próximo produto opcional: NDVI/vegetação.",
    "nota AUTH_OK Copernicus atualizada"
  );

  replaceAll(
    healthPath,
    "Configure os Supabase Secrets para ativar APIs reais do Copernicus.",
    "Configure os Supabase Secrets para ativar APIs reais do Copernicus.",
    "sem alteração em NOT_CONFIGURED"
  );
} else {
  console.log("AVISO: copernicus-health/index.ts não encontrado.");
}

// 2) Atualiza o auditor para refletir produtos já ativos.
if (fs.existsSync(auditorPath)) {
  backup(auditorPath, "auditor");

  replaceAll(
    auditorPath,
    '["Copernicus Health", `https://${PROJECT_REF}.supabase.co/functions/v1/copernicus-health`, (d) => d.status === "AUTH_OK" || d.status === "NOT_CONFIGURED" || d.status === "AUTH_FAILED", "Infraestrutura: auth, não SITREP ainda"],',
    '["Copernicus Health", `https://${PROJECT_REF}.supabase.co/functions/v1/copernicus-health`, (d) => d.status === "AUTH_OK" || d.status === "NOT_CONFIGURED" || d.status === "AUTH_FAILED", "Infraestrutura: autenticação Copernicus; produtos reais ativos em endpoints separados"],',
    "descrição Copernicus Health no auditor"
  );
} else {
  console.log("AVISO: auditor não encontrado.");
}

// 3) Atualiza a aba Fontes de Dados no App.jsx.
if (fs.existsSync(appPath)) {
  backup(appPath, "App.jsx");

  replaceAll(
    appPath,
    '{ n:"Copernicus — Indicadores de referência",  st:"ATIVO PARCIAL",  c:"#eab308", d:"NDVI, SPI-3, IQA e nível do mar permanecem como referência estática; APIs reais exigem cadastro/token.", a:"Registro gratuito para APIs reais", h:"Para tempo real:\\n- NDVI: Sentinel-2 via dataspace.copernicus.eu\\n- SPI-3: CHIRPS + cálculo local\\n- IQA: QUALAR/IBAMA\\n- Nível mar: CMEMS altimetry API" },',
    '{ n:"Copernicus Water / Sentinel-2", st:"ATIVO", c:"#22c55e", d:"Indicador real de água superficial por Sentinel-2 L2A/NDWI para a Lagoa dos Patos. Contexto hidrológico por satélite; não aciona alerta sozinho.", a:"Copernicus Data Space / Sentinel Hub", h:"Endpoint: copernicus-water. Produto óptico: depende de baixa nebulosidade. Usar como contexto junto com Defesa Civil, CEMADEN, RADAR Lagoa e HidroSens." },\n              { n:"Copernicus Sentinel-1 SAR", st:"ATIVO", c:"#22c55e", d:"Indicador real SAR de água/alagamento sob nuvens/noite. Contexto remoto por radar; não é alerta oficial nem máscara validada de inundação.", a:"Copernicus Data Space / Sentinel Hub", h:"Endpoint: copernicus-sentinel1-water. Método: Sentinel-1 GRD IW/DV. Pode falhar em áreas urbanas, vegetação inundada, vento forte sobre água e sombras de relevo. Confirmar com órgãos responsáveis." },\n              { n:"Copernicus — NDVI / Vegetação", st:"PRÓXIMO OPCIONAL", c:"#eab308", d:"Ainda não operacional. Pode ser usado depois como contexto de estiagem/vegetação, separado dos alertas hidrológicos.", a:"Copernicus Data Space / Sentinel Hub", h:"Não usar placeholder. Só ativar depois de endpoint real NDVI responder com fonte, período e auditoria." },',
    "Fontes de Dados: Copernicus atualizado"
  );

  replaceAll(
    appPath,
    '{ n:"Copernicus Emergency (EU)", st:"FUTURO",    c:"#8b5cf6", d:"Sentinel-1 SAR para detecção de alagamentos.",                     a:"Registro gratuito", h:"1. dataspace.copernicus.eu → cadastro\\n2. API STAC Sentinel-1" },',
    '{ n:"Copernicus Emergency / Produtos avançados", st:"FUTURO", c:"#8b5cf6", d:"Produtos avançados oficiais/derivados para resposta a desastre. Não substituir os endpoints Sentinel-1/Water já ativos.", a:"Copernicus / serviços especializados", h:"Manter como futuro. Só integrar quando houver endpoint real, fonte, período, limitações e auditoria." },',
    "Copernicus Emergency não duplicar Sentinel-1"
  );

  replaceAll(
    appPath,
    "Produtos reais já ativos: Copernicus Water/Sentinel-2 e Copernicus Sentinel-1 SAR. Próximo produto opcional: NDVI/vegetação.",
    "Produtos reais já ativos: Copernicus Water/Sentinel-2 e Copernicus Sentinel-1 SAR. Próximo produto opcional: NDVI/vegetação.",
    "sem alteração texto produtos ativos"
  );
} else {
  console.log("ERRO: src/App.jsx não encontrado.");
  process.exit(1);
}

// 4) Validação: textos velhos não podem sobrar no App/auditor.
const validations = [
  {
    file: appPath,
    forbidden: "NDVI, SPI-3, IQA e nível do mar permanecem como referência estática; APIs reais exigem cadastro/token.",
    label: "App ainda fala que Copernicus é só referência estática",
  },
  {
    file: appPath,
    forbidden: 'Copernicus Emergency (EU)", st:"FUTURO"',
    label: "App ainda lista Sentinel-1 só como futuro",
  },
  {
    file: auditorPath,
    forbidden: "Infraestrutura: auth, não SITREP ainda",
    label: "Auditor ainda descreve Copernicus Health como etapa antiga",
  },
];

let failures = 0;
for (const v of validations) {
  if (fs.existsSync(v.file) && fs.readFileSync(v.file, "utf8").includes(v.forbidden)) {
    console.error("ERRO:", v.label);
    failures++;
  }
}

if (failures) process.exit(1);

console.log("");
console.log(`Limpeza Copernicus pós-Sentinel-1 concluída. Alterações: ${changed}`);
console.log("");
console.log("Agora rode:");
console.log("supabase functions deploy copernicus-health --no-verify-jwt");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
