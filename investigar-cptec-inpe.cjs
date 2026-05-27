const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(process.cwd(), "cptec-inpe-investigacao");
fs.mkdirSync(OUT_DIR, { recursive: true });

const TARGETS = [
  "https://www.cptec.inpe.br/",
  "https://www.cptec.inpe.br/previsao-tempo",
  "https://www.cptec.inpe.br/previsao-climatica",
  "https://www.cptec.inpe.br/boletim",
  "https://www.gov.br/inpe/pt-br",
  "https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias",
  "https://www.gov.br/inpe/pt-br/assuntos/previsao-climatica",
  "https://tempo.cptec.inpe.br/",
  "https://previsaonumerica.cptec.inpe.br/",
  "https://clima1.cptec.inpe.br/",
  "https://clima.cptec.inpe.br/",
];

const PROBES = [
  "https://www.cptec.inpe.br/api",
  "https://tempo.cptec.inpe.br/api",
  "https://previsaonumerica.cptec.inpe.br/api",
  "https://clima1.cptec.inpe.br/api",
  "https://clima.cptec.inpe.br/api",
  "https://www.cptec.inpe.br/rss",
  "https://tempo.cptec.inpe.br/rss",
  "https://www.cptec.inpe.br/xml",
];

const TERMS = [
  "api", "json", "rss", "xml", "boletim", "sazonal", "clima", "climática",
  "previsao", "previsão", "enso", "el niño", "el nino", "la niña", "la nina",
  "inmet", "cptec", "inpe", "iframe", "script", "src=", "href=", ".js", ".json", ".xml", ".pdf"
];

function safeName(url) {
  return url.replace(/^https?:\/\//, "").replace(/[^\w.-]+/g, "_").slice(0, 120);
}

function pickInterestingLines(text) {
  const lines = text.split(/\r?\n/);
  const found = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const lower = line.toLowerCase();

    if (!line) continue;
    if (TERMS.some((term) => lower.includes(term.toLowerCase()))) {
      found.push({
        line: i + 1,
        text: line.slice(0, 500),
      });
    }
  }

  return found.slice(0, 120);
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  const patterns = [
    /href=["']([^"']+)["']/gi,
    /src=["']([^"']+)["']/gi,
    /url\(["']?([^"')]+)["']?\)/gi,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(html))) {
      const href = m[1];
      if (!href || href.startsWith("data:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

      try {
        const u = new URL(href, baseUrl).toString();
        if (
          /cptec|inpe|gov\.br|\.json|\.xml|\.rss|api|boletim|clima|previs/i.test(u)
        ) {
          links.add(u);
        }
      } catch {}
    }
  }

  return [...links].slice(0, 200);
}

async function fetchAny(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SentinelaRS-Investigator/1.0",
        "Accept": "text/html,application/json,application/xml,text/xml,text/plain,*/*",
      },
      redirect: "follow",
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    return {
      url,
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      contentType,
      text,
      error: null,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      finalUrl: null,
      contentType: null,
      text: "",
      error: error?.message || String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log("Investigando CPTEC/INPE...");
  console.log(`Saída: ${OUT_DIR}`);

  const results = [];
  const candidateLinks = new Set();

  for (const url of TARGETS) {
    console.log(`\nBaixando: ${url}`);
    const r = await fetchAny(url);
    const name = safeName(url);
    const file = path.join(OUT_DIR, `${name}.txt`);

    fs.writeFileSync(file, r.text || JSON.stringify(r, null, 2), "utf8");

    const interesting = pickInterestingLines(r.text || "");
    const links = extractLinks(r.text || "", r.finalUrl || url);
    links.forEach((l) => candidateLinks.add(l));

    results.push({
      url,
      ok: r.ok,
      status: r.status,
      finalUrl: r.finalUrl,
      contentType: r.contentType,
      savedAs: path.relative(process.cwd(), file),
      interestingLines: interesting,
      links,
    });

    console.log(`Status: ${r.status} · ${r.contentType}`);
    console.log(`Linhas interessantes: ${interesting.length}`);
    console.log(`Links candidatos: ${links.length}`);
  }

  console.log("\nTestando probes diretos...");
  for (const url of PROBES) {
    const r = await fetchAny(url);
    results.push({
      url,
      ok: r.ok,
      status: r.status,
      finalUrl: r.finalUrl,
      contentType: r.contentType,
      probe: true,
      sample: (r.text || "").slice(0, 500),
      error: r.error,
    });
    console.log(`${r.status || "ERR"} ${url} ${r.error ? "— " + r.error : ""}`);
  }

  const candidates = [...candidateLinks]
    .filter((u) => /\.(json|xml|rss|pdf)(\?|$)|api|boletim|sazonal|clima|previs|enso/i.test(u))
    .slice(0, 80);

  const report = {
    generated_at: new Date().toISOString(),
    objective: "Encontrar endpoint público estável CPTEC/INPE para previsão climática/boletins/ENSO.",
    targets: TARGETS,
    probes: PROBES,
    candidates,
    results,
    conclusion: "Revise candidates[] e linhas interessantes. Só marcar CPTEC/INPE como ATIVO se algum candidato retornar JSON/XML/PDF oficial atualizável.",
  };

  const reportPath = path.join(OUT_DIR, "relatorio-cptec-inpe.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  const txtPath = path.join(OUT_DIR, "resumo-cptec-inpe.txt");
  const txt = [
    "INVESTIGAÇÃO CPTEC/INPE",
    `Gerado em: ${report.generated_at}`,
    "",
    "CANDIDATOS:",
    ...candidates.map((c, i) => `${i + 1}. ${c}`),
    "",
    "PROBES:",
    ...results.filter(r => r.probe).map(r => `${r.status || "ERR"} ${r.url} ${r.contentType || ""} ${r.error || ""}`),
    "",
    "ARQUIVOS:",
    ...results.filter(r => r.savedAs).map(r => `- ${r.savedAs}`),
    "",
    "Próximo passo: cole aqui os candidatos relevantes ou o relatorio-cptec-inpe.json.",
  ].join("\n");

  fs.writeFileSync(txtPath, txt, "utf8");

  console.log("\nResumo salvo em:");
  console.log(path.relative(process.cwd(), txtPath));
  console.log(path.relative(process.cwd(), reportPath));

  console.log("\nCandidatos principais:");
  for (const c of candidates.slice(0, 30)) console.log("- " + c);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
