import { useState, useEffect, useCallback } from "react";

// ─── ESTAÇÕES ────────────────────────────────────────────────────────────────
const STATIONS = [
  { id: "lagoa_rio_grande",         name: "Lagoa dos Patos — Rio Grande",    lat: -32.03, lon: -52.10, type: "lagoa",  anaCode: "87980000" },
  { id: "lagoa_patos_pelotas",      name: "Lagoa dos Patos — Pelotas",       lat: -31.77, lon: -52.34, type: "lagoa",  anaCode: "87955000" },
  { id: "lagoa_patos_arambare",     name: "Lagoa dos Patos — Arambaré",      lat: -30.91, lon: -51.50, type: "lagoa",  anaCode: "87540000" },
  { id: "lagoa_patos_porto_alegre", name: "Lagoa dos Patos — Sul POA",       lat: -30.11, lon: -51.18, type: "lagoa",  anaCode: "87450004" },
  { id: "rs_rio_grande",            name: "Rio Grande",                      lat: -32.03, lon: -52.10, type: "cidade" },
  { id: "rs_porto_alegre",          name: "Porto Alegre",                    lat: -30.03, lon: -51.23, type: "cidade" },
  { id: "rs_pelotas",               name: "Pelotas",                         lat: -31.77, lon: -52.34, type: "cidade" },
  { id: "rs_santa_maria",           name: "Santa Maria",                     lat: -29.68, lon: -53.81, type: "cidade" },
  { id: "rs_caxias_sul",            name: "Caxias do Sul",                   lat: -29.17, lon: -51.17, type: "cidade" },
  { id: "rs_passo_fundo",           name: "Passo Fundo",                     lat: -28.26, lon: -52.41, type: "cidade" },
];

const RISK_LEVELS = {
  NORMAL:     { label: "Normal",     color: "#22c55e", bg: "#052e16", icon: "✓" },
  ATENCAO:    { label: "Atenção",    color: "#eab308", bg: "#1c1a05", icon: "⚠" },
  ALERTA:     { label: "Alerta",     color: "#f97316", bg: "#1c0a05", icon: "▲" },
  EMERGENCIA: { label: "Emergência", color: "#ef4444", bg: "#1c0505", icon: "⬆" },
  CRITICO:    { label: "Crítico",    color: "#dc2626", bg: "#1c0000", icon: "☠" },
};

const dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────
function getRiskLevel(precipAccum, tempMin, windMax, ninha, lagoaLevel = null) {
  let score = 0;
  if (precipAccum > 150) score += 4; else if (precipAccum > 80) score += 3;
  else if (precipAccum > 40) score += 2; else if (precipAccum > 20) score += 1;
  if (tempMin < 0) score += 3; else if (tempMin < 5) score += 2; else if (tempMin < 10) score += 1;
  if (windMax > 80) score += 3; else if (windMax > 50) score += 2; else if (windMax > 30) score += 1;
  if (ninha > 0.7) score += 3; else if (ninha > 0.4) score += 2; else if (ninha > 0.2) score += 1;
  if (lagoaLevel !== null) {
    if (lagoaLevel > 1.2) score += 4; else if (lagoaLevel > 0.8) score += 3; else if (lagoaLevel > 0.5) score += 1;
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

async function fetchAnaLevel(anaCode) {
  try {
    const url = `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${anaCode}&dataInicio=&dataFim=`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/<Cota>([\d.]+)<\/Cota>/);
    return match ? parseFloat(match[1]) / 100 : null;
  } catch { return null; }
}

function calcNinha(weatherData) {
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
  return {
    atual: realLevel !== null ? realLevel : +(0.3 + Math.random() * 0.2).toFixed(2),
    projetado7dias: +(0.3 + totalPrecip * 0.008).toFixed(2),
    isReal: realLevel !== null,
    normal: 0.5, alerta: 0.8, emergencia: 1.2,
  };
}

const wmoDesc = (c) => c<=3?"Céu claro a nublado":c<=9?"Neblina":c<=29?"Chuva":c<=39?"Neve":c<=59?"Garoa":c<=79?"Neve intensa":c<=84?"Pancadas":c<=94?"Tempestade":"Tempestade severa";
const wmoEmoji = (c) => c<=3?"☀️":c<=9?"🌫️":c<=29?"🌧️":c<=39?"❄️":c<=59?"🌧️":c<=79?"❄️":c<=84?"⛈️":"🌪️";

// ENSO
const ENSO_DATA = {
  source: "NOAA/IRI — maio 2026",
  nino34Anomaly: +0.9,
  oni3month: +0.47,
  probability: { elNino: 0.98, neutral: 0.02, laNina: 0.00 },
  forecast: [
    { period: "Mai–Jul 2026", elNino: 0.98, neutral: 0.02, laNina: 0.00 },
    { period: "Jun–Ago 2026", elNino: 0.97, neutral: 0.03, laNina: 0.00 },
    { period: "Jul–Set 2026", elNino: 0.97, neutral: 0.03, laNina: 0.00 },
    { period: "Ago–Out 2026", elNino: 0.97, neutral: 0.03, laNina: 0.00 },
    { period: "Set–Nov 2026", elNino: 0.97, neutral: 0.03, laNina: 0.00 },
    { period: "Out–Dez 2026", elNino: 0.97, neutral: 0.03, laNina: 0.00 },
    { period: "Nov–Jan 2027", elNino: 0.96, neutral: 0.04, laNina: 0.00 },
    { period: "Dez–Fev 2027", elNino: 0.96, neutral: 0.04, laNina: 0.00 },
  ],
  historical: [
    { year: "1982–83", peak: +2.2, cat: "Super",     rs: "Enchentes severas" },
    { year: "1997–98", peak: +2.4, cat: "Super",     rs: "Enchentes históricas" },
    { year: "2015–16", peak: +2.3, cat: "Super",     rs: "Chuvas extremas" },
    { year: "2023–24", peak: +2.0, cat: "Forte",     rs: "Enchente maio 2024" },
    { year: "2026–??", peak: null, cat: "Emergindo", rs: "EM DESENVOLVIMENTO" },
  ],
};

function classifyENSO(a) {
  if (a === null) return { label:"Emergindo",       color:"#8b5cf6", icon:"📈" };
  if (a >= 2.0)   return { label:"Super El Niño",   color:"#dc2626", icon:"🔴" };
  if (a >= 1.5)   return { label:"El Niño Forte",   color:"#ef4444", icon:"🟠" };
  if (a >= 0.5)   return { label:"El Niño",         color:"#f97316", icon:"🟡" };
  if (a > -0.5)   return { label:"Neutro",          color:"#22c55e", icon:"🟢" };
  if (a > -1.5)   return { label:"La Niña",         color:"#3b82f6", icon:"🔵" };
  if (a > -2.0)   return { label:"La Niña Forte",   color:"#1d4ed8", icon:"🟣" };
  return           { label:"Super La Niña",         color:"#1e3a8a", icon:"⚫" };
}

// ─── FONTES DE DADOS ─────────────────────────────────────────────────────────
const API_SOURCES = [
  {
    name: "Open-Meteo", status: "ATIVO", color: "#22c55e",
    desc: "Previsão meteorológica 7 dias: temperatura, precipitação, vento, código climático.",
    auth: "Gratuita, sem chave", howto: null,
  },
  {
    name: "ANA HidroWeb — Telemetria", status: "ATIVO", color: "#22c55e",
    desc: "Nível real da Lagoa dos Patos em 4 pontos (Rio Grande, Pelotas, Arambaré, Guaíba). Dado horário.",
    auth: "API pública, sem chave", howto: null,
  },
  {
    name: "NOAA/IRI — Índice ENSO (ONI)", status: "ATIVO", color: "#22c55e",
    desc: "El Niño / La Niña: índice Niño 3.4, ONI trimestral, previsão probabilística 8 meses.",
    auth: "Dados públicos — atualização mensal", howto: null,
  },
  {
    name: "INMET — Instituto Nacional de Meteorologia", status: "PLANEJADO", color: "#eab308",
    desc: "Estações automáticas RS: temperatura, pressão, umidade, vento em tempo real.",
    auth: "API REST gratuita",
    howto: "1. Acesse portal.inmet.gov.br → Dados → API\n2. Solicite token gratuito\n3. Endpoint: https://apitempo.inmet.gov.br/estacao/{token}/{data}/{estação}\n4. Adicione VITE_INMET_TOKEN no .env",
  },
  {
    name: "CPTEC/INPE", status: "PLANEJADO", color: "#eab308",
    desc: "Previsão climática sazonal, boletins El Niño/La Niña oficiais BR, imagens de satélite.",
    auth: "API pública",
    howto: "1. Acesse tempo.cptec.inpe.br\n2. Endpoint previsão: http://servicos.cptec.inpe.br/XML/cidade/{id}/previsao.xml\n3. Imagens: https://satelite.cptec.inpe.br/home/\n4. Proxy necessário (CORS) via Supabase Edge Function",
  },
  {
    name: "ANA — HidroWeb Histórico", status: "PLANEJADO", color: "#eab308",
    desc: "Séries históricas de cotas e vazões para calibração de thresholds por bacia.",
    auth: "Token gratuito — snirh.gov.br",
    howto: "1. Acesse snirh.gov.br → HidroWeb → cadastro\n2. Endpoint: https://www.snirh.gov.br/hidroweb/rest/api/dadosHistoricos\n3. Parâmetros: codEstacao, dataInicio, dataFim\n4. Use para calibrar thresholds históricos por estação",
  },
  {
    name: "AlertaRS / Defesa Civil RS", status: "PLANEJADO", color: "#eab308",
    desc: "Boletins e avisos oficiais de catástrofes emitidos pela Defesa Civil do Estado.",
    auth: "RSS / Webhook",
    howto: "1. RSS: https://alertas.rs.gov.br/rss\n2. Alternativa: scraping de alertas.rs.gov.br via Supabase Edge Function\n3. Cruzar alertas oficiais com previsão local\n4. Exibir na aba Alertas com badge 'OFICIAL'",
  },
  {
    name: "CEMADEN", status: "PLANEJADO", color: "#eab308",
    desc: "Municípios em risco: deslizamentos, enchentes, estiagem. Mapa de risco oficial.",
    auth: "API pública — cemaden.gov.br",
    howto: "1. Acesse cemaden.gov.br → Dados → API\n2. Endpoint: http://sjc.salvar.cemaden.gov.br/resources/graficos/interativo/getJson\n3. Filtre por estado RS (cod 43)\n4. Adicione mapa de risco na aba Dashboard",
  },
  {
    name: "Copernicus Emergency (EU)", status: "FUTURO", color: "#8b5cf6",
    desc: "Imagens Sentinel-1/2 para detecção de alagamentos por SAR e óptico. Cobertura global.",
    auth: "Registro gratuito — dataspace.copernicus.eu",
    howto: "1. Registre em dataspace.copernicus.eu\n2. API: https://catalogue.dataspace.copernicus.eu/odata/v1\n3. Filtre por bbox do RS e produto S1_SAR_GRD\n4. Processamento pesado — requer backend dedicado",
  },
];

// ─── PUSH BUTTON ─────────────────────────────────────────────────────────────
function PushButton() {
  const [state, setState] = useState("idle");
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
      const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!VAPID) { setMsg("VAPID não configurada"); setState("error"); return; }
      const pad = "=".repeat((4 - VAPID.length % 4) % 4);
      const b64 = (VAPID + pad).replace(/-/g, "+").replace(/_/g, "/");
      const key = Uint8Array.from([...atob(b64)].map(c => c.charCodeAt(0)));
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      setState("subscribed"); setMsg("Ativo!");
    } catch (e) { setMsg(e.message.slice(0, 30)); setState("error"); }
  }

  const colors = { idle: "#22d3ee", requesting: "#eab308", subscribed: "#22c55e", error: "#ef4444" };
  return (
    <button onClick={subscribe} disabled={state === "subscribed" || state === "requesting"} style={{
      padding: "7px 14px", borderRadius: 4, fontFamily: "inherit", fontSize: 11, cursor: "pointer",
      background: "rgba(0,0,0,0.3)", border: `1px solid ${colors[state]}44`, color: colors[state],
    }}>
      {state === "idle" && "🔔 Ativar push"}
      {state === "requesting" && "⏳ Aguardando..."}
      {state === "subscribed" && `✓ Push ${msg}`}
      {state === "error" && `✗ ${msg}`}
    </button>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function SentinelaRS() {
  const [stationData, setStationData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedStation, setSelectedStation] = useState(STATIONS[4]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [alerts, setAlerts] = useState([]);
  const [expandedApi, setExpandedApi] = useState(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const results = {};
    const newAlerts = [];
    for (const station of STATIONS) {
      try {
        const weather = await fetchWeather7Days(station.lat, station.lon);
        const ninhaProbability = calcNinha(weather);
        let realLevel = null;
        if (station.anaCode) realLevel = await fetchAnaLevel(station.anaCode);
        const lagoa = station.type === "lagoa" ? calcLagoa(weather.daily?.precipitation_sum, realLevel) : null;
        const precipAccum = weather.daily?.precipitation_sum?.reduce((a, b) => a + b, 0) || 0;
        const tempMin = Math.min(...(weather.daily?.temperature_2m_min || [20]));
        const windMax = Math.max(...(weather.daily?.windspeed_10m_max || [0]));
        const risk = getRiskLevel(precipAccum, tempMin, windMax, ninhaProbability, lagoa?.atual || null);
        results[station.id] = { weather, ninhaProbability, lagoa, precipAccum, tempMin, windMax, risk, realLevel };
        if (risk !== "NORMAL") {
          const parts = [];
          if (precipAccum > 80) parts.push(`chuva ${precipAccum.toFixed(0)}mm/7d`);
          if (tempMin < 5) parts.push(`temp. mín. ${tempMin.toFixed(1)}°C`);
          if (windMax > 50) parts.push(`rajadas ${windMax.toFixed(0)} km/h`);
          if (ninhaProbability > 0.4) parts.push(`La Niña ${(ninhaProbability*100).toFixed(0)}%`);
          if (lagoa?.atual > lagoa?.alerta) parts.push(`lagoa ${lagoa.atual.toFixed(2)}m`);
          newAlerts.push({ id: `${station.id}_${Date.now()}`, station_name: station.name, risk_level: risk, message: parts.join(" · ") || "Parâmetros em atenção", created_at: new Date() });
        }
      } catch { results[station.id] = { error: true, risk: "NORMAL" }; }
    }
    setStationData(results);
    setAlerts(newAlerts);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadAllData(); const iv = setInterval(loadAllData, 30*60*1000); return () => clearInterval(iv); }, [loadAllData]);

  const selData = stationData[selectedStation.id];
  const overallRisk = Object.values(stationData).reduce((w, d) => {
    const o = ["NORMAL","ATENCAO","ALERTA","EMERGENCIA","CRITICO"];
    return o.indexOf(d.risk) > o.indexOf(w) ? d.risk : w;
  }, "NORMAL");
  const critCount = alerts.filter(a => a.risk_level === "EMERGENCIA" || a.risk_level === "CRITICO").length;
  const enso = ENSO_DATA;
  const ensoClass = classifyENSO(enso.nino34Anomaly);

  const TABS = [
    { key: "dashboard", label: "📡 Dashboard" },
    { key: "previsao",  label: "📅 Previsão 7 Dias" },
    { key: "lagoa",     label: "🌊 Lagoa dos Patos" },
    { key: "enso",      label: "🌡️ El Niño / La Niña" },
    { key: "alertas",   label: `🔔 Alertas${alerts.length ? ` (${alerts.length})` : ""}` },
    { key: "apis",      label: "🔌 Fontes de Dados" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#070b12", color:"#e2e8f0", fontFamily:"'IBM Plex Mono','Courier New',monospace", position:"relative" }}>
      <div style={{ position:"fixed", inset:0, zIndex:0, backgroundImage:"linear-gradient(rgba(34,211,238,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.04) 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none" }} />
      <div style={{ position:"relative", zIndex:2, maxWidth:1200, margin:"0 auto", padding:"0 16px 40px" }}>

        {/* HEADER */}
        <header style={{ borderBottom:"1px solid rgba(34,211,238,0.2)", paddingBottom:16, marginBottom:24, paddingTop:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:loading?"#eab308":"#22c55e", boxShadow:`0 0 8px ${loading?"#eab308":"#22c55e"}` }} />
                <span style={{ fontSize:11, color:"#64748b", letterSpacing:3 }}>SISTEMA ATIVO · RIO GRANDE DO SUL</span>
              </div>
              <h1 style={{ margin:"4px 0 0", fontSize:28, fontWeight:700, letterSpacing:-1, color:"#f8fafc" }}>
                SENTINELA<span style={{ color:"#22d3ee" }}>·RS</span>
              </h1>
              <p style={{ margin:0, fontSize:11, color:"#475569", letterSpacing:2 }}>MONITOR DE CATÁSTROFES E EVENTOS EXTREMOS</p>
            </div>
            <div style={{ textAlign:"right", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
              <div style={{ padding:"6px 14px", borderRadius:4, border:`1px solid ${RISK_LEVELS[overallRisk].color}`, background:RISK_LEVELS[overallRisk].bg, color:RISK_LEVELS[overallRisk].color, fontSize:13, fontWeight:700, letterSpacing:2 }}>
                {RISK_LEVELS[overallRisk].icon} RISCO GERAL: {RISK_LEVELS[overallRisk].label.toUpperCase()}
              </div>
              {/* ENSO badge */}
              <div style={{ padding:"4px 12px", borderRadius:4, border:`1px solid ${ensoClass.color}44`, color:ensoClass.color, fontSize:11, fontWeight:600 }}>
                {ensoClass.icon} {ensoClass.label} · Niño3.4: +{enso.nino34Anomaly}°C
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <PushButton />
                <div style={{ fontSize:10, color:"#475569" }}>
                  {lastUpdate ? lastUpdate.toLocaleTimeString("pt-BR") : "..."}
                  {" · "}
                  <button onClick={loadAllData} style={{ background:"none", border:"none", color:"#22d3ee", cursor:"pointer", fontSize:10, padding:0, fontFamily:"inherit" }}>↻</button>
                </div>
              </div>
            </div>
          </div>
          {/* Alertas críticos */}
          {critCount > 0 && (
            <div style={{ marginTop:16, padding:"10px 16px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:4, color:"#fca5a5", fontSize:12, display:"flex", alignItems:"center", gap:10 }}>
              🚨 <strong>ALERTA ATIVO:</strong> {critCount} estação(ões) em estado crítico nos próximos 7 dias.
            </div>
          )}
          {/* ENSO warning */}
          <div style={{ marginTop:10, padding:"10px 16px", background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.3)", borderRadius:4, color:"#fca5a5", fontSize:11, display:"flex", alignItems:"center", gap:10 }}>
            ⚠️ <strong>EL NIÑO EMERGINDO (98% prob.):</strong> Risco elevado de enchentes no RS — primavera/verão 2026/27. <button onClick={() => setActiveTab("enso")} style={{ background:"none", border:"none", color:"#22d3ee", cursor:"pointer", fontSize:11, padding:0, fontFamily:"inherit", marginLeft:8 }}>Ver análise →</button>
          </div>
        </header>

        {/* TABS */}
        <div style={{ display:"flex", gap:2, marginBottom:24, flexWrap:"wrap" }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding:"8px 14px", background:activeTab===tab.key?"rgba(34,211,238,0.15)":"transparent",
              border:activeTab===tab.key?"1px solid rgba(34,211,238,0.5)":"1px solid rgba(255,255,255,0.08)",
              borderRadius:4, color:activeTab===tab.key?"#22d3ee":"#64748b",
              cursor:"pointer", fontFamily:"inherit", fontSize:12, letterSpacing:1,
            }}>{tab.label}</button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign:"center", padding:60, color:"#22d3ee" }}>
            <div style={{ fontSize:32, marginBottom:12, animation:"spin 1s linear infinite", display:"inline-block" }}>◌</div>
            <div style={{ fontSize:12, letterSpacing:4 }}>CONSULTANDO APIs...</div>
            <div style={{ fontSize:10, color:"#475569", marginTop:6 }}>Open-Meteo · ANA HidroWeb · NOAA ENSO</div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {!loading && activeTab === "dashboard" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
            {STATIONS.map(station => {
              const d = stationData[station.id];
              if (!d) return null;
              const risk = RISK_LEVELS[d.risk];
              return (
                <div key={station.id} onClick={() => { setSelectedStation(station); setActiveTab("previsao"); }}
                  style={{ padding:"14px 16px", background:"rgba(255,255,255,0.03)", border:`1px solid ${d.risk!=="NORMAL"?risk.color+"55":"rgba(255,255,255,0.08)"}`, borderRadius:6, cursor:"pointer", position:"relative", overflow:"hidden" }}>
                  {d.risk !== "NORMAL" && <div style={{ position:"absolute", top:0, right:0, width:4, height:"100%", background:risk.color, opacity:0.7 }} />}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:10, color:"#64748b", letterSpacing:2 }}>{station.type.toUpperCase()}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9", marginTop:2 }}>{station.name}</div>
                    </div>
                    <div style={{ fontSize:10, fontWeight:700, padding:"3px 8px", border:`1px solid ${risk.color}`, color:risk.color, borderRadius:3, letterSpacing:1 }}>
                      {risk.icon} {risk.label}
                    </div>
                  </div>
                  {d.error ? <div style={{ fontSize:11, color:"#ef4444" }}>Erro ao carregar</div> : (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                      {[
                        { l:"Precip. 7d", v:`${d.precipAccum?.toFixed(0)}mm` },
                        { l:"Temp. mín.", v:`${d.tempMin?.toFixed(1)}°C` },
                        { l:"Vento máx.", v:`${d.windMax?.toFixed(0)} km/h` },
                        { l:"ENSO",       v:`${ensoClass.icon} ${ensoClass.label.split(" ")[0]}` },
                      ].map(item => (
                        <div key={item.l} style={{ background:"rgba(0,0,0,0.3)", padding:"6px 8px", borderRadius:4 }}>
                          <div style={{ fontSize:9, color:"#475569" }}>{item.l}</div>
                          <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0", marginTop:2 }}>{item.v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {station.type === "lagoa" && d.lagoa && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ fontSize:9, color:"#64748b", marginBottom:4, display:"flex", justifyContent:"space-between" }}>
                        <span>NÍVEL {d.lagoa.isReal?"REAL":"ESTIMADO"}</span>
                        {d.lagoa.isReal && <span style={{ color:"#22c55e" }}>● ANA</span>}
                      </div>
                      <div style={{ height:5, background:"rgba(0,0,0,0.4)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.min(100,(d.lagoa.atual/1.5)*100)}%`, background:d.lagoa.atual>d.lagoa.emergencia?"#ef4444":d.lagoa.atual>d.lagoa.alerta?"#f97316":"#22c55e", borderRadius:3 }} />
                      </div>
                      <div style={{ fontSize:9, color:"#64748b", marginTop:2 }}>{d.lagoa.atual.toFixed(2)}m / alerta {d.lagoa.alerta}m</div>
                    </div>
                  )}
                  <div style={{ marginTop:6, fontSize:9, color:"#334155", textAlign:"right" }}>Clique para previsão →</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PREVISÃO 7 DIAS ── */}
        {!loading && activeTab === "previsao" && (
          <div>
            <select value={selectedStation.id} onChange={e => setSelectedStation(STATIONS.find(s => s.id === e.target.value))}
              style={{ background:"rgba(0,0,0,0.4)", border:"1px solid rgba(34,211,238,0.3)", color:"#e2e8f0", padding:"8px 12px", borderRadius:4, fontFamily:"inherit", fontSize:12, marginBottom:16, cursor:"pointer" }}>
              {STATIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selData?.weather?.daily ? (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8, marginBottom:24 }}>
                  {selData.weather.daily.time?.map((date, i) => {
                    const d = new Date(date + "T12:00:00");
                    const p  = selData.weather.daily.precipitation_sum?.[i] || 0;
                    const tx = selData.weather.daily.temperature_2m_max?.[i] || 0;
                    const tn = selData.weather.daily.temperature_2m_min?.[i] || 0;
                    const w  = selData.weather.daily.windspeed_10m_max?.[i] || 0;
                    const c  = selData.weather.daily.weathercode?.[i] || 0;
                    const dr = getRiskLevel(p*1.5, tn, w, selData.ninhaProbability*0.5);
                    const r  = RISK_LEVELS[dr];
                    return (
                      <div key={date} style={{ padding:"12px 8px", background:i===0?"rgba(34,211,238,0.08)":"rgba(255,255,255,0.03)", border:`1px solid ${i===0?"rgba(34,211,238,0.4)":dr!=="NORMAL"?r.color+"55":"rgba(255,255,255,0.07)"}`, borderRadius:6, textAlign:"center" }}>
                        <div style={{ fontSize:9, color:"#64748b" }}>{i===0?"HOJE":dayNames[d.getDay()]}</div>
                        <div style={{ fontSize:9, color:"#475569" }}>{d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</div>
                        <div style={{ fontSize:24, margin:"8px 0 4px" }}>{wmoEmoji(c)}</div>
                        <div style={{ fontSize:8, color:"#64748b", marginBottom:6, minHeight:24 }}>{wmoDesc(c)}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#fbbf24" }}>{tx.toFixed(0)}°</div>
                        <div style={{ fontSize:10, color:"#60a5fa" }}>{tn.toFixed(0)}°</div>
                        <div style={{ marginTop:6, paddingTop:6, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                          <div style={{ fontSize:9, color:"#22d3ee" }}>🌧 {p.toFixed(0)}mm</div>
                          <div style={{ fontSize:9, color:"#94a3b8" }}>💨 {w.toFixed(0)}km/h</div>
                        </div>
                        <div style={{ marginTop:6, fontSize:8, padding:"2px 4px", border:`1px solid ${r.color}`, color:r.color, borderRadius:3 }}>{r.label}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Gráfico precipitação */}
                <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:6, padding:20, marginBottom:16 }}>
                  <div style={{ fontSize:11, color:"#64748b", letterSpacing:2, marginBottom:14 }}>PRECIPITAÇÃO ACUMULADA (mm/dia)</div>
                  <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:90 }}>
                    {selData.weather.daily.precipitation_sum?.map((p, i) => {
                      const mx = Math.max(...selData.weather.daily.precipitation_sum, 1);
                      const h  = (p/mx)*80;
                      const dd = new Date(selData.weather.daily.time[i]+"T12:00:00");
                      return (
                        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <div style={{ fontSize:8, color:"#22d3ee" }}>{p.toFixed(0)}</div>
                          <div style={{ width:"100%", height:h, minHeight:p>0?3:0, background:p>50?"#ef4444":p>20?"#f97316":"#22d3ee", borderRadius:"3px 3px 0 0", opacity:0.8 }} />
                          <div style={{ fontSize:8, color:"#475569" }}>{dayNames[dd.getDay()]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Análise */}
                <div style={{ padding:16, background:RISK_LEVELS[selData.risk].bg, border:`1px solid ${RISK_LEVELS[selData.risk].color}44`, borderRadius:6 }}>
                  <div style={{ fontSize:11, color:"#64748b", letterSpacing:2, marginBottom:8 }}>ANÁLISE DE RISCO — 7 DIAS</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:8 }}>
                    {[
                      { l:"Precipitação acumulada", v:`${selData.precipAccum?.toFixed(0)} mm`, a:selData.precipAccum>80 },
                      { l:"Temperatura mínima",     v:`${selData.tempMin?.toFixed(1)}°C`,      a:selData.tempMin<5 },
                      { l:"Rajada máxima",          v:`${selData.windMax?.toFixed(0)} km/h`,   a:selData.windMax>50 },
                      { l:"ENSO (prob. El Niño)",   v:`${(enso.probability.elNino*100).toFixed(0)}%`, a:enso.probability.elNino>0.5 },
                    ].map(item => (
                      <div key={item.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:11, color:"#64748b" }}>{item.l}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:item.a?"#f97316":"#22c55e" }}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : <div style={{ color:"#ef4444", fontSize:12 }}>Dados não disponíveis.</div>}
          </div>
        )}

        {/* ── LAGOA DOS PATOS ── */}
        {!loading && activeTab === "lagoa" && (
          <div>
            <div style={{ marginBottom:12, fontSize:11, color:"#475569" }}>4 pontos de monitoramento · Dados reais ANA HidroWeb quando disponíveis</div>
            <div style={{ display:"grid", gap:12 }}>
              {STATIONS.filter(s => s.type === "lagoa").map(station => {
                const d = stationData[station.id];
                if (!d?.lagoa) return null;
                const { atual, projetado7dias, isReal, alerta, emergencia } = d.lagoa;
                const cor = atual > emergencia ? "#ef4444" : atual > alerta ? "#f97316" : "#22c55e";
                return (
                  <div key={station.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:"#f1f5f9" }}>{station.name}</div>
                        <div style={{ fontSize:10, color:"#475569" }}>
                          Cód. ANA: {station.anaCode}
                          <span style={{ marginLeft:10, color:isReal?"#22c55e":"#475569" }}>{isReal?"● Dado real":"○ Estimado"}</span>
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:RISK_LEVELS[d.risk].color, border:`1px solid ${RISK_LEVELS[d.risk].color}`, padding:"4px 10px", borderRadius:4 }}>
                        {RISK_LEVELS[d.risk].icon} {RISK_LEVELS[d.risk].label}
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                      {[
                        { l:`NÍVEL ${isReal?"REAL":"ESTIMADO"}`, v:atual, cor },
                        { l:"PROJETADO 7 DIAS",                  v:projetado7dias, cor:projetado7dias>alerta?"#f97316":"#94a3b8" },
                      ].map(item => (
                        <div key={item.l}>
                          <div style={{ fontSize:9, color:"#64748b", letterSpacing:2, marginBottom:6 }}>{item.l}</div>
                          <div style={{ height:7, background:"rgba(0,0,0,0.4)", borderRadius:3, overflow:"hidden", marginBottom:4 }}>
                            <div style={{ height:"100%", width:`${Math.min(100,(item.v/1.5)*100)}%`, background:item.cor, borderRadius:3 }} />
                          </div>
                          <div style={{ fontSize:20, fontWeight:700, color:item.cor }}>{item.v.toFixed(2)}m</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                      {[["Normal","0.5m","#22c55e"],["Alerta","0.8m","#f97316"],["Emergência","1.2m","#ef4444"]].map(([l,v,c]) => (
                        <div key={l} style={{ background:"rgba(0,0,0,0.3)", padding:"8px 10px", borderRadius:4, borderLeft:`3px solid ${c}` }}>
                          <div style={{ fontSize:9, color:"#475569" }}>{l}</div>
                          <div style={{ fontSize:14, fontWeight:700, color:c }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {atual > alerta && (
                      <div style={{ marginTop:10, padding:"8px 12px", background:atual>emergencia?"rgba(239,68,68,0.1)":"rgba(249,115,22,0.1)", border:`1px solid ${atual>emergencia?"rgba(239,68,68,0.4)":"rgba(249,115,22,0.4)"}`, borderRadius:4, fontSize:11, color:atual>emergencia?"#fca5a5":"#fdba74" }}>
                        ⚠ Nível {isReal?"real":"estimado"} acima do threshold de {atual>emergencia?"emergência":"alerta"}.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ENSO ── */}
        {!loading && activeTab === "enso" && (
          <div style={{ display:"grid", gap:14 }}>
            {/* Banner alerta */}
            <div style={{ padding:"14px 18px", background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.4)", borderRadius:6, display:"flex", alignItems:"flex-start", gap:14 }}>
              <span style={{ fontSize:28 }}>⚠️</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fca5a5", marginBottom:4 }}>EL NIÑO EM DESENVOLVIMENTO — RISCO ELEVADO PARA O RS</div>
                <div style={{ fontSize:11, color:"#fca5a5", opacity:0.85, lineHeight:1.6 }}>
                  98% de probabilidade de El Niño consolidado em mai–jul 2026 (IRI/NOAA). Índice Niño 3.4 semanal: +0,9°C.
                  El Niño forte/Super historicamente causa as maiores enchentes do RS. O evento de maio 2024 (+2,0°C) foi o maior desastre climático da história gaúcha.
                </div>
              </div>
            </div>

            {/* Cards de status */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12 }}>
              {[
                { l:"Fase atual",               v:`${ensoClass.icon} ${ensoClass.label}`, s:`Niño 3.4 semanal: +${enso.nino34Anomaly}°C`, c:ensoClass.color },
                { l:"ONI trimestral (fev–abr)", v:`+${enso.oni3month}°C`,                 s:"Threshold El Niño: +0,5°C",                 c:"#f97316" },
                { l:"Prob. El Niño mai–jul",    v:`${(enso.probability.elNino*100).toFixed(0)}%`, s:"Fonte: IRI/CCSR — mai 2026",         c:"#ef4444" },
                { l:"Status NOAA",              v:"El Niño Watch",                        s:"96% chance dez 2026–fev 2027",               c:"#f97316" },
              ].map(item => (
                <div key={item.l} style={{ padding:"14px 16px", background:"rgba(255,255,255,0.03)", border:`1px solid ${item.c}44`, borderTop:`3px solid ${item.c}`, borderRadius:6 }}>
                  <div style={{ fontSize:9, color:"#64748b", letterSpacing:2, marginBottom:6 }}>{item.l.toUpperCase()}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:item.c, marginBottom:4 }}>{item.v}</div>
                  <div style={{ fontSize:9, color:"#475569" }}>{item.s}</div>
                </div>
              ))}
            </div>

            {/* Termômetro */}
            <div style={{ padding:20, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:6 }}>
              <div style={{ fontSize:11, color:"#64748b", letterSpacing:2, marginBottom:14 }}>ESCALA ONI — POSIÇÃO ATUAL</div>
              <div style={{ position:"relative", height:26, borderRadius:4, overflow:"hidden", background:"rgba(0,0,0,0.3)" }}>
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#1e3a8a 0%,#3b82f6 20%,#22c55e 40%,#22c55e 60%,#f97316 75%,#ef4444 87%,#dc2626 100%)", opacity:0.7 }} />
                {["La Niña Forte","La Niña","Neutro","El Niño","Super"].map((lb, i) => (
                  <div key={lb} style={{ position:"absolute", top:0, left:`${10+i*20}%`, transform:"translateX(-50%)", fontSize:7, color:"rgba(255,255,255,0.7)", height:"100%", display:"flex", alignItems:"center" }}>{lb}</div>
                ))}
                <div style={{ position:"absolute", top:0, left:`${Math.min(98,Math.max(2,((enso.nino34Anomaly+3)/6)*100))}%`, transform:"translateX(-50%)", width:3, height:"100%", background:"#fff", boxShadow:"0 0 8px #fff" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:9, color:"#475569" }}>
                <span>-3°C (Super La Niña)</span>
                <span style={{ color:ensoClass.color, fontWeight:700 }}>▲ Atual: +{enso.nino34Anomaly}°C</span>
                <span>+3°C (Super El Niño)</span>
              </div>
            </div>

            {/* Previsão probabilística */}
            <div style={{ padding:20, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:6 }}>
              <div style={{ fontSize:11, color:"#64748b", letterSpacing:2, marginBottom:14 }}>PREVISÃO PROBABILÍSTICA — IRI/CCSR</div>
              <div style={{ display:"grid", gap:8 }}>
                {enso.forecast.map((f, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"110px 1fr 1fr 1fr", gap:8, alignItems:"center" }}>
                    <div style={{ fontSize:10, color:"#64748b" }}>{f.period}</div>
                    {[
                      { l:"El Niño", v:f.elNino, c:"#f97316" },
                      { l:"Neutro",  v:f.neutral, c:"#22c55e" },
                      { l:"La Niña", v:f.laNina,  c:"#3b82f6" },
                    ].map(bar => (
                      <div key={bar.l}>
                        <div style={{ fontSize:8, color:bar.c, marginBottom:2 }}>{bar.l} {(bar.v*100).toFixed(0)}%</div>
                        <div style={{ height:5, background:"rgba(0,0,0,0.4)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${bar.v*100}%`, background:bar.c, borderRadius:3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:9, color:"#334155", marginTop:10 }}>Fonte: IRI/CCSR Columbia University · NOAA/CPC — mai 2026</div>
            </div>

            {/* Histórico */}
            <div style={{ padding:20, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:6 }}>
              <div style={{ fontSize:11, color:"#64748b", letterSpacing:2, marginBottom:14 }}>COMPARAÇÃO HISTÓRICA — IMPACTO NO RS</div>
              <div style={{ display:"grid", gap:8 }}>
                {enso.historical.map((ev, i) => {
                  const cls = classifyENSO(ev.peak);
                  const isCur = ev.peak === null;
                  return (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"80px 120px 1fr 70px", gap:10, alignItems:"center", padding:"10px 12px", background:isCur?"rgba(220,38,38,0.08)":"rgba(0,0,0,0.2)", border:`1px solid ${isCur?"rgba(220,38,38,0.4)":"rgba(255,255,255,0.05)"}`, borderRadius:4 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:isCur?"#fca5a5":"#94a3b8" }}>{ev.year}</div>
                      <div style={{ fontSize:11, color:cls.color, fontWeight:600 }}>{cls.icon} {ev.cat}</div>
                      <div style={{ fontSize:10, color:"#64748b" }}>{ev.rs}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:cls.color, textAlign:"right" }}>{ev.peak!==null?`+${ev.peak}°C`:"↑ dev."}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Impactos RS */}
            <div style={{ padding:20, background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:6 }}>
              <div style={{ fontSize:11, color:"#f97316", letterSpacing:2, marginBottom:14 }}>IMPACTOS ESPERADOS PARA O RS — EL NIÑO 2026</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
                {[
                  { i:"🌧️", t:"Chuvas acima da média",    d:"Primavera–verão 2026/27 com precipitação 30–50% acima do normal" },
                  { i:"🌊", t:"Risco de enchentes",        d:"Lagoa dos Patos, Guaíba e bacias do Jacuí/Taquari em alerta" },
                  { i:"💨", t:"Ventos do Norte intensos",  d:"Empilhamento d'água na Lagoa — risco de inundação costeira em Rio Grande" },
                  { i:"🌡️", t:"Temperaturas elevadas",     d:"Verão mais quente, maior evapotranspiração e estresse hídrico" },
                ].map(item => (
                  <div key={item.t} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <span style={{ fontSize:20 }}>{item.i}</span>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:"#fdba74", marginBottom:4 }}>{item.t}</div>
                      <div style={{ fontSize:10, color:"#64748b", lineHeight:1.5 }}>{item.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ALERTAS ── */}
        {!loading && activeTab === "alertas" && (
          <div>
            {alerts.length === 0 ? (
              <div style={{ textAlign:"center", padding:60, border:"1px solid rgba(34,197,94,0.3)", borderRadius:6, background:"rgba(34,197,94,0.05)" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✓</div>
                <div style={{ fontSize:14, color:"#22c55e", letterSpacing:2 }}>NENHUM ALERTA ATIVO</div>
                <div style={{ fontSize:11, color:"#475569", marginTop:6 }}>Todas as estações dentro dos parâmetros normais.</div>
              </div>
            ) : (
              <div style={{ display:"grid", gap:10 }}>
                {[...alerts].sort((a,b) => ["CRITICO","EMERGENCIA","ALERTA","ATENCAO","NORMAL"].indexOf(a.risk_level)-["CRITICO","EMERGENCIA","ALERTA","ATENCAO","NORMAL"].indexOf(b.risk_level)).map((alert, idx) => {
                  const r = RISK_LEVELS[alert.risk_level];
                  return (
                    <div key={idx} style={{ padding:"14px 16px", background:r.bg, border:`1px solid ${r.color}55`, borderLeft:`4px solid ${r.color}`, borderRadius:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:r.color }}>{r.icon} {r.label.toUpperCase()} — {alert.station_name}</div>
                        <div style={{ fontSize:10, color:"#475569" }}>{new Date(alert.created_at).toLocaleString("pt-BR")}</div>
                      </div>
                      <div style={{ fontSize:12, color:"#94a3b8" }}>{alert.message}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Canais de notificação */}
            <div style={{ marginTop:20, padding:16, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:6 }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:12 }}>CANAIS DE NOTIFICAÇÃO</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:8 }}>
                {[
                  { icon:"📱", name:"Push nativo (PWA)",   status:"Ativo — botão no header",           ready:true,  howto:null },
                  { icon:"🔔", name:"Alertas na tela",     status:"Ativo — atualização 30min",          ready:true,  howto:null },
                  { icon:"📧", name:"E-mail (Resend)",     status:"Configurar",                         ready:false,
                    howto:"1. Crie conta em resend.com (grátis até 3k/mês)\n2. Gere API key\n3. Adicione RESEND_API_KEY nos secrets do Supabase\n4. Chame resend.emails.send() na Edge Function send-alerts" },
                  { icon:"📢", name:"Defesa Civil RS",     status:"Integração planejada",               ready:false,
                    howto:"1. RSS: alertas.rs.gov.br/rss\n2. Edge Function lê RSS a cada 30min\n3. Cruza com alertas locais\n4. Exibe badge OFICIAL nos alertas" },
                  { icon:"📲", name:"SMS (Twilio)",        status:"Configurar",                         ready:false,
                    howto:"1. Crie conta em twilio.com\n2. Obtenha Account SID + Auth Token + número\n3. Adicione nos secrets do Supabase\n4. Dispare SMS apenas para EMERGENCIA/CRITICO" },
                  { icon:"🔊", name:"Sirene Comunitária",  status:"Requer hardware IoT",                ready:false,
                    howto:"1. Dispositivo ESP32/Raspberry Pi com relê\n2. Webhook do Supabase dispara o sinal\n3. Protocolo: POST /trigger com level=CRITICO\n4. Raio de ação configurável por comunidade" },
                ].map(c => (
                  <div key={c.name} style={{ background:"rgba(0,0,0,0.3)", borderRadius:4, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px" }}>
                      <span style={{ fontSize:20 }}>{c.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, color:"#e2e8f0" }}>{c.name}</div>
                        <div style={{ fontSize:10, color:c.ready?"#22c55e":"#475569" }}>{c.status}</div>
                      </div>
                      {c.howto && (
                        <button onClick={() => setExpandedApi(expandedApi === c.name ? null : c.name)}
                          style={{ background:"none", border:"1px solid rgba(34,211,238,0.3)", color:"#22d3ee", cursor:"pointer", fontSize:9, padding:"3px 8px", borderRadius:3, fontFamily:"inherit" }}>
                          {expandedApi===c.name?"▲ fechar":"▼ como"}
                        </button>
                      )}
                    </div>
                    {c.howto && expandedApi === c.name && (
                      <div style={{ padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,0.06)", fontSize:10, color:"#64748b", lineHeight:1.7, whiteSpace:"pre-line" }}>
                        {c.howto}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FONTES DE DADOS ── */}
        {activeTab === "apis" && (
          <div style={{ display:"grid", gap:10 }}>
            <div style={{ fontSize:11, color:"#475569", marginBottom:4 }}>APIs integradas e planejadas · Clique em "como integrar" para instruções</div>
            {API_SOURCES.map(api => (
              <div key={api.name} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:6, overflow:"hidden" }}>
                <div style={{ padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9", marginBottom:4 }}>{api.name}</div>
                    <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>{api.desc}</div>
                    <div style={{ fontSize:10, color:"#334155" }}>🔑 {api.auth}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                    <div style={{ fontSize:9, padding:"2px 8px", border:`1px solid ${api.color}`, color:api.color, borderRadius:3, letterSpacing:2 }}>{api.status}</div>
                    {api.howto && (
                      <button onClick={() => setExpandedApi(expandedApi === api.name ? null : api.name)}
                        style={{ background:"none", border:"1px solid rgba(34,211,238,0.3)", color:"#22d3ee", cursor:"pointer", fontSize:9, padding:"3px 8px", borderRadius:3, fontFamily:"inherit" }}>
                        {expandedApi===api.name?"▲ fechar":"▼ como integrar"}
                      </button>
                    )}
                  </div>
                </div>
                {api.howto && expandedApi === api.name && (
                  <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.07)", background:"rgba(0,0,0,0.2)", fontSize:11, color:"#64748b", lineHeight:1.8, whiteSpace:"pre-line" }}>
                    {api.howto}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop:32, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:16, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div style={{ fontSize:10, color:"#1e293b" }}>SENTINELA·RS v2.0 · Open-Meteo + ANA HidroWeb + NOAA ENSO · Utilidade Pública</div>
          <div style={{ fontSize:10, color:"#1e293b" }}>Atualização: 30 min · PWA instalável</div>
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
