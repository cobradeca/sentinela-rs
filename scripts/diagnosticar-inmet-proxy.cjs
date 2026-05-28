const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";
const url = `https://${PROJECT_REF}.supabase.co/functions/v1/inmet-previsao?codigo_ibge=4314902`;

(async () => {
  const started = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const text = await res.text();
  console.log(`HTTP ${res.status} · ${Date.now() - started}ms`);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
})();
