const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";

const endpoints = [
  ["Defesa Civil RS", `https://${PROJECT_REF}.supabase.co/functions/v1/defesa-civil-rs`, (d) => Array.isArray(d.alerts)],
  ["Lagoa RADAR", `https://${PROJECT_REF}.supabase.co/functions/v1/lagoa-patos-radar`, (d) => d.ok && (d.count >= 5 || (d.sensors || []).filter(s => s.ok).length >= 5)],
  ["HidroSens Laranjal", `https://${PROJECT_REF}.supabase.co/functions/v1/hidrosens-laranjal`, (d) => d.ok && typeof d.level_m === "number"],
  ["NOAA/CPC ENSO", `https://${PROJECT_REF}.supabase.co/functions/v1/noaa-enso`, (d) => d.ok && typeof d.enso?.nino34 === "number"],
  ["IRI ENSO Prob.", `https://${PROJECT_REF}.supabase.co/functions/v1/iri-enso-probabilidades`, (d) => d.ok && typeof d.prob?.elNino === "number"],
  ["CPTEC/INPE", `https://${PROJECT_REF}.supabase.co/functions/v1/cptec-inpe-produtos`, (d) => d.ok && d.available >= 4],
  ["Copernicus Health", `https://${PROJECT_REF}.supabase.co/functions/v1/copernicus-health`, (d) => d.status === "NOT_CONFIGURED" || d.status === "AUTH_OK"],
];

async function check([name, url, validate]) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    const ok = res.ok && validate(data);
    console.log(`${ok ? "✅" : "❌"} ${name}: ${data.status || data.mode || "OK"}`);
    if (name === "Copernicus Health" && data.status === "NOT_CONFIGURED") {
      console.log("   esperado por enquanto: faltam COPERNICUS_CLIENT_ID e COPERNICUS_CLIENT_SECRET");
    }
    return ok;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log("Auditoria limpa — Sentinela RS\n");
  const results = [];
  for (const ep of endpoints) results.push(await check(ep));

  console.log("\nResultado:");
  if (results.every(Boolean)) {
    console.log("✅ Fontes principais OK.");
  } else {
    console.log("❌ Há fonte com falha.");
    process.exitCode = 1;
  }
}

main();
