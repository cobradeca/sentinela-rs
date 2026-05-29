const { execFileSync } = require("node:child_process");

const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";

const endpoints = [
  ["Defesa Civil RS", `https://${PROJECT_REF}.supabase.co/functions/v1/defesa-civil-rs`, (d) => Array.isArray(d.alerts)],
  ["Lagoa RADAR", `https://${PROJECT_REF}.supabase.co/functions/v1/lagoa-patos-radar`, (d) => d.ok && (d.count >= 5 || (d.sensors || []).filter((s) => s.ok).length >= 5)],
  ["HidroSens Laranjal", `https://${PROJECT_REF}.supabase.co/functions/v1/hidrosens-laranjal`, (d) => d.ok && typeof d.level_m === "number"],
  ["NOAA/CPC ENSO", `https://${PROJECT_REF}.supabase.co/functions/v1/noaa-enso`, (d) => d.ok && typeof d.enso?.nino34 === "number"],
  ["IRI ENSO Prob.", `https://${PROJECT_REF}.supabase.co/functions/v1/iri-enso-probabilidades`, (d) => d.ok && typeof d.prob?.elNino === "number"],
  ["CPTEC/INPE", `https://${PROJECT_REF}.supabase.co/functions/v1/cptec-inpe-produtos`, (d) => d.ok && d.available >= 4],
  ["Copernicus Health", `https://${PROJECT_REF}.supabase.co/functions/v1/copernicus-health`, (d) => d.status === "NOT_CONFIGURED" || d.status === "AUTH_OK"],
];

async function fetchJsonWithFallback(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return { status: res.status, data };
  } catch (nodeError) {
    try {
      const script = `$ErrorActionPreference='Stop'; $r=Invoke-WebRequest '${url}' -UseBasicParsing -TimeoutSec 30; Write-Output $r.StatusCode; Write-Output $r.Content`;
      const output = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8", timeout: 45000 });
      const [statusLine, ...bodyLines] = output.trim().split(/\r?\n/);
      return { status: Number(statusLine), data: JSON.parse(bodyLines.join("\n")) };
    } catch (fallbackError) {
      throw new Error(`${nodeError.message}; fallback PowerShell: ${fallbackError.message}`);
    }
  }
}

async function check([name, url, validate]) {
  try {
    const { status, data } = await fetchJsonWithFallback(url);
    const ok = status >= 200 && status < 300 && validate(data);
    console.log(`${ok ? "OK" : "FALHOU"} ${name}: ${data.status || data.mode || "OK"}`);
    if (name === "Copernicus Health" && data.status === "NOT_CONFIGURED") {
      console.log("   esperado por enquanto: faltam COPERNICUS_CLIENT_ID e COPERNICUS_CLIENT_SECRET");
    }
    return ok;
  } catch (e) {
    console.log(`FALHOU ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log("Auditoria limpa - Sentinela RS\n");
  const results = [];
  for (const ep of endpoints) results.push(await check(ep));

  console.log("\nResultado:");
  if (results.every(Boolean)) {
    console.log("Fontes principais OK.");
  } else {
    console.log("Ha fonte com falha.");
    process.exitCode = 1;
  }
}

main();
