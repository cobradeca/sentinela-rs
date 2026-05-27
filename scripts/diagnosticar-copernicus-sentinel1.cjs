const PROJECT_REF = "ykaaxrzkfeaxatrnkkxj";
const url = `https://${PROJECT_REF}.supabase.co/functions/v1/copernicus-sentinel1-water?aoi=lagoa_patos&days=18`;

(async () => {
  const started = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  const text = await res.text();
  console.log(`HTTP ${res.status} · ${Date.now() - started}ms`);
  try {
    const data = JSON.parse(text);
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.log(text);
  }
})();
