const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";

async function main() {
  const url = `https://${PROJECT_REF}.supabase.co/functions/v1/cptec-inpe-produtos`;
  const res = await fetch(url);
  const data = await res.json();

  console.log(JSON.stringify({
    ok: data.ok,
    source: data.source,
    mode: data.mode,
    available: data.available,
    total: data.total,
    fetched_at: data.fetched_at,
    products: (data.products || []).map((p) => ({
      id: p.id,
      ok: p.ok,
      status: p.status,
      contentType: p.contentType,
      title: p.title,
      url: p.url,
    })),
  }, null, 2));

  if (!res.ok || !data.ok) {
    console.error("CPTEC/INPE produtos falhou.");
    process.exit(1);
  }

  if (!Array.isArray(data.products) || data.products.length < 4) {
    console.error("products[] ausente ou curto.");
    process.exit(1);
  }

  if ((data.available || 0) < 4) {
    console.error("Poucos produtos CPTEC válidos.");
    process.exit(1);
  }

  console.log("\nOK: CPTEC/INPE produtos oficiais ativo.");
}

main();
