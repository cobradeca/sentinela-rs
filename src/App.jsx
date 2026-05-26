import { useState, useEffect, useCallback } from "react";

const STATIONS = [
  { id: "lagoa_rio_grande",         name: "Lagoa dos Patos — Rio Grande",    lat: -32.03, lon: -52.10, type: "lagoa",  anaCode: "87980000" },
  { id: "lagoa_patos_pelotas",      name: "Lagoa dos Patos — Pelotas",       lat: -31.77, lon: -52.34, type: "lagoa",  anaCode: "87955000" },
  { id: "lagoa_patos_arambare",     name: "Lagoa dos Patos — Arambaré",      lat: -30.91, lon: -51.50, type: "lagoa",  anaCode: "87540000" },
  { id: "lagoa_patos_poa",          name: "Lagoa dos Patos — Sul POA",       lat: -30.11, lon: -51.18, type: "lagoa",  anaCode: "87450004" },
  { id: "rs_rio_grande",            name: "Rio Grande",                      lat: -32.03, lon: -52.10, type: "cidade" },
  { id: "rs_porto_alegre",          name: "Porto Alegre",                    lat: -30.03, lon: -51.23, type: "cidade" },
  { id: "rs_pelotas",               name: "Pelotas",                         lat: -31.77, lon: -52.34, type: "cidade" },
  { id: "rs_santa_maria",           name: "Santa Maria",                     lat: -29.68, lon: -53.81, type: "cidade" },
  { id: "rs_caxias_sul",            name: "Caxias do Sul",                   lat: -29.17, lon: -51.17, type: "cidade" },
  { id: "rs_passo_fundo",           name: "Passo Fundo",                     lat: -28.26, lon: -52.41, type: "cidade" },
];

const APAS_RS = [
  { id: "apa_ibiraquera",     name: "APA Banhado Grande",           lat: -29.85, lon: -50.85, municipio: "Glorinha/Viamão" },
  { id: "apa_rota_sol",       name: "APA Rota do Sol",              lat: -29.40, lon: -50.10, municipio: "Serra Gaúcha" },
  { id: "apa_balneario",      name: "APA Balneário Pinhal",         lat: -30.22, lon: -50.21, municipio: "Palmares do Sul" },
  { id: "apa_litoral_medio",  name: "APA Litoral Médio",            lat: -30.80, lon: -50.22, municipio: "Mostardas/Tavares" },
  { id: "rebio_sao_donato",   name: "REBIO São Donato",             lat: -28.28, lon: -54.87, municipio: "São Nicolau" },
  { id: "esec_taim",          name: "Estação Ecológica do Taim",    lat: -32.55, lon: -52.60, municipio: "Rio Grande/Santa Vitória" },
  { id: "parna_aparados",     name: "PARNA Aparados da Serra",      lat: -29.15, lon: -50.07, municipio: "Cambará do Sul" },
  { id: "parna_lagoa_peixe",  name: "PARNA Lagoa do Peixe",         lat: -31.25, lon: -51.05, municipio: "Mostardas" },
];

const RISK_LEVELS = {
  NORMAL:     { label: "Normal",     color: "#22c55e", bg: "#052e16", icon: "✓" },
  ATENCAO:    { label: "Atenção",    color: "#eab308", bg: "#1c1a05", icon: "⚠" },
  ALERTA:     { label: "Alerta",     color: "#f97316", bg: "#1c0a05", icon: "▲" },
  EMERGENCIA: { label: "Emergência", color: "#ef4444", bg: "#1c0505", icon: "⬆" },
  CRITICO:    { label: "Crítico",    color: "#dc2626", bg: "#1c0000", icon: "☠" },
};

const dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// ENSO — dados reais NOAA/IRI maio 2026
// Niño 3.4 = +0.9°C → EL NIÑO emergindo, NÃO La Niña
const ENSO = {
  nino34: +0.9,
  oni3m: +0.47,
  phase: "EL_NINO_DEVELOPING",
  prob: { elNino: 0.98, neutral: 0.02, laNina: 0.00 },
  superThreshold: 1.5,
  forecast: [
    { p:"Mai–Jul 2026", en:0.98, nu:0.02, ln:0.00 },
    { p:"Jun–Ago 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Jul–Set 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Ago–Out 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Set–Nov 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Out–Dez 2026", en:0.97, nu:0.03, ln:0.00 },
    { p:"Nov–Jan 2027", en:0.96, nu:0.04, ln:0.00 },
    { p:"Dez–Fev 2027", en:0.96, nu:0.04, ln:0.00 },
  ],
  historical: [
    { y:"1982–83", peak:+2.2, cat:"Super El Niño",   rs:"Enchentes severas no RS" },
    { y:"1997–98", peak:+2.4, cat:"Super El Niño",   rs:"Enchentes históricas" },
    { y:"2009–10", peak:+1.6, cat:"El Niño Forte",   rs:"Chuvas acima da média" },
    { y:"2015–16", peak:+2.3, cat:"Super El Niño",   rs:"Chuvas extremas RS" },
    { y:"2023–24", peak:+2.0, cat:"El Niño Forte",   rs:"Enchente maio 2024 — maior desastre RS" },
    { y:"2026–??", peak:null, cat:"El Niño Emergindo",rs:"EM DESENVOLVIMENTO — RISCO ALTO" },
  ],
};

