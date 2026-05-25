import { useState, useEffect, useCallback } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ─── ESTAÇÕES ────────────────────────────────────────────────────────────────
const STATIONS = [
  // Lagoa dos Patos — estações com código ANA real
  { id: "lagoa_rio_grande",        name: "Lagoa dos Patos — Rio Grande",    lat: -32.03, lon: -52.10, type: "lagoa", anaCode: "87980000" },
  { id: "lagoa_patos_pelotas",     name: "Lagoa dos Patos — Pelotas",       lat: -31.77, lon: -52.34, type: "lagoa", anaCode: "87955000" },
  { id: "lagoa_patos_arambare",    name: "Lagoa dos Patos — Arambaré",      lat: -30.91, lon: -51.50, type: "lagoa", anaCode: "87540000" },
  { id: "lagoa_patos_porto_alegre",name: "Lagoa dos Patos — Sul POA",       lat: -30.11, lon: -51.18, type: "lagoa", anaCode: "87450004" },
  // Cidades
  { id: "rs_rio_grande",           name: "Rio Grande",                      lat: -32.03, lon: -52.10, type: "cidade" },
  { id: "rs_porto_alegre",         name: "Porto Alegre",                    lat: -30.03, lon: -51.23, type: "cidade" },
  { id: "rs_pelotas",              name: "Pelotas",                         lat: -31.77, lon: -52.34, type: "cidade" },
  { id: "rs_santa_maria",          name: "Santa Maria",                     lat: -29.68, lon: -53.81, type: "cidade" },
  { id: "rs_caxias_sul",           name: "Caxias do Sul",                   lat: -29.17, lon: -51.17, type: "cidade" },
  { id: "rs_passo_fundo",          name: "Passo Fundo",                     lat: -28.26, lon: -52.41, type: "cidade" },
];

// Códigos ANA para busca de nível real
const ANA_STATIONS = STATIONS.filter(s => s.anaCode);

const RISK_LEVELS = {
  NORMAL:    { label: "Normal",     color: "#22c55e", bg: "#052e16", icon: "✓" },
  ATENCAO:   { label: "Atenção",    color: "#eab308", bg: "#1c1a05", icon: "⚠" },
  ALERTA:    { label: "Alerta",     color: "#f97316", bg: "#1c0a05", icon: "▲" },
  EMERGENCIA:{ label: "Emergência", color: "#ef4444", bg: "#1c0505", icon: "⬆" },
  CRITICO:   { label: "Crítico",    color: "#dc2626", bg: "#1c0000", icon: "☠" },
};

