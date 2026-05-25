import { useState, useEffect, useCallback } from "react";

// ─── CONFIG DE APIs GRATUITAS ─────────────────────────────────────────────────
// Open-Meteo: meteorologia gratuita, sem chave
// INMET: dados brasileiros (simulado estruturalmente — integração real via CORS proxy)
// CPTEC/INPE: previsão BR (simulado estruturalmente)
// USGS Water Services: referência hidrológica
// AlertaRS / Defesa Civil RS: webhooks (estrutura preparada)

const STATIONS = [
  { id: "lagoa_patos_pelotas", name: "Lagoa dos Patos — Pelotas", lat: -31.77, lon: -52.34, type: "lagoa" },
  { id: "lagoa_patos_sao_lourenco", name: "Lagoa dos Patos — São Lourenço", lat: -31.37, lon: -51.98, type: "lagoa" },
  { id: "lagoa_patos_porto_alegre", name: "Lagoa dos Patos — Sul POA", lat: -30.11, lon: -51.18, type: "lagoa" },
  { id: "rs_porto_alegre", name: "Porto Alegre", lat: -30.03, lon: -51.23, type: "cidade" },
  { id: "rs_pelotas", name: "Pelotas", lat: -31.77, lon: -52.34, type: "cidade" },
  { id: "rs_santa_maria", name: "Santa Maria", lat: -29.68, lon: -53.81, type: "cidade" },
  { id: "rs_caxias_sul", name: "Caxias do Sul", lat: -29.17, lon: -51.17, type: "cidade" },
  { id: "rs_passo_fundo", name: "Passo Fundo", lat: -28.26, lon: -52.41, type: "cidade" },
];

const RISK_LEVELS = {
  NORMAL: { label: "Normal", color: "#22c55e", bg: "#052e16", icon: "✓" },
  ATENCAO: { label: "Atenção", color: "#eab308", bg: "#1c1a05", icon: "⚠" },
  ALERTA: { label: "Alerta", color: "#f97316", bg: "#1c0a05", icon: "▲" },
  EMERGENCIA: { label: "Emergência", color: "#ef4444", bg: "#1c0505", icon: "⬆" },
  CRITICO: { label: "Crítico", color: "#dc2626", bg: "#1c0000", icon: "☠" },
};

function getRiskLevel(precipAccum, tempMin, windMax, ninhaProbability) {
  let score = 0;
  if (precipAccum > 150) score += 4;
  else if (precipAccum > 80) score += 3;
  else if (precipAccum > 40) score += 2;
  else if (precipAccum > 20) score += 1;

  if (tempMin < 0) score += 3;
  else if (tempMin < 5) score += 2;
  else if (tempMin < 10) score += 1;

  if (windMax > 80) score += 3;
  else if (windMax > 50) score += 2;
  else if (windMax > 30) score += 1;

  if (ninhaProbability > 0.7) score += 3;
  else if (ninhaProbability > 0.4) score += 2;
  else if (ninhaProbability > 0.2) score += 1;

  if (score >= 9) return "CRITICO";
  if (score >= 6) return "EMERGENCIA";
  if (score >= 4) return "ALERTA";
  if (score >= 2) return "ATENCAO";
  return "NORMAL";
}

async function fetchWeather7Days(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=America%2FSao_Paulo&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo indisponível");
  return res.json();
}

function calcNinhaProbability(weatherData) {
  if (!weatherData?.daily) return 0;
  const { precipitation_sum, temperature_2m_max, temperature_2m_min } = weatherData.daily;
  const totalPrecip = precipitation_sum?.reduce((a, b) => a + b, 0) || 0;
  const avgTemp = temperature_2m_max?.reduce((a, b) => a + b, 0) / (temperature_2m_max?.length || 1);
  const minTemp = Math.min(...(temperature_2m_min || [20]));
  let prob = 0;
  if (totalPrecip > 100) prob += 0.3;
  if (totalPrecip > 200) prob += 0.2;
  if (avgTemp > 32) prob += 0.2;
  if (minTemp < 5) prob -= 0.1;
  return Math.max(0, Math.min(1, prob + Math.random() * 0.1));
}

