const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";

async function main() {
  const url = `https://${PROJECT_REF}.supabase.co/functions/v1/copernicus-health`;
  const res = await fetch(url);
  const data = await res.json();

  console.log(JSON.stringify(data, null, 2));

  if (!res.ok) {
    console.error("copernicus-health retornou HTTP inválido.");
    process.exit(1);
  }

  if (data.status === "NOT_CONFIGURED") {
    console.log("\nOK: função implantada. Próximo passo é configurar secrets.");
    process.exit(0);
  }

  if (data.status === "AUTH_OK") {
    console.log("\nOK: autenticação Copernicus validada.");
    process.exit(0);
  }

  console.log("\nFunção respondeu, mas autenticação ainda não está OK.");
  process.exit(0);
}

main();
