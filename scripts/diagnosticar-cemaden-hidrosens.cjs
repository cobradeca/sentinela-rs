const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";
const outDir = path.join(process.cwd(), "diagnostico-fontes");
fs.mkdirSync(outDir, { recursive: true });

const checks = [
  ["cemaden-rs", `https://${PROJECT_REF}.supabase.co/functions/v1/cemaden-rs`, 45000],
  ["hidrosens-laranjal", `https://${PROJECT_REF}.supabase.co/functions/v1/hidrosens-laranjal`, 45000],
];

async function runOne([name, url, timeoutMs]) {
  const started = Date.now();
  try {
    let status = null;
    let text = "";
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      status = res.status;
      text = await res.text();
    } catch (fetchError) {
      // Em alguns ambientes Windows, o fetch do Node falha enquanto o PowerShell acessa HTTPS normalmente.
      const ps = [
        "-NoProfile",
        "-Command",
        `$r=Invoke-WebRequest '${url}' -UseBasicParsing -TimeoutSec ${Math.ceil(timeoutMs / 1000)}; Write-Output $r.StatusCode; Write-Output $r.Content`,
      ];
      const out = execFileSync("powershell.exe", ps, { encoding: "utf8", timeout: timeoutMs + 5000 });
      const firstBreak = out.indexOf("\n");
      status = Number(out.slice(0, firstBreak).trim());
      text = out.slice(firstBreak + 1).trim();
    }
    const ms = Date.now() - started;

    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, text, "utf8");

    let data = null;
    try { data = JSON.parse(text); } catch {}

    console.log(`\n=== ${name} ===`);
    console.log(`HTTP: ${status}`);
    console.log(`Tempo: ${ms}ms`);
    console.log(`Arquivo: ${path.relative(process.cwd(), file)}`);

    if (data) {
      console.log(`ok: ${data.ok}`);
      console.log(`status/mode/source: ${data.status || data.mode || data.source || "-"}`);
      console.log(`error/note: ${data.error || data.note || "-"}`);
      if (data.raw) console.log(`raw: ${JSON.stringify(data.raw).slice(0, 500)}`);
      if (data.raw_payload) console.log(`raw_payload: ${String(data.raw_payload).slice(0, 500)}`);
      if (data.level_m !== undefined) console.log(`level_m: ${data.level_m}`);
      if (data.cities) console.log(`cities: ${data.cities.length}`);
    } else {
      console.log(text.slice(0, 500));
    }

    return status >= 200 && status < 300;
  } catch (e) {
    const ms = Date.now() - started;
    console.log(`\n=== ${name} ===`);
    console.log(`FALHA após ${ms}ms: ${e.message}`);
    return false;
  }
}

(async () => {
  console.log("Diagnóstico isolado — CEMADEN + HidroSens");
  for (const check of checks) await runOne(check);
})();