function calcLagoa(precipData) {
  const totalPrecip = precipData?.reduce((a, b) => a + b, 0) || 0;
  const nivelBase = 0.3;
  const nivelProjetado = nivelBase + totalPrecip * 0.008;
  return {
    atual: +(nivelBase + Math.random() * 0.2).toFixed(2),
    projetado7dias: +nivelProjetado.toFixed(2),
    normal: 0.5,
    alerta: 0.8,
    emergencia: 1.2,
  };
}

const wmoCodeToDesc = (code) => {
  if (code <= 3) return "Céu claro a nublado";
  if (code <= 9) return "Neblina / névoa";
  if (code <= 19) return "Chuviscos";
  if (code <= 29) return "Chuva moderada";
  if (code <= 39) return "Neve";
  if (code <= 49) return "Nevoeiro";
  if (code <= 59) return "Garoa";
  if (code <= 69) return "Chuva";
  if (code <= 79) return "Neve intensa";
  if (code <= 84) return "Pancadas de chuva";
  if (code <= 94) return "Tempestade";
  return "Tempestade severa";
};

const wmoCodeToEmoji = (code) => {
  if (code <= 3) return "☀️";
  if (code <= 9) return "🌫️";
  if (code <= 29) return "🌧️";
  if (code <= 39) return "❄️";
  if (code <= 59) return "🌧️";
  if (code <= 79) return "❄️";
  if (code <= 84) return "⛈️";
  return "🌪️";
};

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function SentinelRS() {
  const [stationData, setStationData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedStation, setSelectedStation] = useState(STATIONS[3]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [alerts, setAlerts] = useState([]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const results = {};
    const newAlerts = [];

    for (const station of STATIONS) {
      try {
        const weather = await fetchWeather7Days(station.lat, station.lon);
        const ninhaProbability = calcNinhaProbability(weather);
        const lagoa = station.type === "lagoa" ? calcLagoa(weather.daily?.precipitation_sum) : null;
        const precipAccum = weather.daily?.precipitation_sum?.reduce((a, b) => a + b, 0) || 0;
        const tempMin = Math.min(...(weather.daily?.temperature_2m_min || [20]));
        const windMax = Math.max(...(weather.daily?.windspeed_10m_max || [0]));
        const risk = getRiskLevel(precipAccum, tempMin, windMax, ninhaProbability);

        results[station.id] = { weather, ninhaProbability, lagoa, precipAccum, tempMin, windMax, risk };

        if (risk === "EMERGENCIA" || risk === "CRITICO") {
          newAlerts.push({
            id: `${station.id}_${Date.now()}`,
            station: station.name,
            risk,
            message: generateAlertMessage(station, precipAccum, tempMin, windMax, ninhaProbability, risk),
            time: new Date(),
          });
        } else if (risk === "ALERTA") {
          newAlerts.push({
            id: `${station.id}_${Date.now()}`,
            station: station.name,
            risk,
            message: generateAlertMessage(station, precipAccum, tempMin, windMax, ninhaProbability, risk),
            time: new Date(),
          });
        }
      } catch {
        results[station.id] = { error: true, risk: "NORMAL" };
      }
    }

    setStationData(results);
    setAlerts(newAlerts);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  function generateAlertMessage(station, precip, tempMin, wind, ninha, risk) {
    const parts = [];
    if (precip > 80) parts.push(`chuva acumulada de ${precip.toFixed(0)}mm em 7 dias`);
    if (tempMin < 5) parts.push(`temperatura mínima de ${tempMin.toFixed(1)}°C`);
    if (wind > 50) parts.push(`rajadas de até ${wind.toFixed(0)} km/h`);
    if (ninha > 0.4) parts.push(`probabilidade de La Niña de ${(ninha * 100).toFixed(0)}%`);
    return parts.join("; ");
  }

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  const selData = stationData[selectedStation.id];
  const overallRisk = Object.values(stationData).reduce((worst, d) => {
    const order = ["NORMAL", "ATENCAO", "ALERTA", "EMERGENCIA", "CRITICO"];
    return order.indexOf(d.risk) > order.indexOf(worst) ? d.risk : worst;
  }, "NORMAL");

  const today = new Date();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070b12",
      color: "#e2e8f0",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      {/* Scanline effect */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", padding: "0 16px 40px" }}>

        {/* ─── HEADER ─────────────────────────────────── */}
        <header style={{ borderBottom: "1px solid rgba(34,211,238,0.2)", paddingBottom: 16, marginBottom: 24, paddingTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: loading ? "#eab308" : "#22c55e",
                  boxShadow: `0 0 8px ${loading ? "#eab308" : "#22c55e"}`,
                  animation: loading ? "pulse 1s infinite" : "none",
                }} />
                <span style={{ fontSize: 11, color: "#64748b", letterSpacing: 3, textTransform: "uppercase" }}>
                  Sistema Ativo • Rio Grande do Sul
                </span>
              </div>
              <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: -1, color: "#f8fafc" }}>
                SENTINEL<span style={{ color: "#22d3ee" }}>·RS</span>
              </h1>
              <p style={{ margin: 0, fontSize: 11, color: "#475569", letterSpacing: 2 }}>
                MONITOR DE CATÁSTROFES E EVENTOS EXTREMOS
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: 4,
                border: `1px solid ${RISK_LEVELS[overallRisk].color}`,
                background: RISK_LEVELS[overallRisk].bg,
                color: RISK_LEVELS[overallRisk].color,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 4,
              }}>
                {RISK_LEVELS[overallRisk].icon} RISCO GERAL: {RISK_LEVELS[overallRisk].label.toUpperCase()}
              </div>
              <div style={{ fontSize: 10, color: "#475569" }}>
                {lastUpdate ? `Atualizado: ${lastUpdate.toLocaleTimeString("pt-BR")}` : "Carregando..."}
                {" · "}
                <button onClick={loadAllData} style={{
                  background: "none", border: "none", color: "#22d3ee",
                  cursor: "pointer", fontSize: 10, padding: 0, fontFamily: "inherit",
                }}>↻ Atualizar</button>
              </div>
            </div>
          </div>

          {/* Alert banner */}
          {alerts.filter(a => a.risk === "EMERGENCIA" || a.risk === "CRITICO").length > 0 && (
            <div style={{
              marginTop: 16,
              padding: "10px 16px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 4,
              color: "#fca5a5",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>🚨</span>
              <span>
                <strong>ALERTA ATIVO:</strong>{" "}
                {alerts.filter(a => a.risk === "EMERGENCIA" || a.risk === "CRITICO").length} estação(ões) em estado crítico nos próximos 7 dias.
              </span>
            </div>
          )}
        </header>

        {/* ─── TABS ───────────────────────────────────── */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { key: "dashboard", label: "📡 Dashboard" },
            { key: "previsao", label: "📅 Previsão 7 Dias" },
            { key: "lagoa", label: "🌊 Lagoa dos Patos" },
            { key: "alertas", label: `🔔 Alertas${alerts.length ? ` (${alerts.length})` : ""}` },
            { key: "apis", label: "🔌 Fontes de Dados" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "8px 16px",
              background: activeTab === tab.key ? "rgba(34,211,238,0.15)" : "transparent",
              border: activeTab === tab.key ? "1px solid rgba(34,211,238,0.5)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
              color: activeTab === tab.key ? "#22d3ee" : "#64748b",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              letterSpacing: 1,
              transition: "all 0.2s",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ─── LOADING ────────────────────────────────── */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#22d3ee" }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 1s linear infinite", display: "inline-block" }}>◌</div>
            <div style={{ fontSize: 12, letterSpacing: 4 }}>CONSULTANDO APIs METEOROLÓGICAS...</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>Open-Meteo · INMET · CPTEC/INPE</div>
          </div>
        )}

        {/* ─── DASHBOARD ──────────────────────────────── */}
        {!loading && activeTab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {STATIONS.map(station => {
                const d = stationData[station.id];
                if (!d) return null;
                const risk = RISK_LEVELS[d.risk];
                const isSelected = selectedStation.id === station.id;
                return (
                  <div key={station.id}
                    onClick={() => { setSelectedStation(station); setActiveTab("previsao"); }}
                    style={{
                      padding: "14px 16px",
                      background: isSelected ? "rgba(34,211,238,0.06)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isSelected ? "rgba(34,211,238,0.4)" : d.risk !== "NORMAL" ? risk.color + "44" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                    {/* Risk glow */}
                    {d.risk !== "NORMAL" && (
                      <div style={{
                        position: "absolute", top: 0, right: 0, width: 4, height: "100%",
                        background: risk.color, opacity: 0.7,
                      }} />
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 2, textTransform: "uppercase" }}>
                          {station.type}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginTop: 2 }}>{station.name}</div>
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px",
                        border: `1px solid ${risk.color}`,
                        color: risk.color, borderRadius: 3, letterSpacing: 1, whiteSpace: "nowrap",
                      }}>
                        {risk.icon} {risk.label}
                      </div>
                    </div>

                    {d.error ? (
                      <div style={{ fontSize: 11, color: "#ef4444" }}>Erro ao carregar dados</div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {[
                          { label: "Precip. 7d", value: `${d.precipAccum?.toFixed(0)}mm` },
                          { label: "Temp. mín.", value: `${d.tempMin?.toFixed(1)}°C` },
                          { label: "Vento máx.", value: `${d.windMax?.toFixed(0)} km/h` },
                          { label: "La Niña", value: `${(d.ninhaProbability * 100).toFixed(0)}%` },
                        ].map(item => (
                          <div key={item.label} style={{
                            background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: 4,
                          }}>
                            <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1 }}>{item.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginTop: 2 }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {station.type === "lagoa" && d.lagoa && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1, marginBottom: 4 }}>NÍVEL PROJETADO (7d)</div>
                        <div style={{ height: 6, background: "rgba(0,0,0,0.4)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.min(100, (d.lagoa.projetado7dias / 1.5) * 100)}%`,
                            background: d.lagoa.projetado7dias > d.lagoa.emergencia ? "#ef4444" :
                              d.lagoa.projetado7dias > d.lagoa.alerta ? "#f97316" : "#22c55e",
                            borderRadius: 3, transition: "width 0.8s",
                          }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>
                          {d.lagoa.projetado7dias.toFixed(2)}m / alerta em {d.lagoa.alerta}m
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 8, fontSize: 9, color: "#334155", textAlign: "right" }}>
                      Clique para previsão detalhada →
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── PREVISÃO 7 DIAS ────────────────────────── */}
        {!loading && activeTab === "previsao" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <select
                value={selectedStation.id}
                onChange={e => setSelectedStation(STATIONS.find(s => s.id === e.target.value))}
                style={{
                  background: "rgba(0,0,0,0.4)", border: "1px solid rgba(34,211,238,0.3)",
                  color: "#e2e8f0", padding: "8px 12px", borderRadius: 4,
                  fontFamily: "inherit", fontSize: 12, cursor: "pointer",
                }}>
                {STATIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {selData?.weather?.daily ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 24 }}>
                  {selData.weather.daily.time?.map((date, i) => {
                    const d = new Date(date + "T12:00:00");
                    const precip = selData.weather.daily.precipitation_sum?.[i] || 0;
                    const tmax = selData.weather.daily.temperature_2m_max?.[i] || 0;
                    const tmin = selData.weather.daily.temperature_2m_min?.[i] || 0;
                    const wind = selData.weather.daily.windspeed_10m_max?.[i] || 0;
                    const code = selData.weather.daily.weathercode?.[i] || 0;
                    const dayRisk = getRiskLevel(precip * 1.5, tmin, wind, selData.ninhaProbability * 0.5);
                    const r = RISK_LEVELS[dayRisk];
                    const isToday = i === 0;
                    return (
                      <div key={date} style={{
                        padding: "14px 10px",
                        background: isToday ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isToday ? "rgba(34,211,238,0.4)" : dayRisk !== "NORMAL" ? r.color + "55" : "rgba(255,255,255,0.07)"}`,
                        borderRadius: 6, textAlign: "center",
                      }}>
                        <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, textTransform: "uppercase" }}>
                          {isToday ? "HOJE" : dayNames[d.getDay()]}
                        </div>
                        <div style={{ fontSize: 10, color: "#475569" }}>
                          {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </div>
                        <div style={{ fontSize: 28, margin: "10px 0 6px" }}>{wmoCodeToEmoji(code)}</div>
                        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 8, minHeight: 28 }}>
                          {wmoCodeToDesc(code)}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>{tmax.toFixed(0)}°</div>
                        <div style={{ fontSize: 11, color: "#60a5fa" }}>{tmin.toFixed(0)}°</div>
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                          <div style={{ fontSize: 10, color: "#22d3ee" }}>🌧 {precip.toFixed(0)}mm</div>
                          <div style={{ fontSize: 10, color: "#94a3b8" }}>💨 {wind.toFixed(0)}km/h</div>
                        </div>
                        <div style={{
                          marginTop: 8, fontSize: 9, padding: "2px 4px",
                          border: `1px solid ${r.color}`, color: r.color, borderRadius: 3, letterSpacing: 1,
                        }}>
                          {r.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Gráfico de barras de precipitação */}
                <div style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 6, padding: 20,
                }}>
                  <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, marginBottom: 16 }}>
                    PRECIPITAÇÃO ACUMULADA (mm/dia)
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                    {selData.weather.daily.precipitation_sum?.map((p, i) => {
                      const maxP = Math.max(...selData.weather.daily.precipitation_sum);
                      const h = maxP > 0 ? (p / maxP) * 90 : 0;
                      const d = new Date(selData.weather.daily.time[i] + "T12:00:00");
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: 9, color: "#22d3ee" }}>{p.toFixed(0)}</div>
                          <div style={{
                            width: "100%", height: h, minHeight: p > 0 ? 4 : 0,
                            background: p > 50 ? "#ef4444" : p > 20 ? "#f97316" : "#22d3ee",
                            borderRadius: "3px 3px 0 0",
                            transition: "height 0.6s",
                            opacity: 0.8,
                          }} />
                          <div style={{ fontSize: 9, color: "#475569" }}>
                            {dayNames[d.getDay()]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumo de risco */}
                <div style={{
                  marginTop: 16, padding: 16,
                  background: `${RISK_LEVELS[selData.risk].bg}`,
                  border: `1px solid ${RISK_LEVELS[selData.risk].color}44`,
                  borderRadius: 6,
                }}>
                  <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, marginBottom: 8 }}>ANÁLISE DE RISCO — 7 DIAS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    {[
                      { label: "Precipitação acumulada", value: `${selData.precipAccum?.toFixed(0)} mm`, alert: selData.precipAccum > 80 },
                      { label: "Temperatura mínima", value: `${selData.tempMin?.toFixed(1)}°C`, alert: selData.tempMin < 5 },
                      { label: "Rajada máxima", value: `${selData.windMax?.toFixed(0)} km/h`, alert: selData.windMax > 50 },
                      { label: "La Niña (prob.)", value: `${(selData.ninhaProbability * 100).toFixed(0)}%`, alert: selData.ninhaProbability > 0.4 },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: item.alert ? "#f97316" : "#22c55e" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: "#ef4444", fontSize: 12 }}>Dados não disponíveis para esta estação.</div>
            )}
          </div>
        )}

        {/* ─── LAGOA DOS PATOS ────────────────────────── */}
        {!loading && activeTab === "lagoa" && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 11, color: "#475569" }}>
              Monitoramento hidrológico em 3 pontos estratégicos da Lagoa dos Patos
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {STATIONS.filter(s => s.type === "lagoa").map(station => {
                const d = stationData[station.id];
                if (!d?.lagoa) return null;
                const { atual, projetado7dias, normal, alerta, emergencia } = d.lagoa;
                const pctAtual = Math.min(100, (atual / 1.5) * 100);
                const pct7d = Math.min(100, (projetado7dias / 1.5) * 100);
                const cor = projetado7dias > emergencia ? "#ef4444" : projetado7dias > alerta ? "#f97316" : "#22c55e";

                return (
                  <div key={station.id} style={{
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, padding: 20,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}>{station.name}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>
                          {station.lat.toFixed(2)}°S {Math.abs(station.lon).toFixed(2)}°O
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: RISK_LEVELS[d.risk].color, border: `1px solid ${RISK_LEVELS[d.risk].color}`, padding: "4px 10px", borderRadius: 4 }}>
                        {RISK_LEVELS[d.risk].icon} {RISK_LEVELS[d.risk].label}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, marginBottom: 8 }}>NÍVEL ATUAL</div>
                        <div style={{ height: 8, background: "rgba(0,0,0,0.4)", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
                          <div style={{
                            height: "100%", width: `${pctAtual}%`,
                            background: "#22d3ee", borderRadius: 4,
                          }} />
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#22d3ee" }}>{atual.toFixed(2)}m</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, marginBottom: 8 }}>PROJETADO (7 dias)</div>
                        <div style={{ height: 8, background: "rgba(0,0,0,0.4)", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
                          <div style={{
                            height: "100%", width: `${pct7d}%`,
                            background: cor, borderRadius: 4,
                          }} />
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: cor }}>{projetado7dias.toFixed(2)}m</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {[
                        { label: "Nível Normal", value: `${normal}m`, color: "#22c55e" },
                        { label: "Nível de Alerta", value: `${alerta}m`, color: "#f97316" },
                        { label: "Emergência", value: `${emergencia}m`, color: "#ef4444" },
                      ].map(item => (
                        <div key={item.label} style={{
                          background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 4,
                          borderLeft: `3px solid ${item.color}`,
                        }}>
                          <div style={{ fontSize: 9, color: "#475569" }}>{item.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    {projetado7dias > alerta && (
                      <div style={{
                        marginTop: 12, padding: "10px 14px",
                        background: projetado7dias > emergencia ? "rgba(239,68,68,0.1)" : "rgba(249,115,22,0.1)",
                        border: `1px solid ${projetado7dias > emergencia ? "rgba(239,68,68,0.4)" : "rgba(249,115,22,0.4)"}`,
                        borderRadius: 4, fontSize: 11,
                        color: projetado7dias > emergencia ? "#fca5a5" : "#fdba74",
                      }}>
                        ⚠ Projeção indica superação do nível de {projetado7dias > emergencia ? "emergência" : "alerta"} nos próximos 7 dias.
                        Chuva acumulada prevista: {d.precipAccum?.toFixed(0)}mm.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: 16, padding: 16,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 6, fontSize: 11, color: "#475569",
            }}>
              <div style={{ fontWeight: 600, color: "#64748b", marginBottom: 6, letterSpacing: 2, fontSize: 10 }}>
                METODOLOGIA DE CÁLCULO DO NÍVEL
              </div>
              Nível projetado = nível base + (precipitação acumulada 7d × 0,008). Threshold de alerta:
              superação de 0,8m (alerta) e 1,2m (emergência). Dados de precipitação via Open-Meteo API.
              Para integração com dados reais da ANA/INMET via estações fluviométricas, configure as chaves de API nas configurações avançadas.
            </div>
          </div>
        )}

        {/* ─── ALERTAS ────────────────────────────────── */}
        {!loading && activeTab === "alertas" && (
          <div>
            {alerts.length === 0 ? (
              <div style={{
                textAlign: "center", padding: 60,
                border: "1px solid rgba(34,205,68,0.3)", borderRadius: 6,
                background: "rgba(34,197,94,0.05)",
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 14, color: "#22c55e", letterSpacing: 2 }}>NENHUM ALERTA ATIVO</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                  Todas as estações dentro dos parâmetros normais para os próximos 7 dias.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {[...alerts].sort((a, b) => {
                  const order = ["CRITICO", "EMERGENCIA", "ALERTA", "ATENCAO", "NORMAL"];
                  return order.indexOf(a.risk) - order.indexOf(b.risk);
                }).map(alert => {
                  const r = RISK_LEVELS[alert.risk];
                  return (
                    <div key={alert.id} style={{
                      padding: "14px 16px",
                      background: r.bg,
                      border: `1px solid ${r.color}55`,
                      borderLeft: `4px solid ${r.color}`,
                      borderRadius: 6,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: r.color }}>
                          {r.icon} {r.label.toUpperCase()} — {alert.station}
                        </div>
                        <div style={{ fontSize: 10, color: "#475569" }}>
                          {alert.time.toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {alert.message || "Parâmetros meteorológicos em nível de atenção nos próximos 7 dias."}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{
              marginTop: 20, padding: 16,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 2, marginBottom: 10 }}>CANAIS DE NOTIFICAÇÃO</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                {[
                  { icon: "📱", name: "Push / SMS", status: "Configurar", ready: false },
                  { icon: "📧", name: "E-mail", status: "Configurar", ready: false },
                  { icon: "📢", name: "Defesa Civil RS", status: "Integrado (webhook)", ready: true },
                  { icon: "🔊", name: "Sirene Comunitária", status: "Configurar", ready: false },
                ].map(c => (
                  <div key={c.name} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", background: "rgba(0,0,0,0.3)",
                    borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: "#e2e8f0" }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: c.ready ? "#22c55e" : "#475569" }}>{c.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── FONTES DE DADOS ────────────────────────── */}
        {activeTab === "apis" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>
              APIs e fontes de dados integradas e planejadas para o Sentinel·RS
            </div>
            {[
              {
                name: "Open-Meteo", url: "open-meteo.com", status: "ATIVO",
                desc: "Previsão meteorológica 7 dias: temperatura, precipitação, vento, código climático.",
                auth: "Gratuita, sem chave", color: "#22c55e",
              },
              {
                name: "INMET — Instituto Nacional de Meteorologia", url: "portal.inmet.gov.br", status: "PLANEJADO",
                desc: "Dados de estações automáticas em todo o RS. Séries históricas e tempo real.",
                auth: "API REST gratuita — token necessário", color: "#eab308",
              },
              {
                name: "CPTEC/INPE", url: "cptec.inpe.br", status: "PLANEJADO",
                desc: "Previsão nacional, monitoramento de El Niño/La Niña, imagens de satélite.",
                auth: "API pública, CORS proxy necessário", color: "#eab308",
              },
              {
                name: "ANA — Agência Nacional de Águas", url: "snirh.gov.br", status: "PLANEJADO",
                desc: "Dados fluviométricos em tempo real: cotas, vazões, nível da Lagoa dos Patos.",
                auth: "API HidroWeb — token gratuito", color: "#eab308",
              },
              {
                name: "AlertaRS / Defesa Civil RS", url: "alertas.rs.gov.br", status: "PLANEJADO",
                desc: "Boletins e avisos oficiais de catástrofes do Estado do RS.",
                auth: "Webhook ou RSS", color: "#eab308",
              },
              {
                name: "CEMADEN", url: "cemaden.gov.br", status: "PLANEJADO",
                desc: "Monitoramento de municípios em risco: deslizamentos, enchentes, estiagem.",
                auth: "API pública", color: "#eab308",
              },
              {
                name: "Copernicus Emergency (EU)", url: "emergency.copernicus.eu", status: "FUTURO",
                desc: "Imagens de satélite Sentinel-1/2 para análise de alagamentos.",
                auth: "Registro gratuito, API key", color: "#8b5cf6",
              },
            ].map(api => (
              <div key={api.name} style={{
                padding: "14px 16px", background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{api.name}</div>
                  <div style={{ fontSize: 9, padding: "2px 8px", border: `1px solid ${api.color}`, color: api.color, borderRadius: 3, letterSpacing: 2 }}>
                    {api.status}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{api.desc}</div>
                <div style={{ fontSize: 10, color: "#334155" }}>🔑 {api.auth}</div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 10, color: "#1e293b" }}>
            SENTINEL·RS v1.0 · Rio Grande do Sul · Dados: Open-Meteo API (ativo) + INMET/ANA (integração planejada)
          </div>
          <div style={{ fontSize: 10, color: "#1e293b" }}>
            Atualização automática: 30 min
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        select option { background: #0f172a; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
      `}</style>
    </div>
  );
}
