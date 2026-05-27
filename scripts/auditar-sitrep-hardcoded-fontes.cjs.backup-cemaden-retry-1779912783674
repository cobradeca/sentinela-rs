const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";

const FILES_TO_SCAN = [
  "src/App.jsx",
  "supabase/functions/noaa-enso/index.ts",
  "supabase/functions/iri-enso-probabilidades/index.ts",
  "supabase/functions/cptec-inpe-produtos/index.ts",
  "supabase/functions/copernicus-health/index.ts",
  "supabase/functions/defesa-civil-rs/index.ts",
  "supabase/functions/cemaden-rs/index.ts",
  "supabase/functions/lagoa-patos-radar/index.ts",
  "supabase/functions/hidrosens-laranjal/index.ts",
  "supabase/functions/ana-rs/index.ts",
].filter((rel) => fs.existsSync(path.join(ROOT, rel)));

const CRITICAL_PATTERNS = [
  { id:"enso_static_object", pattern:/const\s+ENSO\s*=\s*\{/g, msg:"Objeto ENSO fixo no App.jsx. Deve virar fallback não-operacional ou ser removido da leitura principal." },
  { id:"nino34_hardcoded_09", pattern:/nino34\s*:\s*\+?0\.9|Niño 3\.4:\s*\+0,9|Niño 3\.4:\s*\+0\.9/gi, msg:"Niño 3.4 hardcoded +0,9. Deve vir do endpoint NOAA/CPC." },
  { id:"el_nino_developing_static", pattern:/EL_NINO_DEVELOPING|EL NIÑO EM (DESENVOLVIMENTO|EMERGINDO)|El Niño em Desenvolvimento|El Niño Emergindo/gi, msg:"Status El Niño fixo. Deve ser derivado de NOAA/CPC observado + IRI probabilístico." },
  { id:"static_data_label", pattern:/dados estáticos|Dados estáticos|atualização manual necessária|atualizacao manual necessaria/gi, msg:"Texto de dado estático/manual. Não pode aparecer como SITREP." },
  { id:"probability_static_98", pattern:/98%\s*(de prob|prob)|prob\.\s*mai|elNino:\s*0\.98/gi, msg:"Probabilidade fixa de El Niño. Deve vir do endpoint IRI/CCSR." },
  { id:"impact_static_2026_27", pattern:/Chuvas\s+30.?50%|Inundações costeiras|Risco de queimadas no verão|Ondas de calor intensas|Risco de enchentes e queimadas elevado/gi, msg:"Impacto esperado fixo. Deve ser contexto rotulado ou substituído por fonte oficial com timestamp." },
  { id:"copernicus_static_operational", pattern:/const\s+COPERNICUS_DATA\s*=\s*\{|Copernicus.*não atualizados em tempo real|Indicadores abaixo são dados de referência/gi, msg:"Copernicus fixo/de referência. Deve ficar fora de SITREP até AUTH_OK e produto real." },
  { id:"placeholder_terms", pattern:/TODO|FIXME|PLACEHOLDER|mock|dummy|lorem|SEU_CLIENT_ID|SEU_CLIENT_SECRET|valor_real/gi, msg:"Placeholder ou termo de desenvolvimento encontrado." },
];

const ACCEPTABLE_PATTERNS = [
  { id:"fallback_cache", pattern:/fallback|localStorage|última leitura válida|ultima leitura valida/gi, msg:"Fallback/cache permitido, desde que rotulado e sem disparar alerta vencido." },
  { id:"manual_threshold", pattern:/threshold_m|critical_threshold_m|max_may_2024|limiar|Parâmetro adotado|parametro adotado/gi, msg:"Parâmetro/limiar operacional permitido se exibido como adotado/validado." },
  { id:"station_registry", pattern:/STATIONS_LAGOA|STATIONS_CIDADES|APAS_RS/gi, msg:"Cadastro territorial fixo permitido." },
];

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function scanFile(rel) {
  const full = path.join(ROOT, rel);
  const text = fs.readFileSync(full, "utf8");
  const issues = [];
  const accepted = [];

  for (const p of CRITICAL_PATTERNS) {
    for (const m of text.matchAll(p.pattern)) {
      issues.push({ file: rel, line: lineOf(text, m.index || 0), id:p.id, msg:p.msg, match: String(m[0]).slice(0, 120) });
    }
  }

  for (const p of ACCEPTABLE_PATTERNS) {
    for (const m of text.matchAll(p.pattern)) {
      accepted.push({ file: rel, line: lineOf(text, m.index || 0), id:p.id, msg:p.msg, match: String(m[0]).slice(0, 80) });
    }
  }

  return { issues, accepted };
}

const endpoints = [
  ["Defesa Civil RS", `https://${PROJECT_REF}.supabase.co/functions/v1/defesa-civil-rs`, (d) => Array.isArray(d.alerts), "SITREP real: alertas oficiais vigentes"],
  ["CEMADEN RS", `https://${PROJECT_REF}.supabase.co/functions/v1/cemaden-rs`, (d) => d && typeof d === "object", "SITREP real: chuva observada"],
  ["Lagoa RADAR", `https://${PROJECT_REF}.supabase.co/functions/v1/lagoa-patos-radar`, (d) => d.ok && Array.isArray(d.sensors), "SITREP real: níveis RADAR Lagoa"],
  ["HidroSens Laranjal", `https://${PROJECT_REF}.supabase.co/functions/v1/hidrosens-laranjal`, (d) => d.ok && typeof d.level_m === "number", "SITREP real: nível Laranjal"],
  ["NOAA/CPC ENSO", `https://${PROJECT_REF}.supabase.co/functions/v1/noaa-enso`, (d) => d.ok && (typeof d.enso?.nino34 === "number" || typeof d.nino34 === "number"), "SITREP real: índice observado"],
  ["IRI/CCSR ENSO", `https://${PROJECT_REF}.supabase.co/functions/v1/iri-enso-probabilidades`, (d) => d.ok && (d.prob || d.forecast || d.probabilities), "SITREP real: previsão probabilística"],
  ["CPTEC/INPE", `https://${PROJECT_REF}.supabase.co/functions/v1/cptec-inpe-produtos`, (d) => d.ok && (Array.isArray(d.products) || typeof d.available === "number"), "Contexto oficial: produtos gráficos"],
  ["Copernicus Health", `https://${PROJECT_REF}.supabase.co/functions/v1/copernicus-health`, (d) => d.status === "AUTH_OK" || d.status === "NOT_CONFIGURED" || d.status === "AUTH_FAILED", "Infraestrutura: auth, não SITREP ainda"],
  ["ANA HidroWeb", `https://${PROJECT_REF}.supabase.co/functions/v1/ana-rs`, (d) => typeof d === "object", "Complementar: pode estar sem leitura validada"],
];

async function checkEndpoint([name, url, validate, role]) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
    const latency = Date.now() - t0;
    const ok = res.ok && validate(data);
    return {
      name, ok, http: res.status, latency_ms: latency, role,
      status: data.status || data.mode || data.source || null,
      note: data.note || data.error || data.message || null,
    };
  } catch (e) {
    return { name, ok:false, http:null, latency_ms: Date.now()-t0, role, error:e.message };
  }
}

