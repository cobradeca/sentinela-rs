const fs = require("fs");

function loadEnv() {
  if (!fs.existsSync(".env")) return;

  const lines = fs.readFileSync(".env", "utf8").split(/\r?\n/);

  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;

    const index = clean.indexOf("=");
    if (index === -1) continue;

    const key = clean.slice(0, index).trim();
    const value = clean.slice(index + 1).trim();

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnv();

  const token = process.env.CEMADEN_PED_TOKEN;

  if (!token) {
    console.error("ERRO: CEMADEN_PED_TOKEN não encontrado no .env.");
    process.exit(1);
  }

  const tests = [
    ["Porto Alegre", "4314902"],
    ["Rio Grande", "4315602"],
    ["Pelotas", "4314407"],
  ];

  for (const [city, codibge] of tests) {
    const url = `https://sws.cemaden.gov.br/PED/rest/pcds-acum/acumulados-recentes?codibge=${codibge}&formato=JSON`;

    const response = await fetch(url, {
      headers: {
        token,
        accept: "application/json",
      },
    });

    const text = await response.text();

    console.log("\n---", city, codibge, "---");
    console.log("STATUS:", response.status);

    try {
      const json = JSON.parse(text);
      console.log("REGISTROS:", Array.isArray(json) ? json.length : "não-array");
      console.log(JSON.stringify(Array.isArray(json) ? json.slice(0, 2) : json, null, 2).slice(0, 1500));
    } catch {
      console.log(text.slice(0, 1500));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
