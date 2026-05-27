const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";
const url = `https://${PROJECT_REF}.supabase.co/functions/v1/copernicus-water?aoi=lagoa_patos&days=30`;

(async () => {
  const started = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  const text = await res.text();
  console.log(`HTTP ${res.status} · ${Date.now() - started}ms`);
  try {
    const data = JSON.parse(text);
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.log(text);
  }
})();
