const fs = require("fs");
const path = require("path");

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
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    const ms = Date.now() - started;

    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, text, "utf8");

    let data = null;
    try { data = JSON.parse(text); } catch {}

    console.log(`\n=== ${name} ===`);
    console.log(`HTTP: ${res.status}`);
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

    return res.ok;
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
