const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";

async function main() {
  const url = `https://${PROJECT_REF}.supabase.co/functions/v1/noaa-enso`;
  const res = await fetch(url);
  const data = await res.json();

  console.log(JSON.stringify(data, null, 2));

  if (!res.ok || !data.ok) {
    console.error("NOAA ENSO falhou.");
    process.exit(1);
  }

  if (typeof data.enso?.nino34 !== "number") {
    console.error("nino34 não veio numérico.");
    process.exit(1);
  }

  if (typeof data.enso?.oni3m !== "number") {
    console.error("oni3m não veio numérico.");
    process.exit(1);
  }

  console.log("\nOK: NOAA/CPC ENSO observado ativo.");
}

main();
