const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";

async function main() {
  const url = `https://${PROJECT_REF}.supabase.co/functions/v1/iri-enso-probabilidades`;
  const res = await fetch(url);
  const data = await res.json();

  console.log(JSON.stringify(data, null, 2));

  if (!res.ok || !data.ok) {
    console.error("IRI ENSO probabilidades falhou.");
    process.exit(1);
  }

  if (!data.prob || typeof data.prob.elNino !== "number") {
    console.error("prob.elNino não veio numérico.");
    process.exit(1);
  }

  if (!Array.isArray(data.forecast) || data.forecast.length < 8) {
    console.error("forecast[] veio ausente ou curto.");
    process.exit(1);
  }

  console.log("\nOK: IRI ENSO probabilidades ativo.");
}

main();