async function main() {
  console.log("SENTINELA·RS — Auditoria SITREP / Hardcoded / Fontes\n");

  let allIssues = [];
  let allAccepted = [];

  for (const rel of FILES_TO_SCAN) {
    const { issues, accepted } = scanFile(rel);
    allIssues.push(...issues);
    allAccepted.push(...accepted);
  }

  console.log("=== HARDcoded / placeholders críticos ===");
  if (!allIssues.length) {
    console.log("✅ Nenhum padrão crítico encontrado.");
  } else {
    for (const i of allIssues) {
      console.log(`❌ ${i.file}:${i.line} [${i.id}] ${i.match}`);
      console.log(`   ${i.msg}`);
    }
  }

  console.log("\n=== Hardcoded aceitável se rotulado ===");
  const sampleAccepted = allAccepted.slice(0, 30);
  if (!sampleAccepted.length) console.log("Nenhum padrão aceitável encontrado.");
  for (const a of sampleAccepted) {
    console.log(`ℹ️  ${a.file}:${a.line} [${a.id}] ${a.match}`);
  }
  if (allAccepted.length > sampleAccepted.length) {
    console.log(`... +${allAccepted.length - sampleAccepted.length} ocorrências aceitáveis omitidas.`);
  }

  console.log("\n=== Fontes reais / performance ===");
  const results = [];
  for (const ep of endpoints) results.push(await checkEndpoint(ep));

  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`${icon} ${r.name} · HTTP ${r.http ?? "-"} · ${r.latency_ms}ms · ${r.status || ""}`);
    console.log(`   ${r.role}${r.note ? " · " + r.note : ""}${r.error ? " · " + r.error : ""}`);
  }

  const criticalSourceFailures = results.filter(r => !r.ok && !["ANA HidroWeb", "Copernicus Health"].includes(r.name));
  console.log("\n=== Resultado ===");
  if (allIssues.length) console.log(`❌ ${allIssues.length} ocorrência(s) crítica(s) de hardcoded/placeholder.`);
  else console.log("✅ Sem hardcoded crítico detectado.");

  if (criticalSourceFailures.length) console.log(`❌ ${criticalSourceFailures.length} fonte(s) principal(is) com falha.`);
  else console.log("✅ Fontes principais respondendo.");

  if (allIssues.length || criticalSourceFailures.length) process.exitCode = 1;
}

main();
