const fs = require("fs");
const path = require("path");

const auditorPath = path.join(process.cwd(), "scripts", "auditar-sitrep-hardcoded-fontes.cjs");

if (!fs.existsSync(auditorPath)) {
  console.error("ERRO: não encontrei scripts/auditar-sitrep-hardcoded-fontes.cjs");
  process.exit(1);
}

let src = fs.readFileSync(auditorPath, "utf8");
const backup = path.join(process.cwd(), "scripts", `auditar-sitrep-hardcoded-fontes.cjs.backup-cemaden-retry-${Date.now()}`);
fs.writeFileSync(backup, src, "utf8");

// Aumenta timeout padrão dos endpoints para 30s.
src = src.replaceAll("AbortSignal.timeout(20000)", "AbortSignal.timeout(timeoutMs || 30000)");

// Troca definição do CEMADEN para incluir retry explícito.
src = src.replace(
  `["CEMADEN RS", \`https://\${PROJECT_REF}.supabase.co/functions/v1/cemaden-rs\`, (d) => d && typeof d === "object", "SITREP real: chuva observada"],`,
  `["CEMADEN RS", \`https://\${PROJECT_REF}.supabase.co/functions/v1/cemaden-rs\`, (d) => d && typeof d === "object", "SITREP real: chuva observada", 3],`
);

// Troca assinatura do checkEndpoint para aceitar retries.
src = src.replace(
  `async function checkEndpoint([name, url, validate, role]) {`,
  `async function checkEndpoint([name, url, validate, role, retries = 1]) {`
);

// Troca função checkEndpoint por versão com tentativas.
const oldFnStart = src.indexOf("async function checkEndpoint([name, url, validate, role, retries = 1]) {");
const oldFnEnd = src.indexOf("\nasync function main()", oldFnStart);
if (oldFnStart < 0 || oldFnEnd < 0) {
  console.error("ERRO: não consegui localizar checkEndpoint.");
  process.exit(1);
}

const newFn = `async function checkEndpoint([name, url, validate, role, retries = 1]) {
  let last = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(name === "CEMADEN RS" ? 30000 : 20000) });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
      const latency = Date.now() - t0;
      const ok = res.ok && validate(data);

      last = {
        name, ok, http: res.status, latency_ms: latency, role,
        attempt,
        retries,
        status: data.status || data.mode || data.source || null,
        note: data.note || data.error || data.message || null,
      };

      if (ok) return last;
    } catch (e) {
      last = {
        name,
        ok: false,
        http: null,
        latency_ms: Date.now() - t0,
        role,
        attempt,
        retries,
        error: e.message,
      };
    }

    if (attempt < retries) {
      console.log(\`↻ \${name}: tentativa \${attempt} falhou, tentando novamente...\`);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  return last;
}
`;

src = src.slice(0, oldFnStart) + newFn + src.slice(oldFnEnd);

// Mostra tentativa quando houver retry.
src = src.replace(
  'console.log(`${icon} ${r.name} · HTTP ${r.http ?? "-"} · ${r.latency_ms}ms · ${r.status || ""}`);',
  'console.log(`${icon} ${r.name} · HTTP ${r.http ?? "-"} · ${r.latency_ms}ms${r.retries > 1 ? ` · tentativa ${r.attempt}/${r.retries}` : ""} · ${r.status || ""}`);'
);

fs.writeFileSync(auditorPath, src, "utf8");

console.log("Auditor atualizado: CEMADEN agora tem retry 3x e timeout 30s.");
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
