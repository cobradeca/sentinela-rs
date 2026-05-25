// supabase/functions/poll-apis/index.ts
// Supabase Edge Function — Deno runtime
// Agenda: a cada 30min via pg_cron (configurar no SQL Editor)
//
// SQL para agendar (rodar no SQL Editor do Supabase):
//   select cron.schedule('poll-sentinela', '*/30 * * * *',
//     $$ select net.http_post(
//       url := 'https://SEU_PROJETO.supabase.co/functions/v1/poll-apis',
//       headers := '{"Authorization": "Bearer SEU_SERVICE_ROLE_KEY"}'::jsonb
//     ) $$
//   );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const STATIONS = [
  { id: "lagoa_patos_pelotas",      name: "Lagoa dos Patos — Pelotas",       lat: -31.77, lon: -52.34, type: "lagoa" },
  { id: "lagoa_patos_sao_lourenco", name: "Lagoa dos Patos — São Lourenço",   lat: -31.37, lon: -51.98, type: "lagoa" },
  { id: "lagoa_patos_porto_alegre", name: "Lagoa dos Patos — Sul POA",        lat: -30.11, lon: -51.18, type: "lagoa" },
  { id: "rs_porto_alegre",          name: "Porto Alegre",                     lat: -30.03, lon: -51.23, type: "cidade" },
  { id: "rs_pelotas",               name: "Pelotas",                          lat: -31.77, lon: -52.34, type: "cidade" },
  { id: "rs_santa_maria",           name: "Santa Maria",                      lat: -29.68, lon: -53.81, type: "cidade" },
  { id: "rs_caxias_sul",            name: "Caxias do Sul",                    lat: -29.17, lon: -51.17, type: "cidade" },
  { id: "rs_passo_fundo",           name: "Passo Fundo",                      lat: -28.26, lon: -52.41, type: "cidade" },
];

function getRiskLevel(precipAccum: number, tempMin: number, windMax: number, ninha: number): string {
  let score = 0;
  if (precipAccum > 150) score += 4; else if (precipAccum > 80) score += 3;
  else if (precipAccum > 40) score += 2; else if (precipAccum > 20) score += 1;
  if (tempMin < 0) score += 3; else if (tempMin < 5) score += 2; else if (tempMin < 10) score += 1;
  if (windMax > 80) score += 3; else if (windMax > 50) score += 2; else if (windMax > 30) score += 1;
  if (ninha > 0.7) score += 3; else if (ninha > 0.4) score += 2; else if (ninha > 0.2) score += 1;
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
  // Segurança: só aceita chamadas autorizadas
  const auth = req.headers.get("Authorization");
  if (!auth?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const results = { success: 0, errors: 0, alerts: 0 };

  for (const station of STATIONS) {
    try {
      // 1. Busca Open-Meteo (gratuito, sem CORS no servidor)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=America%2FSao_Paulo&forecast_days=7`;
      const res = await fetch(url);
      const data = await res.json();
      const d = data.daily;

      const precipAccum = d.precipitation_sum?.reduce((a: number, b: number) => a + b, 0) || 0;
      const tempMin = Math.min(...(d.temperature_2m_min || [20]));
      const tempMax = Math.max(...(d.temperature_2m_max || [30]));
      const windMax = Math.max(...(d.windspeed_10m_max || [0]));
      const avgTemp = d.temperature_2m_max?.reduce((a: number, b: number) => a + b, 0) / (d.temperature_2m_max?.length || 1);
      const ninhaProbability = calcNinha(precipAccum, avgTemp);
      const riskLevel = getRiskLevel(precipAccum, tempMin, windMax, ninhaProbability);

      // Nível da lagoa estimado
      const lagoaLevel = station.type === "lagoa"
        ? parseFloat((0.3 + precipAccum * 0.008).toFixed(2))
        : null;

      // 2. Salva leitura
      await supabase.from("readings").insert({
        station_id: station.id,
        station_name: station.name,
        precip_mm: precipAccum,
        temp_min: tempMin,
        temp_max: tempMax,
        wind_max: windMax,
        weather_code: d.weathercode?.[0],
        lagoa_level: lagoaLevel,
        ninha_prob: ninhaProbability,
        risk_level: riskLevel,
      });

      // 3. Gera alerta se necessário
      if (riskLevel !== "NORMAL") {
        const parts = [];
        if (precipAccum > 80) parts.push(`chuva acumulada de ${precipAccum.toFixed(0)}mm em 7 dias`);
        if (tempMin < 5) parts.push(`temperatura mínima de ${tempMin.toFixed(1)}°C`);
        if (windMax > 50) parts.push(`rajadas de até ${windMax.toFixed(0)} km/h`);
        if (ninhaProbability > 0.4) parts.push(`La Niña ${(ninhaProbability * 100).toFixed(0)}%`);

        const { data: existing } = await supabase
          .from("alerts")
          .select("id")
          .eq("station_id", station.id)
          .eq("active", true)
          .eq("risk_level", riskLevel)
          .single();

        if (!existing) {
          await supabase.from("alerts").insert({
            station_id: station.id,
            station_name: station.name,
            risk_level: riskLevel,
            message: parts.join("; "),
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
      console.error(`Erro na estação ${station.id}:`, err);
      results.errors++;
    }
  }

  // 4. Dispara Edge Function de notificações se houver alertas novos
  if (results.alerts > 0) {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-alerts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
    });
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
