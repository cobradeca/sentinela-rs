const fs = require("fs");

const ANA_URL =
  "https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos";

const candidatos = [
  { regiao: "Rio Grande / Regatas", codigo: "87980000" },
  { regiao: "Pelotas / Laranjal", codigo: "87955000" },
  { regiao: "Arambaré", codigo: "87540000" },
  { regiao: "São Lourenço do Sul", codigo: "87921000" },
  { regiao: "Sul POA / Guaíba", codigo: "87450004" },
];

const periodos = [
  { nome: "3 dias", inicio: "24/05/2026", fim: "26/05/2026" },
  { nome: "maio 2026", inicio: "01/05/2026", fim: "26/05/2026" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extrairTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : null;
}

function extrairRegistros(xml) {
  const blocos = xml.match(
    /<DadosHidrometereologicos[\s\S]*?<\/DadosHidrometereologicos>/gi
  ) || [];

  return blocos
    .map((bloco) => {
      const codEstacao = extrairTag(bloco, "CodEstacao");
      const dataHora = extrairTag(bloco, "DataHora");
      const nivel = extrairTag(bloco, "Nivel");
      const chuva = extrairTag(bloco, "Chuva");

      const nivelCm = nivel ? Number(nivel) : null;

      return {
        codEstacao,
        dataHora,
        nivel_cm: Number.isFinite(nivelCm) ? nivelCm : null,
        nivel_m: Number.isFinite(nivelCm) ? nivelCm / 100 : null,
        chuva,
      };
    })
    .filter((r) => r.dataHora && r.nivel_m !== null);
}

async function testar(candidato, periodo) {
  const url =
    `${ANA_URL}?codEstacao=${encodeURIComponent(candidato.codigo)}` +
    `&DataInicio=${encodeURIComponent(periodo.inicio)}` +
    `&DataFim=${encodeURIComponent(periodo.fim)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();

    const erroXml = extrairTag(text, "Error");
    const registros = extrairRegistros(text);
    const ultimo = registros[0] || null;

    if (registros.length > 0) {
      return {
        regiao: candidato.regiao,
        codigo: candidato.codigo,
        periodo: periodo.nome,
        status: "VALIDA_COM_NIVEL",
        quantidade: registros.length,
        ultimo,
      };
    }

    if (erroXml) {
      return {
        regiao: candidato.regiao,
        codigo: candidato.codigo,
        periodo: periodo.nome,
        status: "SEM_DADOS_NO_PERIODO",
        erro: erroXml,
      };
    }

    if (text.includes("Execution Timeout Expired")) {
      return {
        regiao: candidato.regiao,
        codigo: candidato.codigo,
        periodo: periodo.nome,
        status: "TIMEOUT_ANA",
      };
    }

    return {
      regiao: candidato.regiao,
      codigo: candidato.codigo,
      periodo: periodo.nome,
      status: "SEM_NIVEL_IDENTIFICADO",
      amostra: text.slice(0, 300),
    };
  } catch (e) {
    return {
      regiao: candidato.regiao,
      codigo: candidato.codigo,
      periodo: periodo.nome,
      status: e.name === "AbortError" ? "TIMEOUT_LOCAL" : "ERRO",
      erro: e.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const resultados = [];

  for (const candidato of candidatos) {
    for (const periodo of periodos) {
      console.log(`Testando ${candidato.regiao} ${candidato.codigo} — ${periodo.nome}`);

      const r = await testar(candidato, periodo);
      resultados.push(r);

      console.log(r.status, r.ultimo ? r.ultimo : r.erro || "");
      await sleep(1500);
    }
  }

  fs.writeFileSync(
    "ana-lagoa-resultados.json",
    JSON.stringify(resultados, null, 2),
    "utf8"
  );

  console.log("\nResultado salvo em ana-lagoa-resultados.json\n");

  const validas = resultados.filter((r) => r.status === "VALIDA_COM_NIVEL");

  console.table(
    resultados.map((r) => ({
      regiao: r.regiao,
      codigo: r.codigo,
      periodo: r.periodo,
      status: r.status,
      nivel_m: r.ultimo?.nivel_m ?? "",
      dataHora: r.ultimo?.dataHora ?? "",
    }))
  );

  console.log("\nEstações válidas com nível:");
  console.table(
    validas.map((r) => ({
      regiao: r.regiao,
      codigo: r.codigo,
      periodo: r.periodo,
      nivel_m: r.ultimo?.nivel_m,
      dataHora: r.ultimo?.dataHora,
    }))
  );
}

main();