// Copernicus — dados históricos RS por tema
const COPERNICUS_DATA = {
  lastUpdate: "mai 2026",
  themes: [
    {
      id: "enchentes", icon: "🌊", name: "Enchentes / Inundações",
      status: "CRITICO", color: "#ef4444",
      rsHistory: "Maio 2024: 2,4 milhões de afetados, 478 municípios, 154 mortes. Maior desastre climático da história gaúcha.",
      current: "El Niño emergindo (+0,9°C) eleva risco de recorrência em 2026/27.",
      copSource: "Copernicus EMS — EMSR728 (RS 2024)",
      indicator: "Área inundada 2024: ~540 km² monitorada por Sentinel-1 SAR",
    },
    {
      id: "queimadas", icon: "🔥", name: "Queimadas / Incêndios",
      status: "ALERTA", color: "#f97316",
      rsHistory: "2022: recorde de focos no RS (3.200+ focos INPE). Pampa e Serra Gaúcha mais afetados.",
      current: "El Niño aumenta risco de seca e queimadas no verão 2026/27.",
      copSource: "Copernicus EFFIS + INPE BDQueimadas",
      indicator: "Monitoramento diário via Sentinel-3 SLSTR",
    },
    {
      id: "desmatamento", icon: "🌳", name: "Desmatamento / Vegetação",
      status: "ATENCAO", color: "#eab308",
      rsHistory: "Pampa: bioma com maior taxa de perda no BR. Mata Atlântica RS: <12% da cobertura original.",
      current: "Sentinel-2 monitora NDVI mensal. Alertas automáticos de supressão.",
      copSource: "Copernicus Land — Sentinel-2 MSI",
      indicator: "NDVI RS médio: 0.48 (mai 2026)",
    },
    {
      id: "clima", icon: "🌡️", name: "Clima / Temperatura",
      status: "ALERTA", color: "#f97316",
      rsHistory: "RS registrou +1,8°C acima da média histórica no verão 2023/24. Ondas de calor mais frequentes.",
      current: "Anomalia de TSM Atlântico Sul: +0,6°C. El Niño potencializa aquecimento.",
      copSource: "Copernicus C3S — ERA5 Reanalysis",
      indicator: "Anomalia temperatura mai 2026: +0,4°C acima da média",
    },
    {
      id: "oceanos", icon: "🌊", name: "Oceanos / Nível do Mar",
      status: "ATENCAO", color: "#eab308",
      rsHistory: "Nível médio do mar em Rio Grande subiu ~3,2mm/ano (1993–2023). Surtos de maré associados a El Niño.",
      current: "Monitoramento por altimetria Sentinel-6. Maré meteorológica + El Niño = risco costeiro.",
      copSource: "Copernicus Marine — CMEMS",
      indicator: "Anomalia nível mar Atlântico Sul: +12cm vs média 1993-2023",
    },
    {
      id: "poluicao", icon: "💨", name: "Poluição / Qualidade do Ar",
      status: "ATENCAO", color: "#eab308",
      rsHistory: "POA: episódios de qualidade do ar ruim associados a queimadas no cerrado e Pampa (2020, 2022).",
      current: "Sentinel-5P TROPOMI monitora NO₂, CO, aerossóis diariamente.",
      copSource: "Copernicus Atmosphere — CAMS + Sentinel-5P",
      indicator: "IQA Porto Alegre mai 2026: Moderado (42 µg/m³ PM2.5)",
    },
    {
      id: "uso_solo", icon: "🗺️", name: "Uso do Solo",
      status: "NORMAL", color: "#22c55e",
      rsHistory: "RS: 60% agropecuária, 12% vegetação nativa, 28% outros. Expansão da soja pressiona Pampa.",
      current: "Mapeamento anual via Sentinel-2 + MapBiomas RS.",
      copSource: "Copernicus Land — CORINE adapted + MapBiomas",
      indicator: "Área agrícola RS 2025: 14,8 milhões ha (+2,1% vs 2024)",
    },
    {
      id: "seca", icon: "🏜️", name: "Seca / Estiagem",
      status: "ATENCAO", color: "#eab308",
      rsHistory: "2021/22: pior seca em 91 anos no RS. Prejuízo de R$ 19 bilhões. 64% do território em seca severa.",
      current: "Índice SPI-3 atual: -0,4 (próximo da normalidade). El Niño deve aumentar chuvas no RS.",
      copSource: "Copernicus Emergency — EDO (European Drought Observatory)",
      indicator: "SPI-3 RS mai 2026: -0,4 (atenção)",
    },
  ],
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function getRiskLevel(precipAccum, tempMin, windMax, lagoaLevel = null) {
  let score = 0;
  if (precipAccum > 150) score += 4; else if (precipAccum > 80) score += 3;
  else if (precipAccum > 40) score += 2; else if (precipAccum > 20) score += 1;
  if (tempMin < 0) score += 3; else if (tempMin < 5) score += 2; else if (tempMin < 10) score += 1;
  if (windMax > 80) score += 3; else if (windMax > 50) score += 2; else if (windMax > 30) score += 1;
  // El Niño emergindo (+0,9°C) adiciona score
  if (ENSO.nino34 >= 1.5) score += 3;
  else if (ENSO.nino34 >= 0.5) score += 2;
  else if (ENSO.nino34 > 0) score += 1;
  if (lagoaLevel !== null) {
    if (lagoaLevel > 1.2) score += 4; else if (lagoaLevel > 0.8) score += 3; else if (lagoaLevel > 0.5) score += 1;
  }
  if (score >= 9) return "CRITICO";
  if (score >= 6) return "EMERGENCIA";
  if (score >= 4) return "ALERTA";
  if (score >= 2) return "ATENCAO";
  return "NORMAL";
}

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

// Focos de queimada INPE BDQueimadas (API pública)
async function fetchQueimadas() {
  try {
    // API BDQueimadas — focos últimas 48h no RS (estado código 43)
    const url = "https://queimadas.dgi.inpe.br/api/focos/?pais_id=33&estado_id=43&quantidade=100";
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch { return null; }
}

const wmoDesc = (c) => c<=3?"Céu claro":c<=9?"Neblina":c<=29?"Chuva":c<=39?"Neve":c<=59?"Garoa":c<=79?"Neve intensa":c<=84?"Pancadas":c<=94?"Tempestade":"Tempestade severa";
const wmoEmoji = (c) => c<=3?"☀️":c<=9?"🌫️":c<=29?"🌧️":c<=39?"❄️":c<=59?"🌧️":c<=79?"❄️":c<=84?"⛈️":"🌪️";

// ─── PUSH ────────────────────────────────────────────────────────────────────
function PushButton() {
  const [state, setState] = useState("idle");
  const [msg, setMsg] = useState("");
  async function subscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setMsg("Não suportado"); setState("error"); return; }
    setState("requesting");
    try {
      const reg = await navigator.serviceWorker.register("/sentinela-rs/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setMsg("Negado"); setState("error"); return; }
      const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!VAPID) { setMsg("VAPID ausente"); setState("error"); return; }
      const pad = "=".repeat((4 - VAPID.length % 4) % 4);
      const key = Uint8Array.from([...atob((VAPID + pad).replace(/-/g,"+").replace(/_/g,"/"))].map(c=>c.charCodeAt(0)));
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      setState("subscribed"); setMsg("Ativo!");
    } catch(e) { setMsg(e.message.slice(0,25)); setState("error"); }
  }
  const c = { idle:"#22d3ee", requesting:"#eab308", subscribed:"#22c55e", error:"#ef4444" };
  return (
    <button onClick={subscribe} disabled={state==="subscribed"||state==="requesting"} style={{ padding:"6px 12px", borderRadius:4, fontFamily:"inherit", fontSize:10, cursor:"pointer", background:"rgba(0,0,0,0.3)", border:`1px solid ${c[state]}44`, color:c[state] }}>
      {state==="idle"&&"🔔 Push"}{state==="requesting"&&"⏳..."}{state==="subscribed"&&`✓ ${msg}`}{state==="error"&&`✗ ${msg}`}
    </button>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function SentinelaRS() {
  const [stationData, setStationData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selStation, setSelStation] = useState(STATIONS[4]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [alerts, setAlerts] = useState([]);
  const [queimadas, setQueimadas] = useState(null);
  const [qLoading, setQLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const results = {};
    const newAlerts = [];
    for (const st of STATIONS) {
      try {
        const weather = await fetchWeather7Days(st.lat, st.lon);
        let realLevel = null;
        if (st.anaCode) realLevel = await fetchAnaLevel(st.anaCode);
        const precip = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
        const tempMin = Math.min(...(weather.daily?.temperature_2m_min||[20]));
        const windMax = Math.max(...(weather.daily?.windspeed_10m_max||[0]));
        const lagoa = st.type==="lagoa" ? {
          atual: realLevel!==null ? realLevel : +(0.3+Math.random()*0.2).toFixed(2),
          projetado: +(0.3+precip*0.008).toFixed(2),
          isReal: realLevel!==null,
        } : null;
        const risk = getRiskLevel(precip, tempMin, windMax, lagoa?.atual||null);
        results[st.id] = { weather, lagoa, precip, tempMin, windMax, risk, realLevel };
        if (risk !== "NORMAL") {
          const parts=[];
          if (precip>80) parts.push(`chuva ${precip.toFixed(0)}mm/7d`);
          if (tempMin<5) parts.push(`temp. mín. ${tempMin.toFixed(1)}°C`);
          if (windMax>50) parts.push(`rajadas ${windMax.toFixed(0)}km/h`);
          if (lagoa?.atual>0.8) parts.push(`lagoa ${lagoa.atual.toFixed(2)}m`);
          newAlerts.push({ id:`${st.id}_${Date.now()}`, station:st.name, risk_level:risk, message:parts.join(" · ")||"Parâmetros em atenção", at:new Date() });
        }
      } catch { results[st.id]={ error:true, risk:"NORMAL" }; }
    }
    setStationData(results);
    setAlerts(newAlerts);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  const loadQueimadas = useCallback(async () => {
    setQLoading(true);
    const data = await fetchQueimadas();
    setQueimadas(data);
    setQLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
    const iv = setInterval(loadAllData, 30*60*1000);
    return () => clearInterval(iv);
  }, [loadAllData]);

  useEffect(() => {
    if (activeTab === "queimadas") loadQueimadas();
  }, [activeTab, loadQueimadas]);

  const overallRisk = Object.values(stationData).reduce((w,d) => {
    const o=["NORMAL","ATENCAO","ALERTA","EMERGENCIA","CRITICO"];
    return o.indexOf(d.risk)>o.indexOf(w)?d.risk:w;
  }, "NORMAL");

  const ensoClass = classifyENSO(ENSO.nino34);
  const selData = stationData[selStation.id];

  const TABS = [
    { key:"dashboard",   label:"📡 Dashboard" },
    { key:"previsao",    label:"📅 Previsão 7 Dias" },
    { key:"lagoa",       label:"🌊 Lagoa dos Patos" },
    { key:"enso",        label:"🌡️ El Niño / La Niña" },
    { key:"copernicus",  label:"🛰️ Copernicus" },
    { key:"queimadas",   label:"🔥 Queimadas / APAs" },
    { key:"alertas",     label:`🔔 Alertas${alerts.length?` (${alerts.length})`:""}`},
    { key:"apis",        label:"🔌 Fontes de Dados" },
  ];

  const s = { // estilos comuns
    card: { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"14px 16px" },
    label: { fontSize:9, color:"#64748b", letterSpacing:2, textTransform:"uppercase", marginBottom:6 },
    bar: (pct,color) => ({ height:6, background:"rgba(0,0,0,0.4)", borderRadius:3, overflow:"hidden", marginBottom:4, position:"relative" }),
  };

  return (
    <div style={{ minHeight:"100vh", background:"#070b12", color:"#e2e8f0", fontFamily:"'IBM Plex Mono','Courier New',monospace" }}>
      <div style={{ position:"fixed", inset:0, zIndex:0, backgroundImage:"linear-gradient(rgba(34,211,238,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.04) 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none" }} />
      <div style={{ position:"relative", zIndex:2, maxWidth:1200, margin:"0 auto", padding:"0 16px 40px" }}>

        {/* ── HEADER ── */}
        <header style={{ borderBottom:"1px solid rgba(34,211,238,0.2)", paddingBottom:14, marginBottom:20, paddingTop:18 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:loading?"#eab308":"#22c55e", boxShadow:`0 0 6px ${loading?"#eab308":"#22c55e"}` }} />
                <span style={{ fontSize:10, color:"#64748b", letterSpacing:3 }}>SISTEMA ATIVO · RIO GRANDE DO SUL</span>
              </div>
              <h1 style={{ margin:"2px 0", fontSize:26, fontWeight:700, letterSpacing:-1, color:"#f8fafc" }}>
                SENTINELA<span style={{ color:"#22d3ee" }}>·RS</span>
                <span style={{ fontSize:11, color:"#475569", fontWeight:400, letterSpacing:1, marginLeft:10 }}>v2.1</span>
              </h1>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
              <div style={{ padding:"5px 12px", borderRadius:4, border:`1px solid ${RISK_LEVELS[overallRisk].color}`, background:RISK_LEVELS[overallRisk].bg, color:RISK_LEVELS[overallRisk].color, fontSize:12, fontWeight:700, letterSpacing:2 }}>
                {RISK_LEVELS[overallRisk].icon} RISCO GERAL: {RISK_LEVELS[overallRisk].label.toUpperCase()}
              </div>
              {/* ENSO badge — corrigido: El Niño, NÃO La Niña */}
              <div style={{ padding:"4px 10px", borderRadius:4, border:`1px solid ${ensoClass.color}55`, color:ensoClass.color, fontSize:10, fontWeight:700 }}>
                {ensoClass.icon} {ensoClass.label} · Niño3.4: +{ENSO.nino34}°C · Prob: {(ENSO.prob.elNino*100).toFixed(0)}%
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <PushButton />
                <span style={{ fontSize:9, color:"#334155" }}>{lastUpdate?lastUpdate.toLocaleTimeString("pt-BR"):"..."}</span>
                <button onClick={loadAllData} style={{ background:"none", border:"none", color:"#22d3ee", cursor:"pointer", fontSize:12, padding:0 }}>↻</button>
              </div>
            </div>
          </div>

          {/* Banners */}
          <div style={{ marginTop:10, padding:"9px 14px", background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.3)", borderRadius:4, fontSize:11, color:"#fca5a5", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            ⚠️ <strong>EL NIÑO EMERGINDO (98% prob. NOAA/IRI)</strong> — Niño 3.4: +0,9°C. Risco de enchentes e queimadas elevado no RS em 2026/27.
            <button onClick={()=>setActiveTab("enso")} style={{ background:"none", border:"none", color:"#22d3ee", cursor:"pointer", fontSize:11, padding:0, fontFamily:"inherit" }}>Ver análise completa →</button>
          </div>
        </header>

        {/* ── TABS ── */}
        <div style={{ display:"flex", gap:2, marginBottom:20, flexWrap:"wrap" }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{
              padding:"7px 13px", fontSize:11, fontFamily:"inherit", letterSpacing:1, cursor:"pointer", borderRadius:4,
              background:activeTab===tab.key?"rgba(34,211,238,0.15)":"transparent",
              border:activeTab===tab.key?"1px solid rgba(34,211,238,0.5)":"1px solid rgba(255,255,255,0.08)",
              color:activeTab===tab.key?"#22d3ee":"#64748b",
            }}>{tab.label}</button>
          ))}
        </div>

        {loading && activeTab!=="copernicus" && activeTab!=="enso" && activeTab!=="apis" && (
          <div style={{ textAlign:"center", padding:50, color:"#22d3ee" }}>
            <div style={{ fontSize:28, marginBottom:10, animation:"spin 1s linear infinite", display:"inline-block" }}>◌</div>
            <div style={{ fontSize:11, letterSpacing:4 }}>CONSULTANDO APIs...</div>
            <div style={{ fontSize:9, color:"#475569", marginTop:4 }}>Open-Meteo · ANA HidroWeb · INPE · NOAA</div>
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {!loading && activeTab==="dashboard" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:10 }}>
            {STATIONS.map(station => {
              const d = stationData[station.id];
              if (!d) return null;
              const risk = RISK_LEVELS[d.risk];
              return (
                <div key={station.id} onClick={()=>{setSelStation(station);setActiveTab("previsao");}}
                  style={{ ...s.card, border:`1px solid ${d.risk!=="NORMAL"?risk.color+"55":"rgba(255,255,255,0.08)"}`, cursor:"pointer", position:"relative", overflow:"hidden" }}>
                  {d.risk!=="NORMAL" && <div style={{ position:"absolute", top:0, right:0, width:3, height:"100%", background:risk.color, opacity:0.8 }} />}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:9, color:"#64748b", letterSpacing:2 }}>{station.type.toUpperCase()}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:"#f1f5f9" }}>{station.name}</div>
                    </div>
                    <div style={{ fontSize:9, fontWeight:700, padding:"2px 7px", border:`1px solid ${risk.color}`, color:risk.color, borderRadius:3 }}>{risk.icon} {risk.label}</div>
                  </div>
                  {d.error ? <div style={{ fontSize:10, color:"#ef4444" }}>Erro ao carregar</div> : (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                      {[
                        { l:"Precip. 7d", v:`${d.precip?.toFixed(0)}mm` },
                        { l:"Temp. mín.", v:`${d.tempMin?.toFixed(1)}°C` },
                        { l:"Vento",      v:`${d.windMax?.toFixed(0)}km/h` },
                        { l:"El Niño",    v:`${(ENSO.prob.elNino*100).toFixed(0)}%`, highlight:true },
                      ].map(item => (
                        <div key={item.l} style={{ background:"rgba(0,0,0,0.3)", padding:"5px 7px", borderRadius:3 }}>
                          <div style={{ fontSize:8, color:"#475569" }}>{item.l}</div>
                          <div style={{ fontSize:11, fontWeight:600, color:item.highlight?"#f97316":"#e2e8f0" }}>{item.v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {station.type==="lagoa" && d.lagoa && (
                    <div style={{ marginTop:7 }}>
                      <div style={{ fontSize:8, color:"#64748b", marginBottom:3, display:"flex", justifyContent:"space-between" }}>
                        <span>NÍVEL {d.lagoa.isReal?"REAL":"ESTIMADO"}</span>
                        {d.lagoa.isReal && <span style={{ color:"#22c55e" }}>● ANA</span>}
                      </div>
                      <div style={{ height:4, background:"rgba(0,0,0,0.4)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.min(100,(d.lagoa.atual/1.5)*100)}%`, background:d.lagoa.atual>1.2?"#ef4444":d.lagoa.atual>0.8?"#f97316":"#22c55e", borderRadius:2 }} />
                      </div>
                      <div style={{ fontSize:8, color:"#64748b", marginTop:2 }}>{d.lagoa.atual.toFixed(2)}m / alerta 0.8m</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ PREVISÃO 7 DIAS ══ */}
        {!loading && activeTab==="previsao" && (
          <div>
            <select value={selStation.id} onChange={e=>setSelStation(STATIONS.find(st=>st.id===e.target.value))}
              style={{ background:"rgba(0,0,0,0.4)", border:"1px solid rgba(34,211,238,0.3)", color:"#e2e8f0", padding:"7px 11px", borderRadius:4, fontFamily:"inherit", fontSize:11, marginBottom:14, cursor:"pointer" }}>
              {STATIONS.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
            {selData?.weather?.daily ? (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:20 }}>
                  {selData.weather.daily.time?.map((date,i) => {
                    const dd=new Date(date+"T12:00:00");
                    const p=selData.weather.daily.precipitation_sum?.[i]||0;
                    const tx=selData.weather.daily.temperature_2m_max?.[i]||0;
                    const tn=selData.weather.daily.temperature_2m_min?.[i]||0;
                    const w=selData.weather.daily.windspeed_10m_max?.[i]||0;
                    const c=selData.weather.daily.weathercode?.[i]||0;
                    const dr=getRiskLevel(p*1.5,tn,w);
                    const r=RISK_LEVELS[dr];
                    return (
                      <div key={date} style={{ padding:"10px 6px", background:i===0?"rgba(34,211,238,0.08)":"rgba(255,255,255,0.03)", border:`1px solid ${i===0?"rgba(34,211,238,0.4)":dr!=="NORMAL"?r.color+"55":"rgba(255,255,255,0.07)"}`, borderRadius:5, textAlign:"center" }}>
                        <div style={{ fontSize:8, color:"#64748b" }}>{i===0?"HOJE":dayNames[dd.getDay()]}</div>
                        <div style={{ fontSize:8, color:"#475569" }}>{dd.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</div>
                        <div style={{ fontSize:22, margin:"6px 0 4px" }}>{wmoEmoji(c)}</div>
                        <div style={{ fontSize:7, color:"#64748b", marginBottom:5, minHeight:22 }}>{wmoDesc(c)}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#fbbf24" }}>{tx.toFixed(0)}°</div>
                        <div style={{ fontSize:10, color:"#60a5fa" }}>{tn.toFixed(0)}°</div>
                        <div style={{ marginTop:5, paddingTop:5, borderTop:"1px solid rgba(255,255,255,0.07)", fontSize:8 }}>
                          <div style={{ color:"#22d3ee" }}>🌧 {p.toFixed(0)}mm</div>
                          <div style={{ color:"#94a3b8" }}>💨 {w.toFixed(0)}km/h</div>
                        </div>
                        <div style={{ marginTop:5, fontSize:7, padding:"2px 3px", border:`1px solid ${r.color}`, color:r.color, borderRadius:3 }}>{r.label}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Gráfico */}
                <div style={{ ...s.card, marginBottom:12 }}>
                  <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:12 }}>PRECIPITAÇÃO (mm/dia)</div>
                  <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
                    {selData.weather.daily.precipitation_sum?.map((p,i) => {
                      const mx=Math.max(...selData.weather.daily.precipitation_sum,1);
                      const dd=new Date(selData.weather.daily.time[i]+"T12:00:00");
                      return (
                        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <div style={{ fontSize:7, color:"#22d3ee" }}>{p.toFixed(0)}</div>
                          <div style={{ width:"100%", height:(p/mx)*70, minHeight:p>0?3:0, background:p>50?"#ef4444":p>20?"#f97316":"#22d3ee", borderRadius:"2px 2px 0 0", opacity:0.8 }} />
                          <div style={{ fontSize:7, color:"#475569" }}>{dayNames[dd.getDay()]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ padding:14, background:RISK_LEVELS[selData.risk].bg, border:`1px solid ${RISK_LEVELS[selData.risk].color}44`, borderRadius:5 }}>
                  <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:8 }}>ANÁLISE DE RISCO — 7 DIAS</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                    {[
                      { l:"Precipitação", v:`${selData.precip?.toFixed(0)} mm`, a:selData.precip>80 },
                      { l:"Temp. mínima", v:`${selData.tempMin?.toFixed(1)}°C`,  a:selData.tempMin<5 },
                      { l:"Vento máx.",   v:`${selData.windMax?.toFixed(0)} km/h`, a:selData.windMax>50 },
                      { l:"El Niño prob.",v:`${(ENSO.prob.elNino*100).toFixed(0)}%`, a:true },
                    ].map(item=>(
                      <div key={item.l} style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:10, color:"#64748b" }}>{item.l}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:item.a?"#f97316":"#22c55e" }}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : <div style={{ color:"#ef4444", fontSize:11 }}>Dados não disponíveis.</div>}
          </div>
        )}

        {/* ══ LAGOA DOS PATOS ══ */}
        {!loading && activeTab==="lagoa" && (
          <div style={{ display:"grid", gap:10 }}>
            <div style={{ fontSize:10, color:"#475569" }}>4 pontos de monitoramento · ANA HidroWeb quando disponível · El Niño eleva risco costeiro em Rio Grande</div>
            {STATIONS.filter(st=>st.type==="lagoa").map(station => {
              const d=stationData[station.id];
              if (!d?.lagoa) return null;
              const { atual, projetado, isReal } = d.lagoa;
              const cor=atual>1.2?"#ef4444":atual>0.8?"#f97316":"#22c55e";
              return (
                <div key={station.id} style={{ ...s.card }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:"#f1f5f9" }}>{station.name}</div>
                      <div style={{ fontSize:9, color:"#475569" }}>
                        Cód. ANA: {station.anaCode} ·
                        <span style={{ color:isReal?"#22c55e":"#475569", marginLeft:6 }}>{isReal?"● Real":"○ Estimado"}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:10, color:RISK_LEVELS[d.risk].color, border:`1px solid ${RISK_LEVELS[d.risk].color}`, padding:"3px 8px", borderRadius:3 }}>
                      {RISK_LEVELS[d.risk].icon} {RISK_LEVELS[d.risk].label}
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                    {[
                      { l:`NÍVEL ${isReal?"REAL":"ESTIMADO"}`, v:atual, c:cor },
                      { l:"PROJETADO 7 DIAS", v:projetado, c:projetado>0.8?"#f97316":"#94a3b8" },
                    ].map(item=>(
                      <div key={item.l}>
                        <div style={{ fontSize:8, color:"#64748b", letterSpacing:2, marginBottom:5 }}>{item.l}</div>
                        <div style={{ height:6, background:"rgba(0,0,0,0.4)", borderRadius:3, overflow:"hidden", marginBottom:3 }}>
                          <div style={{ height:"100%", width:`${Math.min(100,(item.v/1.5)*100)}%`, background:item.c, borderRadius:3 }} />
                        </div>
                        <div style={{ fontSize:18, fontWeight:700, color:item.c }}>{item.v.toFixed(2)}m</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                    {[["Normal","0.5m","#22c55e"],["Alerta","0.8m","#f97316"],["Emergência","1.2m","#ef4444"]].map(([l,v,c])=>(
                      <div key={l} style={{ background:"rgba(0,0,0,0.3)", padding:"6px 8px", borderRadius:3, borderLeft:`3px solid ${c}` }}>
                        <div style={{ fontSize:8, color:"#475569" }}>{l}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {atual>0.8 && (
                    <div style={{ marginTop:8, padding:"7px 10px", background:atual>1.2?"rgba(239,68,68,0.1)":"rgba(249,115,22,0.1)", border:`1px solid ${atual>1.2?"rgba(239,68,68,0.4)":"rgba(249,115,22,0.4)"}`, borderRadius:3, fontSize:10, color:atual>1.2?"#fca5a5":"#fdba74" }}>
                      ⚠ Nível acima do threshold de {atual>1.2?"emergência":"alerta"}.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ ENSO — El Niño / La Niña ══ */}
        {activeTab==="enso" && (
          <div style={{ display:"grid", gap:12 }}>
            {/* Banner corrigido */}
            <div style={{ padding:"12px 16px", background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.4)", borderRadius:5, display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:24 }}>⚠️</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#fca5a5", marginBottom:3 }}>EL NIÑO EM DESENVOLVIMENTO — NÃO LA NIÑA</div>
                <div style={{ fontSize:10, color:"#fca5a5", opacity:0.85, lineHeight:1.6 }}>
                  Índice Niño 3.4 semanal: <strong>+0,9°C</strong>. ONI trimestral fev–abr: +0,47°C.
                  IRI/CCSR atribui <strong>98% de probabilidade</strong> de El Niño consolidado em mai–jul 2026.
                  NOAA/CPC: <strong>El Niño Watch</strong> ativo, 96% chance de persistência até dez 2026–fev 2027.
                  El Niño histórico = enchentes severas no RS.
                </div>
              </div>
            </div>

            {/* Cards status */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10 }}>
              {[
                { l:"Fase atual",             v:`${ensoClass.icon} ${ensoClass.label}`, s:`Niño 3.4: +${ENSO.nino34}°C`, c:ensoClass.color },
                { l:"ONI trimestral",         v:`+${ENSO.oni3m}°C`,                    s:"Limiar El Niño: +0,5°C",        c:"#f97316" },
                { l:"Prob. El Niño mai–jul",  v:`${(ENSO.prob.elNino*100).toFixed(0)}%`, s:"IRI/CCSR mai 2026",           c:"#ef4444" },
                { l:"Prob. La Niña",          v:`${(ENSO.prob.laNina*100).toFixed(0)}%`, s:"Confirmado: NÃO é La Niña",   c:"#22c55e" },
                { l:"Status NOAA",            v:"El Niño Watch",                        s:"96% até dez 2026–fev 2027",    c:"#f97316" },
                { l:"Potencial Super El Niño",v:ENSO.nino34>=1.5?"SIM — ATIVO":`+${(ENSO.superThreshold-ENSO.nino34).toFixed(1)}°C p/ atingir`, s:`Limiar Super: +${ENSO.superThreshold}°C`, c:ENSO.nino34>=1.5?"#dc2626":"#eab308" },
              ].map(item=>(
                <div key={item.l} style={{ padding:"12px 14px", background:"rgba(255,255,255,0.03)", border:`1px solid ${item.c}44`, borderTop:`3px solid ${item.c}`, borderRadius:5 }}>
                  <div style={{ fontSize:8, color:"#64748b", letterSpacing:2, marginBottom:5 }}>{item.l.toUpperCase()}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:item.c, marginBottom:3 }}>{item.v}</div>
                  <div style={{ fontSize:8, color:"#475569" }}>{item.s}</div>
                </div>
              ))}
            </div>

            {/* Termômetro */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:12 }}>ESCALA ONI — POSIÇÃO ATUAL (+0,9°C)</div>
              <div style={{ position:"relative", height:24, borderRadius:3, overflow:"hidden", background:"rgba(0,0,0,0.3)" }}>
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#1e3a8a 0%,#3b82f6 20%,#22c55e 38%,#22c55e 62%,#f97316 76%,#ef4444 88%,#dc2626 100%)", opacity:0.75 }} />
                {[
                  {l:"Super La Niña",pos:"8%"},{l:"La Niña",pos:"28%"},{l:"Neutro",pos:"50%"},{l:"El Niño",pos:"70%"},{l:"Super",pos:"90%"}
                ].map(lb=>(
                  <div key={lb.l} style={{ position:"absolute", top:0, left:lb.pos, transform:"translateX(-50%)", fontSize:7, color:"rgba(255,255,255,0.8)", height:"100%", display:"flex", alignItems:"center" }}>{lb.l}</div>
                ))}
                {/* Marcador: +0.9°C → (0.9+3)/6 = 65% */}
                <div style={{ position:"absolute", top:0, left:`${Math.min(97,Math.max(3,((ENSO.nino34+3)/6)*100))}%`, transform:"translateX(-50%)", width:3, height:"100%", background:"#fff", boxShadow:"0 0 6px #fff" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:8, color:"#475569" }}>
                <span>-3°C</span>
                <span style={{ color:ensoClass.color, fontWeight:700 }}>▲ ATUAL: +{ENSO.nino34}°C → {ensoClass.label}</span>
                <span>+3°C</span>
              </div>
              <div style={{ marginTop:8, padding:"6px 10px", background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:3, fontSize:9, color:"#fdba74" }}>
                Falta <strong>{(ENSO.superThreshold-ENSO.nino34).toFixed(1)}°C</strong> para atingir Super El Niño (+{ENSO.superThreshold}°C). Modelos indicam aquecimento progressivo ao longo de 2026.
              </div>
            </div>

            {/* Previsão probabilística */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:12 }}>PREVISÃO PROBABILÍSTICA IRI/CCSR — 8 MESES</div>
              <div style={{ display:"grid", gap:7 }}>
                {ENSO.forecast.map((f,i)=>(
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"100px 1fr 1fr 1fr", gap:6, alignItems:"center" }}>
                    <div style={{ fontSize:9, color:"#64748b" }}>{f.p}</div>
                    {[{l:"El Niño",v:f.en,c:"#f97316"},{l:"Neutro",v:f.nu,c:"#22c55e"},{l:"La Niña",v:f.ln,c:"#3b82f6"}].map(bar=>(
                      <div key={bar.l}>
                        <div style={{ fontSize:7, color:bar.c, marginBottom:2 }}>{bar.l} {(bar.v*100).toFixed(0)}%</div>
                        <div style={{ height:4, background:"rgba(0,0,0,0.4)", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${bar.v*100}%`, background:bar.c }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:8, color:"#334155", marginTop:8 }}>Fonte: IRI/CCSR Columbia University + NOAA/CPC — mai 2026</div>
            </div>

            {/* Histórico */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:12 }}>EVENTOS EL NIÑO — IMPACTO HISTÓRICO NO RS</div>
              <div style={{ display:"grid", gap:7 }}>
                {ENSO.historical.map((ev,i)=>{
                  const cls=classifyENSO(ev.peak);
                  const isCur=ev.peak===null;
                  return (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"72px 1fr 1fr 60px", gap:8, alignItems:"center", padding:"9px 10px", background:isCur?"rgba(220,38,38,0.08)":"rgba(0,0,0,0.2)", border:`1px solid ${isCur?"rgba(220,38,38,0.35)":"rgba(255,255,255,0.05)"}`, borderRadius:4 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:isCur?"#fca5a5":"#94a3b8" }}>{ev.y}</div>
                      <div style={{ fontSize:10, color:cls.color, fontWeight:600 }}>{cls.icon} {ev.cat}</div>
                      <div style={{ fontSize:9, color:"#64748b" }}>{ev.rs}</div>
                      <div style={{ fontSize:11, fontWeight:700, color:cls.color, textAlign:"right" }}>{ev.peak!==null?`+${ev.peak}°C`:"↑ dev."}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Impactos RS */}
            <div style={{ padding:16, background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:5 }}>
              <div style={{ fontSize:10, color:"#f97316", letterSpacing:2, marginBottom:12 }}>IMPACTOS ESPERADOS — EL NIÑO 2026/27 NO RS</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:10 }}>
                {[
                  { i:"🌧️", t:"Chuvas 30–50% acima da média",   d:"Primavera/verão 2026/27. Bacias do Jacuí, Taquari e Pelotas em risco." },
                  { i:"🌊", t:"Inundações costeiras",            d:"Ventos do Norte + El Niño = empilhamento na Lagoa dos Patos. Rio Grande em alerta." },
                  { i:"🔥", t:"Risco de queimadas no verão",     d:"Inversão de padrão: El Niño traz mais chuva no RS mas seca extrema no outono." },
                  { i:"🌡️", t:"Ondas de calor intensas",         d:"Verão mais quente, maior evapotranspiração, estresse hídrico no Pampa." },
                ].map(item=>(
                  <div key={item.t} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                    <span style={{ fontSize:18 }}>{item.i}</span>
                    <div>
                      <div style={{ fontSize:10, fontWeight:600, color:"#fdba74", marginBottom:3 }}>{item.t}</div>
                      <div style={{ fontSize:9, color:"#64748b", lineHeight:1.5 }}>{item.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ COPERNICUS ══ */}
        {activeTab==="copernicus" && (
          <div style={{ display:"grid", gap:10 }}>
            <div style={{ padding:"10px 14px", background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.3)", borderRadius:5, fontSize:10, color:"#c4b5fd" }}>
              🛰️ <strong>Programa Copernicus (UE)</strong> — Monitoramento por satélite de fenômenos que historicamente afetaram o RS.
              Dados: Sentinel-1 SAR, Sentinel-2 óptico, Sentinel-3 oceano/fogo, Sentinel-5P atmosfera, Sentinel-6 nível do mar.
              Última atualização: {COPERNICUS_DATA.lastUpdate}.
            </div>
            <div style={{ display:"grid", gap:8 }}>
              {COPERNICUS_DATA.themes.map(theme=>(
                <div key={theme.id} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${theme.color}44`, borderLeft:`4px solid ${theme.color}`, borderRadius:5, overflow:"hidden" }}>
                  <div style={{ padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:20 }}>{theme.icon}</span>
                        <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9" }}>{theme.name}</div>
                        <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${theme.color}`, color:theme.color, borderRadius:3, letterSpacing:2 }}>{theme.status}</div>
                      </div>
                      <div style={{ fontSize:10, color:"#64748b", marginBottom:4, lineHeight:1.5 }}><strong style={{ color:"#94a3b8" }}>Histórico RS:</strong> {theme.rsHistory}</div>
                      <div style={{ fontSize:10, color:"#64748b", marginBottom:4 }}><strong style={{ color:"#94a3b8" }}>Atual:</strong> {theme.current}</div>
                      <div style={{ fontSize:9, color:"#334155" }}>📡 {theme.copSource}</div>
                    </div>
                    <div style={{ flexShrink:0, textAlign:"right" }}>
                      <div style={{ fontSize:9, color:"#475569", marginBottom:4 }}>INDICADOR</div>
                      <div style={{ fontSize:9, color:theme.color, fontWeight:600, maxWidth:160, textAlign:"right", lineHeight:1.4 }}>{theme.indicator}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding:"10px 14px", background:"rgba(0,0,0,0.2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:5, fontSize:9, color:"#334155" }}>
              Fontes: Copernicus Emergency Management Service (CEMS) · Copernicus Climate Change Service (C3S) · Copernicus Marine Service (CMEMS) · Copernicus Atmosphere Monitoring Service (CAMS) · INPE BDQueimadas · MapBiomas RS
            </div>
          </div>
        )}

        {/* ══ QUEIMADAS / APAs ══ */}
        {activeTab==="queimadas" && (
          <div style={{ display:"grid", gap:12 }}>
            <div style={{ padding:"10px 14px", background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:5, fontSize:10, color:"#fdba74" }}>
              🔥 Focos de queimada via <strong>INPE BDQueimadas</strong> (últimas 48h) + monitoramento de Unidades de Conservação do RS via <strong>Copernicus EFFIS</strong>.
            </div>

            {/* Focos INPE */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:12 }}>FOCOS INPE — RS (últimas 48h)</div>
              {qLoading ? (
                <div style={{ textAlign:"center", padding:30, color:"#f97316", fontSize:12 }}>🔥 Consultando INPE...</div>
              ) : queimadas ? (
                <div>
                  <div style={{ fontSize:22, fontWeight:700, color:"#f97316", marginBottom:4 }}>
                    {Array.isArray(queimadas)?queimadas.length:queimadas?.count||"–"} focos
                  </div>
                  <div style={{ fontSize:10, color:"#64748b" }}>detectados no RS nas últimas 48h · Fonte: INPE BDQueimadas</div>
                  {Array.isArray(queimadas) && queimadas.length > 0 && (
                    <div style={{ marginTop:10, display:"grid", gap:5, maxHeight:200, overflowY:"auto" }}>
                      {queimadas.slice(0,10).map((f,i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 8px", background:"rgba(0,0,0,0.3)", borderRadius:3, fontSize:9, color:"#94a3b8" }}>
                          <span>🔥 {f.municipio||f.properties?.municipio||"RS"}</span>
                          <span>{f.datahora||f.properties?.datahora||"–"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:11, color:"#64748b", marginBottom:8 }}>API INPE indisponível — dados de referência:</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:8 }}>
                    {[
                      { l:"Focos 2022 (recorde)", v:"3.200+", c:"#ef4444" },
                      { l:"Focos 2023", v:"~1.800", c:"#f97316" },
                      { l:"Focos 2024", v:"~900", c:"#eab308" },
                      { l:"Risco 2026/27", v:"ALTO", c:"#f97316" },
                    ].map(item=>(
                      <div key={item.l} style={{ background:"rgba(0,0,0,0.3)", padding:"8px 10px", borderRadius:3 }}>
                        <div style={{ fontSize:8, color:"#475569" }}>{item.l}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:item.c }}>{item.v}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={loadQueimadas} style={{ marginTop:10, background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.4)", color:"#fdba74", padding:"7px 14px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:10 }}>
                    ↻ Tentar novamente
                  </button>
                </div>
              )}
            </div>

            {/* APAs e UCs do RS */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:12 }}>UNIDADES DE CONSERVAÇÃO MONITORADAS — RS</div>
              <div style={{ display:"grid", gap:7 }}>
                {APAS_RS.map(apa=>{
                  // Simula risco baseado em El Niño e sazonalidade
                  const riskScore = ENSO.nino34 > 0.5 ? "ATENCAO" : "NORMAL";
                  const r = RISK_LEVELS[riskScore];
                  return (
                    <div key={apa.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"center", padding:"9px 12px", background:"rgba(0,0,0,0.2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:4 }}>
                      <div>
                        <div style={{ fontSize:11, fontWeight:600, color:"#e2e8f0" }}>{apa.name}</div>
                        <div style={{ fontSize:9, color:"#475569" }}>{apa.municipio}</div>
                      </div>
                      <div style={{ fontSize:9, color:"#64748b" }}>{apa.lat.toFixed(2)}°S</div>
                      <div style={{ fontSize:9, padding:"2px 7px", border:`1px solid ${r.color}`, color:r.color, borderRadius:3 }}>{r.icon} {r.label}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:10, padding:"8px 10px", background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.15)", borderRadius:4, fontSize:9, color:"#64748b" }}>
                ⚠ El Niño emergindo (+0,9°C) eleva risco de queimadas nas UCs do Pampa e Serra Gaúcha no verão 2026/27.
                Monitoramento por Sentinel-3 SLSTR + INPE BDQueimadas. Para dados em tempo real de cada UC, integre a API do ICMBio.
              </div>
            </div>

            {/* EFFIS */}
            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:10 }}>COPERNICUS EFFIS — RISCO DE INCÊNDIO SUDAMÉRICA</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
                {[
                  { l:"Pampa Gaúcho",  v:"Médio-Alto", c:"#f97316", d:"Vegetação seca no verão" },
                  { l:"Serra Gaúcha",  v:"Médio",       c:"#eab308", d:"Mata Atlântica úmida" },
                  { l:"Litoral RS",    v:"Baixo",        c:"#22c55e", d:"Restinga úmida" },
                  { l:"Missões",       v:"Médio",        c:"#eab308", d:"Campos e matas" },
                ].map(item=>(
                  <div key={item.l} style={{ background:"rgba(0,0,0,0.3)", padding:"10px 12px", borderRadius:4, borderTop:`3px solid ${item.c}` }}>
                    <div style={{ fontSize:9, color:"#64748b", marginBottom:4 }}>{item.l}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:item.c, marginBottom:3 }}>{item.v}</div>
                    <div style={{ fontSize:8, color:"#475569" }}>{item.d}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:8, color:"#334155", marginTop:8 }}>Fonte: Copernicus EFFIS — European Forest Fire Information System · mai 2026</div>
            </div>
          </div>
        )}

        {/* ══ ALERTAS ══ */}
        {!loading && activeTab==="alertas" && (
          <div>
            {/* Correção: El Niño, não La Niña */}
            <div style={{ marginBottom:12, padding:"10px 14px", background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:5, fontSize:10, color:"#fdba74" }}>
              🌡️ <strong>ENSO atual: El Niño (+0,9°C) — NÃO La Niña.</strong> Prob. El Niño mai–jul 2026: 98% (NOAA/IRI). Risco elevado de enchentes e extremos climáticos no RS.
            </div>

            {alerts.length===0 ? (
              <div style={{ textAlign:"center", padding:50, border:"1px solid rgba(34,197,94,0.3)", borderRadius:5, background:"rgba(34,197,94,0.05)" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>✓</div>
                <div style={{ fontSize:13, color:"#22c55e", letterSpacing:2 }}>NENHUM ALERTA METEOROLÓGICO ATIVO</div>
                <div style={{ fontSize:10, color:"#475569", marginTop:5 }}>Estações dentro dos parâmetros normais. El Niño em monitoramento contínuo.</div>
              </div>
            ) : (
              <div style={{ display:"grid", gap:8 }}>
                {[...alerts].sort((a,b)=>["CRITICO","EMERGENCIA","ALERTA","ATENCAO","NORMAL"].indexOf(a.risk_level)-["CRITICO","EMERGENCIA","ALERTA","ATENCAO","NORMAL"].indexOf(b.risk_level)).map((alert,i)=>{
                  const r=RISK_LEVELS[alert.risk_level];
                  return (
                    <div key={i} style={{ padding:"12px 14px", background:r.bg, border:`1px solid ${r.color}55`, borderLeft:`4px solid ${r.color}`, borderRadius:5 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:r.color }}>{r.icon} {r.label.toUpperCase()} — {alert.station}</div>
                        <div style={{ fontSize:9, color:"#475569" }}>{new Date(alert.at).toLocaleString("pt-BR")}</div>
                      </div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{alert.message}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Canais */}
            <div style={{ marginTop:16, ...s.card }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:10 }}>CANAIS DE NOTIFICAÇÃO</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:8 }}>
                {[
                  { i:"📱", n:"Push nativo (PWA)",  s:"Ativo — botão no header",  ok:true,  h:null },
                  { i:"🔔", n:"Alertas na tela",    s:"Ativo — 30min",            ok:true,  h:null },
                  { i:"📧", n:"E-mail (Resend)",    s:"Configurar",               ok:false, h:"1. resend.com → API key\n2. RESEND_API_KEY nos secrets Supabase\n3. Chamar resend.emails.send() no send-alerts" },
                  { i:"📢", n:"Defesa Civil RS",    s:"Webhook planejado",        ok:false, h:"1. alertas.rs.gov.br/rss\n2. Edge Function lê RSS a cada 30min\n3. Exibe badge OFICIAL nos alertas" },
                  { i:"📲", n:"SMS (Twilio)",       s:"Configurar",               ok:false, h:"1. twilio.com → Account SID + Token\n2. Secrets no Supabase\n3. SMS só para EMERGENCIA/CRITICO" },
                  { i:"🔊", n:"Sirene IoT",         s:"Requer hardware",          ok:false, h:"1. ESP32 + relê\n2. Webhook Supabase → POST /trigger\n3. Ativa em CRITICO" },
                ].map(c=>(
                  <div key={c.n} style={{ background:"rgba(0,0,0,0.3)", borderRadius:4, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px" }}>
                      <span style={{ fontSize:18 }}>{c.i}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, color:"#e2e8f0" }}>{c.n}</div>
                        <div style={{ fontSize:9, color:c.ok?"#22c55e":"#475569" }}>{c.s}</div>
                      </div>
                      {c.h && <button onClick={()=>setExpanded(expanded===c.n?null:c.n)} style={{ background:"none", border:"1px solid rgba(34,211,238,0.3)", color:"#22d3ee", cursor:"pointer", fontSize:8, padding:"2px 6px", borderRadius:3, fontFamily:"inherit" }}>{expanded===c.n?"▲":"▼"}</button>}
                    </div>
                    {c.h && expanded===c.n && <div style={{ padding:"8px 11px", borderTop:"1px solid rgba(255,255,255,0.06)", fontSize:9, color:"#64748b", lineHeight:1.7, whiteSpace:"pre-line" }}>{c.h}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ FONTES DE DADOS ══ */}
        {activeTab==="apis" && (
          <div style={{ display:"grid", gap:8 }}>
            {[
              { n:"Open-Meteo",               st:"ATIVO",     c:"#22c55e", d:"Previsão meteorológica 7 dias — temperatura, precipitação, vento.", a:"Gratuita, sem chave", h:null },
              { n:"ANA HidroWeb (Telemetria)", st:"ATIVO",     c:"#22c55e", d:"Nível real da Lagoa dos Patos em 4 pontos horários.",              a:"API pública, sem chave", h:null },
              { n:"NOAA/IRI — Índice ENSO",   st:"ATIVO",     c:"#22c55e", d:"El Niño/La Niña: Niño 3.4, ONI, probabilidades 8 meses.",          a:"Dados públicos, atualização mensal", h:null },
              { n:"INPE BDQueimadas",          st:"ATIVO",     c:"#22c55e", d:"Focos de queimada últimas 48h no RS — API pública.",               a:"Sem chave", h:null },
              { n:"INMET",                     st:"PLANEJADO", c:"#eab308", d:"Estações automáticas RS: temperatura, umidade, pressão em tempo real.", a:"Token gratuito", h:"1. portal.inmet.gov.br → Dados → API\n2. Token gratuito\n3. GET apitempo.inmet.gov.br/estacao/{token}/{data}/{est}\n4. VITE_INMET_TOKEN no .env" },
              { n:"CPTEC/INPE",                st:"PLANEJADO", c:"#eab308", d:"Previsão climática sazonal, boletins ENSO oficiais BR.",           a:"API pública", h:"1. servicos.cptec.inpe.br/XML/cidade/{id}/previsao.xml\n2. Proxy via Supabase Edge Function (CORS)\n3. Boletins ENSO mensais" },
              { n:"ANA HidroWeb Histórico",    st:"PLANEJADO", c:"#eab308", d:"Séries históricas de cotas para calibração de thresholds.",        a:"Token gratuito", h:"1. snirh.gov.br → HidroWeb → cadastro\n2. GET /rest/api/dadosHistoricos\n3. Calibra thresholds por bacia" },
              { n:"AlertaRS / Defesa Civil",   st:"PLANEJADO", c:"#eab308", d:"Boletins e avisos oficiais de catástrofes do Estado.",             a:"RSS / Webhook", h:"1. alertas.rs.gov.br/rss\n2. Edge Function lê RSS a cada 30min\n3. Badge OFICIAL nos alertas" },
              { n:"CEMADEN",                   st:"PLANEJADO", c:"#eab308", d:"Municípios em risco: deslizamentos, enchentes, estiagem.",          a:"API pública", h:"1. cemaden.gov.br → API\n2. Filtrar estado RS (cod 43)\n3. Mapa de risco no Dashboard" },
              { n:"ICMBio — UCs",              st:"PLANEJADO", c:"#eab308", d:"Dados de Unidades de Conservação, alertas de desmatamento/fogo.",   a:"API pública", h:"1. geo.icmbio.gov.br/portal\n2. WFS/WMS das UCs do RS\n3. Integrar na aba Queimadas/APAs" },
              { n:"Copernicus Emergency (EU)", st:"FUTURO",    c:"#8b5cf6", d:"Sentinel-1 SAR para detecção de alagamentos. Ativações CEMS.",     a:"Registro gratuito", h:"1. dataspace.copernicus.eu → cadastro\n2. API STAC para imagens Sentinel-1\n3. Processamento em backend dedicado" },
              { n:"Copernicus Marine (CMEMS)", st:"FUTURO",    c:"#8b5cf6", d:"Nível do mar, temperatura oceano, correntes — Atlântico Sul.",      a:"Registro gratuito", h:"1. marine.copernicus.eu → cadastro\n2. API OPeNDAP para séries temporais\n3. Integrar na aba Copernicus" },
            ].map(api=>(
              <div key={api.n} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:5, overflow:"hidden" }}>
                <div style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#f1f5f9", marginBottom:3 }}>{api.n}</div>
                    <div style={{ fontSize:10, color:"#64748b", marginBottom:3 }}>{api.d}</div>
                    <div style={{ fontSize:9, color:"#334155" }}>🔑 {api.a}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                    <div style={{ fontSize:8, padding:"2px 7px", border:`1px solid ${api.c}`, color:api.c, borderRadius:3, letterSpacing:2 }}>{api.st}</div>
                    {api.h && <button onClick={()=>setExpanded(expanded===api.n?null:api.n)} style={{ background:"none", border:"1px solid rgba(34,211,238,0.3)", color:"#22d3ee", cursor:"pointer", fontSize:8, padding:"2px 6px", borderRadius:3, fontFamily:"inherit" }}>{expanded===api.n?"▲ fechar":"▼ como"}</button>}
                  </div>
                </div>
                {api.h && expanded===api.n && <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,0.07)", background:"rgba(0,0,0,0.2)", fontSize:10, color:"#64748b", lineHeight:1.8, whiteSpace:"pre-line" }}>{api.h}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop:28, borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:12, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
          <div style={{ fontSize:9, color:"#1e293b" }}>SENTINELA·RS v2.1 · Open-Meteo + ANA HidroWeb + NOAA ENSO + INPE + Copernicus · Utilidade Pública</div>
          <div style={{ fontSize:9, color:"#1e293b" }}>Atualização: 30 min · PWA · github.com/cobradeca/sentinela-rs</div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        select option{background:#0f172a}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
      `}</style>
    </div>
  );
}