// ─── FUNÇÕES UTILITÁRIAS ─────────────────────────────────────────────────────
function getRiskLevel(precipAccum, tempMin, windMax, ninhaProbability, lagoaLevel = null) {
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

  // Nível real da lagoa entra no cálculo
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

async function fetchWeather7Days(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=America%2FSao_Paulo&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo indisponível");
  return res.json();
}

// Busca nível real da lagoa na API HidroWeb/ANA
async function fetchAnaLevel(anaCode) {
  try {
    const url = `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${anaCode}&dataInicio=&dataFim=`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const text = await res.text();
    // Extrai cota do XML retornado
    const match = text.match(/<Cota>([\d.]+)<\/Cota>/);
    if (match) return parseFloat(match[1]) / 100; // converte cm para metros
    return null;
  } catch {
    return null; // fallback: usa estimativa
  }
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
  return Math.max(0, Math.min(1, prob));
}

function calcLagoa(precipData, realLevel = null) {
  const totalPrecip = precipData?.reduce((a, b) => a + b, 0) || 0;
  const nivelBase = 0.3;
  const nivelProjetado = nivelBase + totalPrecip * 0.008;
  return {
    atual: realLevel !== null ? realLevel : +(nivelBase + Math.random() * 0.2).toFixed(2),
    projetado7dias: +nivelProjetado.toFixed(2),
    isReal: realLevel !== null,
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

// ─── COMPONENTE PUSH ─────────────────────────────────────────────────────────
function PushButton({ supabase }) {
  const [state, setState] = useState("idle"); // idle | requesting | subscribed | error
  const [msg, setMsg] = useState("");

  async function subscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMsg("Navegador não suporta push"); setState("error"); return;
    }
    setState("requesting");
    try {
      const reg = await navigator.serviceWorker.register("/sentinela-rs/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setMsg("Permissão negada"); setState("error"); return; }

      const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!VAPID_KEY) { setMsg("VAPID key não configurada"); setState("error"); return; }

      const padding = "=".repeat((4 - VAPID_KEY.length % 4) % 4);
      const base64 = (VAPID_KEY + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = atob(base64);
      const key = Uint8Array.from([...raw].map(c => c.charCodeAt(0)));

      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await supabase.from("push_subscriptions").upsert({
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")))),
        auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")))),
        station_ids: [],
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

      setState("subscribed"); setMsg("Notificações ativas!");
    } catch (e) {
      setMsg(e.message); setState("error");
    }
  }

  return (
    <button onClick={subscribe} disabled={state === "subscribed" || state === "requesting"} style={{
      padding: "8px 16px", borderRadius: 4, fontFamily: "inherit", fontSize: 12,
      cursor: state === "subscribed" ? "default" : "pointer",
      background: state === "subscribed" ? "rgba(34,197,94,0.15)" : "rgba(34,211,238,0.1)",
      border: `1px solid ${state === "subscribed" ? "#22c55e" : state === "error" ? "#ef4444" : "rgba(34,211,238,0.4)"}`,
      color: state === "subscribed" ? "#22c55e" : state === "error" ? "#ef4444" : "#22d3ee",
    }}>
      {state === "idle" && "🔔 Ativar notificações push"}
      {state === "requesting" && "⏳ Aguardando permissão..."}
      {state === "subscribed" && "✓ Notificações ativas"}
      {state === "error" && `✗ ${msg}`}
    </button>
  );
}

// ─── APP PRINCIPAL ───────────────────────────────────────────────────────────
export default function SentinelaRS() {
  const [stationData, setStationData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedStation, setSelectedStation] = useState(STATIONS[4]); // Rio Grande
  const [activeTab, setActiveTab] = useState("dashboard");
  const [alerts, setAlerts] = useState([]);
  const [dbAlerts, setDbAlerts] = useState([]);
  const [supabase, setSupabase] = useState(null);

  // Inicializa Supabase
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      const client = createClient(url, key);
      setSupabase(client);

      // Realtime: atualiza alertas do banco em tempo real
      client.channel("alerts-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" }, payload => {
          setDbAlerts(prev => [payload.new, ...prev].slice(0, 50));
        })
        .subscribe();

      // Busca alertas existentes do banco
      client.from("alerts").select("*").eq("active", true).order("created_at", { ascending: false }).limit(20)
        .then(({ data }) => { if (data) setDbAlerts(data); });
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const results = {};
    const newAlerts = [];

    for (const station of STATIONS) {
      try {
        const weather = await fetchWeather7Days(station.lat, station.lon);
        const ninhaProbability = calcNinhaProbability(weather);

        // Busca nível real ANA para estações da lagoa
        let realLevel = null;
        if (station.anaCode) {
          realLevel = await fetchAnaLevel(station.anaCode);
        }

        const lagoa = station.type === "lagoa"
          ? calcLagoa(weather.daily?.precipitation_sum, realLevel)
          : null;

        const precipAccum = weather.daily?.precipitation_sum?.reduce((a, b) => a + b, 0) || 0;
        const tempMin = Math.min(...(weather.daily?.temperature_2m_min || [20]));
        const windMax = Math.max(...(weather.daily?.windspeed_10m_max || [0]));
        const risk = getRiskLevel(precipAccum, tempMin, windMax, ninhaProbability, lagoa?.atual || null);

        results[station.id] = { weather, ninhaProbability, lagoa, precipAccum, tempMin, windMax, risk, realLevel };

        if (risk !== "NORMAL") {
          newAlerts.push({
            id: `${station.id}_${Date.now()}`,
            station_name: station.name,
            risk_level: risk,
            message: buildAlertMsg(precipAccum, tempMin, windMax, ninhaProbability, lagoa),
            created_at: new Date(),
            source: "local",
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

  function buildAlertMsg(precip, tempMin, wind, ninha, lagoa) {
    const parts = [];
    if (precip > 80) parts.push(`chuva acumulada ${precip.toFixed(0)}mm/7d`);
    if (tempMin < 5) parts.push(`temp. mín. ${tempMin.toFixed(1)}°C`);
    if (wind > 50) parts.push(`rajadas ${wind.toFixed(0)} km/h`);
    if (ninha > 0.4) parts.push(`La Niña ${(ninha * 100).toFixed(0)}%`);
    if (lagoa?.atual > lagoa?.alerta) parts.push(`nível lagoa ${lagoa.atual.toFixed(2)}m`);
    return parts.join(" · ") || "Parâmetros em nível de atenção";
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

  const allAlerts = [...alerts, ...dbAlerts].sort((a, b) => {
    const order = ["CRITICO", "EMERGENCIA", "ALERTA", "ATENCAO", "NORMAL"];
    return order.indexOf(a.risk_level) - order.indexOf(b.risk_level);
  });

  const criticalCount = allAlerts.filter(a => a.risk_level === "EMERGENCIA" || a.risk_level === "CRITICO").length;

  return (
    <div style={{
      minHeight: "100vh", background: "#070b12", color: "#e2e8f0",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)`,
        backgroundSize: "40px 40px", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", padding: "0 16px 40px" }}>

        {/* ─── HEADER ─── */}
        <header style={{ borderBottom: "1px solid rgba(34,211,238,0.2)", paddingBottom: 16, marginBottom: 24, paddingTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: loading ? "#eab308" : "#22c55e",
                  boxShadow: `0 0 8px ${loading ? "#eab308" : "#22c55e"}`,
                }} />
                <span style={{ fontSize: 11, color: "#64748b", letterSpacing: 3, textTransform: "uppercase" }}>
                  Sistema Ativo · Rio Grande do Sul
                </span>
              </div>
              <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: -1, color: "#f8fafc" }}>
                SENTINELA<span style={{ color: "#22d3ee" }}>·RS</span>
              </h1>
              <p style={{ margin: 0, fontSize: 11, color: "#475569", letterSpacing: 2 }}>
                MONITOR DE CATÁSTROFES E EVENTOS EXTREMOS
              </p>
            </div>

            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <div style={{
                padding: "6px 14px", borderRadius: 4,
                border: `1px solid ${RISK_LEVELS[overallRisk].color}`,
                background: RISK_LEVELS[overallRisk].bg,
                color: RISK_LEVELS[overallRisk].color,
                fontSize: 13, fontWeight: 700, letterSpacing: 2,
              }}>
                {RISK_LEVELS[overallRisk].icon} RISCO GERAL: {RISK_LEVELS[overallRisk].label.toUpperCase()}
              </div>
              {supabase && <PushButton supabase={supabase} />}
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

          {criticalCount > 0 && (
            <div style={{
              marginTop: 16, padding: "10px 16px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 4, color: "#fca5a5", fontSize: 12, display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>🚨</span>
              <span><strong>ALERTA ATIVO:</strong> {criticalCount} estação(ões) em estado crítico.</span>
            </div>
          )}
        </header>

        {/* ─── TABS ─── */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { key: "dashboard", label: "📡 Dashboard" },
            { key: "previsao",  label: "📅 Previsão 7 Dias" },
            { key: "lagoa",     label: "🌊 Lagoa dos Patos" },
            { key: "alertas",   label: `🔔 Alertas${allAlerts.length ? ` (${allAlerts.length})` : ""}` },
            { key: "apis",      label: "🔌 Fontes de Dados" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "8px 16px",
              background: activeTab === tab.key ? "rgba(34,211,238,0.15)" : "transparent",
              border: activeTab === tab.key ? "1px solid rgba(34,211,238,0.5)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
              color: activeTab === tab.key ? "#22d3ee" : "#64748b",
              cursor: "pointer", fontFamily: "inherit", fontSize: 12, letterSpacing: 1,
            }}>{tab.label}</button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#22d3ee" }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 1s linear infinite", display: "inline-block" }}>◌</div>
            <div style={{ fontSize: 12, letterSpacing: 4 }}>CONSULTANDO APIs...</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>Open-Meteo · ANA HidroWeb · Supabase</div>
          </div>
        )}

        {/* ─── DASHBOARD ─── */}
        {!loading && activeTab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {STATIONS.map(station => {
              const d = stationData[station.id];
              if (!d) return null;
              const risk = RISK_LEVELS[d.risk];
              return (
                <div key={station.id}
                  onClick={() => { setSelectedStation(station); setActiveTab("previsao"); }}
                  style={{
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${d.risk !== "NORMAL" ? risk.color + "55" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 6, cursor: "pointer", position: "relative", overflow: "hidden",
                  }}>
                  {d.risk !== "NORMAL" && (
                    <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", background: risk.color, opacity: 0.7 }} />
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 2, textTransform: "uppercase" }}>{station.type}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginTop: 2 }}>{station.name}</div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px",
                      border: `1px solid ${risk.color}`, color: risk.color, borderRadius: 3, letterSpacing: 1,
                    }}>
                      {risk.icon} {risk.label}
                    </div>
                  </div>

                  {d.error ? (
                    <div style={{ fontSize: 11, color: "#ef4444" }}>Erro ao carregar</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {[
                        { label: "Precip. 7d",  value: `${d.precipAccum?.toFixed(0)}mm` },
                        { label: "Temp. mín.",   value: `${d.tempMin?.toFixed(1)}°C` },
                        { label: "Vento máx.",   value: `${d.windMax?.toFixed(0)} km/h` },
                        { label: "La Niña",      value: `${(d.ninhaProbability * 100).toFixed(0)}%` },
                      ].map(item => (
                        <div key={item.label} style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: 4 }}>
                          <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginTop: 2 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {station.type === "lagoa" && d.lagoa && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                        <span>NÍVEL {d.lagoa.isReal ? "REAL" : "ESTIMADO"}</span>
                        {d.lagoa.isReal && <span style={{ color: "#22c55e" }}>● ANA</span>}
                      </div>
                      <div style={{ height: 6, background: "rgba(0,0,0,0.4)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(100, (d.lagoa.atual / 1.5) * 100)}%`,
                          background: d.lagoa.atual > d.lagoa.emergencia ? "#ef4444" : d.lagoa.atual > d.lagoa.alerta ? "#f97316" : "#22c55e",
                          borderRadius: 3,
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>
                        {d.lagoa.atual.toFixed(2)}m / alerta {d.lagoa.alerta}m
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 9, color: "#334155", textAlign: "right" }}>Clique para previsão →</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── PREVISÃO 7 DIAS ─── */}
        {!loading && activeTab === "previsao" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <select value={selectedStation.id} onChange={e => setSelectedStation(STATIONS.find(s => s.id === e.target.value))}
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
                        <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2 }}>{isToday ? "HOJE" : dayNames[d.getDay()]}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
                        <div style={{ fontSize: 28, margin: "10px 0 6px" }}>{wmoCodeToEmoji(code)}</div>
                        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 8, minHeight: 28 }}>{wmoCodeToDesc(code)}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>{tmax.toFixed(0)}°</div>
                        <div style={{ fontSize: 11, color: "#60a5fa" }}>{tmin.toFixed(0)}°</div>
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                          <div style={{ fontSize: 10, color: "#22d3ee" }}>🌧 {precip.toFixed(0)}mm</div>
                          <div style={{ fontSize: 10, color: "#94a3b8" }}>💨 {wind.toFixed(0)}km/h</div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 9, padding: "2px 4px", border: `1px solid ${r.color}`, color: r.color, borderRadius: 3 }}>
                          {r.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Gráfico precipitação */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, marginBottom: 16 }}>PRECIPITAÇÃO ACUMULADA (mm/dia)</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                    {selData.weather.daily.precipitation_sum?.map((p, i) => {
                      const maxP = Math.max(...selData.weather.daily.precipitation_sum, 1);
                      const h = (p / maxP) * 90;
                      const d = new Date(selData.weather.daily.time[i] + "T12:00:00");
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: 9, color: "#22d3ee" }}>{p.toFixed(0)}</div>
                          <div style={{
                            width: "100%", height: h, minHeight: p > 0 ? 4 : 0,
                            background: p > 50 ? "#ef4444" : p > 20 ? "#f97316" : "#22d3ee",
                            borderRadius: "3px 3px 0 0", opacity: 0.8,
                          }} />
                          <div style={{ fontSize: 9, color: "#475569" }}>{dayNames[d.getDay()]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Análise de risco */}
                <div style={{
                  padding: 16, background: RISK_LEVELS[selData.risk].bg,
                  border: `1px solid ${RISK_LEVELS[selData.risk].color}44`, borderRadius: 6,
                }}>
                  <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, marginBottom: 8 }}>ANÁLISE DE RISCO — 7 DIAS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    {[
                      { label: "Precipitação acumulada", value: `${selData.precipAccum?.toFixed(0)} mm`, alert: selData.precipAccum > 80 },
                      { label: "Temperatura mínima",     value: `${selData.tempMin?.toFixed(1)}°C`,      alert: selData.tempMin < 5 },
                      { label: "Rajada máxima",          value: `${selData.windMax?.toFixed(0)} km/h`,   alert: selData.windMax > 50 },
                      { label: "La Niña (prob.)",        value: `${(selData.ninhaProbability * 100).toFixed(0)}%`, alert: selData.ninhaProbability > 0.4 },
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
              <div style={{ color: "#ef4444", fontSize: 12 }}>Dados não disponíveis.</div>
            )}
          </div>
        )}

        {/* ─── LAGOA DOS PATOS ─── */}
        {!loading && activeTab === "lagoa" && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 11, color: "#475569" }}>
              Monitoramento em 4 pontos estratégicos · Dados reais via ANA HidroWeb quando disponíveis
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {STATIONS.filter(s => s.type === "lagoa").map(station => {
                const d = stationData[station.id];
                if (!d?.lagoa) return null;
                const { atual, projetado7dias, isReal, normal, alerta, emergencia } = d.lagoa;
                const pctAtual = Math.min(100, (atual / 1.5) * 100);
                const pct7d = Math.min(100, (projetado7dias / 1.5) * 100);
                const cor = atual > emergencia ? "#ef4444" : atual > alerta ? "#f97316" : "#22c55e";

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
                          {station.anaCode && (
                            <span style={{ marginLeft: 8, color: isReal ? "#22c55e" : "#475569" }}>
                              {isReal ? "● Dado real ANA" : "○ Estimado (ANA indisponível)"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: RISK_LEVELS[d.risk].color, border: `1px solid ${RISK_LEVELS[d.risk].color}`, padding: "4px 10px", borderRadius: 4 }}>
                        {RISK_LEVELS[d.risk].icon} {RISK_LEVELS[d.risk].label}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, marginBottom: 8 }}>NÍVEL {isReal ? "REAL" : "ESTIMADO"}</div>
                        <div style={{ height: 8, background: "rgba(0,0,0,0.4)", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
                          <div style={{ height: "100%", width: `${pctAtual}%`, background: cor, borderRadius: 4 }} />
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: cor }}>{atual.toFixed(2)}m</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, marginBottom: 8 }}>PROJETADO (7 dias)</div>
                        <div style={{ height: 8, background: "rgba(0,0,0,0.4)", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
                          <div style={{
                            height: "100%", width: `${pct7d}%`,
                            background: projetado7dias > emergencia ? "#ef4444" : projetado7dias > alerta ? "#f97316" : "#22c55e",
                            borderRadius: 4,
                          }} />
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: projetado7dias > alerta ? "#f97316" : "#94a3b8" }}>
                          {projetado7dias.toFixed(2)}m
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {[
                        { label: "Normal",     value: `${normal}m`,     color: "#22c55e" },
                        { label: "Alerta",     value: `${alerta}m`,     color: "#f97316" },
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

                    {atual > alerta && (
                      <div style={{
                        marginTop: 12, padding: "10px 14px",
                        background: atual > emergencia ? "rgba(239,68,68,0.1)" : "rgba(249,115,22,0.1)",
                        border: `1px solid ${atual > emergencia ? "rgba(239,68,68,0.4)" : "rgba(249,115,22,0.4)"}`,
                        borderRadius: 4, fontSize: 11,
                        color: atual > emergencia ? "#fca5a5" : "#fdba74",
                      }}>
                        ⚠ Nível {isReal ? "real" : "estimado"} acima do threshold de {atual > emergencia ? "emergência" : "alerta"}.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ALERTAS ─── */}
        {!loading && activeTab === "alertas" && (
          <div>
            {allAlerts.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, background: "rgba(34,197,94,0.05)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 14, color: "#22c55e", letterSpacing: 2 }}>NENHUM ALERTA ATIVO</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {allAlerts.map((alert, idx) => {
                  const r = RISK_LEVELS[alert.risk_level];
                  return (
                    <div key={idx} style={{
                      padding: "14px 16px", background: r.bg,
                      border: `1px solid ${r.color}55`, borderLeft: `4px solid ${r.color}`, borderRadius: 6,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: r.color }}>
                          {r.icon} {r.label.toUpperCase()} — {alert.station_name}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {alert.source === "local" && (
                            <span style={{ fontSize: 9, color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)", padding: "2px 6px", borderRadius: 3 }}>LOCAL</span>
                          )}
                          <div style={{ fontSize: 10, color: "#475569" }}>
                            {new Date(alert.created_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{alert.message}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 20, padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 2, marginBottom: 10 }}>CANAIS DE NOTIFICAÇÃO</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                {[
                  { icon: "📱", name: "Push nativo (PWA)", status: "Ativo — botão no header", ready: true },
                  { icon: "📧", name: "E-mail (Resend)",   status: "Configurar",               ready: false },
                  { icon: "📢", name: "Defesa Civil RS",   status: "Webhook planejado",         ready: false },
                  { icon: "🔔", name: "Realtime Supabase", status: "Ativo",                    ready: true },
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

        {/* ─── FONTES DE DADOS ─── */}
        {activeTab === "apis" && (
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { name: "Open-Meteo",                    status: "ATIVO",     color: "#22c55e", desc: "Previsão meteorológica 7 dias: temperatura, precipitação, vento.", auth: "Gratuita, sem chave" },
              { name: "ANA HidroWeb — Telemetria",     status: "ATIVO",     color: "#22c55e", desc: "Nível real da Lagoa dos Patos (Rio Grande, Pelotas, Arambaré, Guaíba) — dado horário.", auth: "API pública, sem chave" },
              { name: "Supabase Realtime",              status: "ATIVO",     color: "#22c55e", desc: "Alertas em tempo real via WebSocket. Histórico persistido no banco.", auth: "Configurado" },
              { name: "INMET",                         status: "PLANEJADO", color: "#eab308", desc: "Estações automáticas RS. Séries históricas e tempo real.", auth: "API REST gratuita — token necessário" },
              { name: "CPTEC/INPE",                    status: "PLANEJADO", color: "#eab308", desc: "Índice ONI oficial — La Niña/El Niño. Previsão climática 30–90 dias.", auth: "API pública" },
              { name: "CEMADEN",                       status: "PLANEJADO", color: "#eab308", desc: "Municípios em risco: deslizamentos, enchentes, estiagem.", auth: "API pública" },
              { name: "AlertaRS / Defesa Civil RS",    status: "PLANEJADO", color: "#eab308", desc: "Boletins e avisos oficiais do Estado.", auth: "RSS / Webhook" },
              { name: "Copernicus Emergency (EU)",     status: "FUTURO",    color: "#8b5cf6", desc: "Imagens Sentinel-1/2 para análise de alagamentos por satélite.", auth: "Registro gratuito" },
            ].map(api => (
              <div key={api.name} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{api.name}</div>
                  <div style={{ fontSize: 9, padding: "2px 8px", border: `1px solid ${api.color}`, color: api.color, borderRadius: 3, letterSpacing: 2 }}>{api.status}</div>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{api.desc}</div>
                <div style={{ fontSize: 10, color: "#334155" }}>🔑 {api.auth}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 10, color: "#1e293b" }}>SENTINELA·RS v2.0 · Open-Meteo + ANA HidroWeb + Supabase Realtime</div>
          <div style={{ fontSize: 10, color: "#1e293b" }}>Atualização: 30 min · Push nativo PWA</div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        select option { background: #0f172a; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
      `}</style>
    </div>
  );
}
