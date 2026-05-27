const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";
const url = `https://${PROJECT_REF}.supabase.co/functions/v1/copernicus-ndvi?aoi=entorno_lagoa_patos&days=30`;

(async () => {
  const started = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  const text = await res.text();
  console.log(`HTTP ${res.status} · ${Date.now() - started}ms`);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
})();
