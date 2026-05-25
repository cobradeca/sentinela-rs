// supabase/functions/poll-apis/index.ts — v2.0
// Adicionado: Rio Grande, ANA HidroWeb real, nível lagoa com dado real

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const STATIONS = [
  { id: "lagoa_rio_grande",         name: "Lagoa dos Patos — Rio Grande",    lat: -32.03, lon: -52.10, type: "lagoa", anaCode: "87980000" },
  { id: "lagoa_patos_pelotas",      name: "Lagoa dos Patos — Pelotas",       lat: -31.77, lon: -52.34, type: "lagoa", anaCode: "87955000" },
  { id: "lagoa_patos_arambare",     name: "Lagoa dos Patos — Arambaré",      lat: -30.91, lon: -51.50, type: "lagoa", anaCode: "87540000" },
  { id: "lagoa_patos_porto_alegre", name: "Lagoa dos Patos — Sul POA",       lat: -30.11, lon: -51.18, type: "lagoa", anaCode: "87450004" },
  { id: "rs_rio_grande",            name: "Rio Grande",                      lat: -32.03, lon: -52.10, type: "cidade" },
  { id: "rs_porto_alegre",          name: "Porto Alegre",                    lat: -30.03, lon: -51.23, type: "cidade" },
  { id: "rs_pelotas",               name: "Pelotas",                         lat: -31.77, lon: -52.34, type: "cidade" },
  { id: "rs_santa_maria",           name: "Santa Maria",                     lat: -29.68, lon: -53.81, type: "cidade" },
  { id: "rs_caxias_sul",            name: "Caxias do Sul",                   lat: -29.17, lon: -51.17, type: "cidade" },
  { id: "rs_passo_fundo",           name: "Passo Fundo",                     lat: -28.26, lon: -52.41, type: "cidade" },
];

async function fetchAnaLevel(anaCode: string): Promise<number | null> {
  try {
    const url = `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${anaCode}&dataInicio=&dataFim=`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/<Cota>([\d.]+)<\/Cota>/);
    if (match) return parseFloat(match[1]) / 100;
    return null;
  } catch {
    return null;
  }
}

function getRiskLevel(precipAccum: number, tempMin: number, windMax: number, ninha: number, lagoaLevel: number | null): string {
  let score = 0;
  if (precipAccum > 150) score += 4; else if (precipAccum > 80) score += 3;
  else if (precipAccum > 40) score += 2; else if (precipAccum > 20) score += 1;
  if (tempMin < 0) score += 3; else if (tempMin < 5) score += 2; else if (tempMin < 10) score += 1;
  if (windMax > 80) score += 3; else if (windMax > 50) score += 2; else if (windMax > 30) score += 1;
  if (ninha > 0.7) score += 3; else if (ninha > 0.4) score += 2; else if (ninha > 0.2) score += 1;
  if (lagoaLevel !== null) {
    if (lagoaLevel > 1.2) score += 4;
    else if (lagoaLevel > 0.8) score += 3;
    else if (lagoaLevel > 0.5) score += 1;
  }
  if (score >= 9) return "CRITICO";
  if (score >= 6) return "EMERGENCIA";
  if (score >= 4) return "ALERTA";
  if (score >= 2) return "ATENCAO";
  return "NORMAL";
}

function calcNinha(precipTotal: number, avgTemp: number): number {
  let prob = 0;
  if (precipTotal > 100) prob += 0.3;
  if (precipTotal > 200) prob += 0.2;
  if (avgTemp > 32) prob += 0.2;
  return Math.max(0, Math.min(1, prob));
}

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const results = { success: 0, errors: 0, alerts: 0 };

  for (const station of STATIONS) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=America%2FSao_Paulo&forecast_days=7`;
      const res = await fetch(url);
      const data = await res.json();
      const d = data.daily;

      const precipAccum = d.precipitation_sum?.reduce((a: number, b: number) => a + b, 0) || 0;
      const tempMin = Math.min(...(d.temperature_2m_min || [20]));
      const tempMax = Math.max(...(d.temperature_2m_max || [30]));
      const windMax = Math.max(...(d.windspeed_10m_max || [0]));
      const avgTemp = d.temperature_2m_max?.reduce((a: number, b: number) => a + b, 0) / (d.temperature_2m_max?.length || 1);
      const ninha = calcNinha(precipAccum, avgTemp);

      // Busca nível real da ANA para estações da lagoa
      let realLevel: number | null = null;
      if (station.anaCode) {
        realLevel = await fetchAnaLevel(station.anaCode);
      }

      const lagoaLevel = station.type === "lagoa"
        ? (realLevel !== null ? realLevel : parseFloat((0.3 + precipAccum * 0.008).toFixed(2)))
        : null;

      const riskLevel = getRiskLevel(precipAccum, tempMin, windMax, ninha, lagoaLevel);

      await supabase.from("readings").insert({
        station_id: station.id,
        station_name: station.name,
        precip_mm: precipAccum,
        temp_min: tempMin,
        temp_max: tempMax,
        wind_max: windMax,
        weather_code: d.weathercode?.[0],
        lagoa_level: lagoaLevel,
        ninha_prob: ninha,
        risk_level: riskLevel,
      });

      if (riskLevel !== "NORMAL") {
        const parts: string[] = [];
        if (precipAccum > 80) parts.push(`chuva ${precipAccum.toFixed(0)}mm/7d`);
        if (tempMin < 5) parts.push(`temp. mín. ${tempMin.toFixed(1)}°C`);
        if (windMax > 50) parts.push(`rajadas ${windMax.toFixed(0)} km/h`);
        if (ninha > 0.4) parts.push(`La Niña ${(ninha * 100).toFixed(0)}%`);
        if (lagoaLevel && lagoaLevel > 0.8) parts.push(`nível lagoa ${lagoaLevel.toFixed(2)}m${realLevel !== null ? " (real)" : " (est.)"}`);

        const { data: existing } = await supabase
          .from("alerts").select("id")
          .eq("station_id", station.id).eq("active", true).eq("risk_level", riskLevel)
          .single();

        if (!existing) {
          await supabase.from("alerts").insert({
            station_id: station.id,
            station_name: station.name,
            risk_level: riskLevel,
            message: parts.join(" · "),
            precip_7d: precipAccum,
            temp_min: tempMin,
            wind_max: windMax,
            lagoa_level: lagoaLevel,
          });
          results.alerts++;
        }
      }

      results.success++;
    } catch (err) {
      console.error(`Erro ${station.id}:`, err);
      results.errors++;
    }
  }

  if (results.alerts > 0) {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-alerts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
    });
  }

  return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
});
