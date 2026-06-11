import { useState } from "react";
import { Sparkline as HistorySparkline } from "../components/Sparkline";
import { NavIcon } from "../components/layout/NavIcons";

function WIcon({ type, size = 28 }) {
  if (type === "sun") return <span style={{ fontSize: size }}>☀️</span>;
  if (type === "partly") return <span style={{ fontSize: size }}>⛅</span>;
  return <span style={{ fontSize: size }}>🌧️</span>;
}

function Spark({ data, color = "#1a56db", w = 180, h = 70 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 6;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + ((max - v) / range) * (h - pad * 2);
    return [x, y];
  });
  const polyline = pts.map((p) => p.join(",")).join(" ");
  const area = `M${pts[0][0]},${h} ` + pts.map((p) => `L${p[0]},${p[1]}`).join(" ") + ` L${pts[pts.length - 1][0]},${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="lagoaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lagoaGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      ))}
    </svg>
  );
}

const forecastDays = [
  { d: "TER", dt: "09/06", hi: 24, lo: 15, rain: 8.2, type: "rain" },
  { d: "QUA", dt: "10/06", hi: 25, lo: 16, rain: 4.5, type: "rain" },
  { d: "QUI", dt: "11/06", hi: 23, lo: 15, rain: 12.7, type: "rain" },
  { d: "SEX", dt: "12/06", hi: 22, lo: 14, rain: 18.3, type: "rain" },
  { d: "SÁB", dt: "13/06", hi: 21, lo: 13, rain: 6.4, type: "rain" },
  { d: "DOM", dt: "14/06", hi: 19, lo: 12, rain: 2.1, type: "partly" },
  { d: "SEG", dt: "15/06", hi: 20, lo: 12, rain: 0.8, type: "partly" },
];

const newsItems = [
  { title: "CPTEC/INPE atualiza previsão: condições de El Niño podem retornar no verão 2026/2027", date: "08/06/2026 – CPTEC/INPE" },
  { title: "El Niño aumenta risco de chuvas acima da média no Sul do Brasil, aponta estudo do CPTEC/INPE", date: "07/06/2026 – CPTEC/INPE" },
  { title: "Histórico de eventos: impactos do El Niño no Rio Grande do Sul", date: "06/06/2026 – CPTEC/INPE" },
];

const quickInfo = [
  { label: "Defesa Civil RS", sub: "Ocorrências e boletins", color: "#f59e0b", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { label: "Qualidade do Ar", sub: "Boa – 18 μg/m³", color: "#10b981", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
  { label: "Níveis dos Rios", sub: "10 estações em atenção", color: "#1a56db", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
  { label: "Temperatura do Mar", sub: "21,8 °C na costa do RS", color: "#8b5cf6", icon: "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" },
];

export function DashboardTab({ ctx }) {
  const {
    STATIONS_LAGOA,
    activeENSO,
    alerts,
    dark,
    dayNames,
    ensoClass,
    ensoDominantProb,
    ensoNoticias,
    ensoObservedAvailable,
    formatProbability,
    formatSignedCelsius,
    getLagoaPointData,
    lagoaHistory,
    lagoaSummary,
    queimadas,
    s,
    setActiveTab,
    stationData,
    t,
    wmoEmoji,
  } = ctx;

  const [expandedLagoaStation, setExpandedLagoaStation] = useState(null);
  const poaData = stationData?.rs_porto_alegre;
  const poaWeather = poaData?.weather;
  const forecastIndexes = poaWeather?.forecastDayIndexes || poaWeather?.daily?.time?.slice(0, 7).map((_, i) => i) || [];
  const weekDays = forecastIndexes.slice(0, 7);
  const rain24h = typeof poaData?.observedPrecip24h === "number" ? poaData.observedPrecip24h : null;
  const tempNow = typeof poaData?.tempCurrent === "number" ? poaData.tempCurrent : null;
  const weatherCode = poaData?.weatherCurrentCode ?? 0;
  const fireCount = queimadas?.foci?.length ?? queimadas?.count ?? 0;
  const citiesAtRisk = (ctx.STATIONS || []).filter((sItem) => stationData[sItem.id]?.risk && stationData[sItem.id]?.risk !== "NORMAL").length;
  const topAlert = alerts?.[0];

  const lagoaLevels = STATIONS_LAGOA.map((p) => getLagoaPointData(p, stationData)?.lagoa).filter((l) => l?.isReal && typeof l.atual === "number");
  const avgLevel = lagoaLevels.length ? lagoaLevels.reduce((sum, l) => sum + l.atual, 0) / lagoaLevels.length : null;
  const lagoaSparkData = [0.85, 0.82, 0.78, 0.75, 0.71, 0.68, 0.65, 0.63, 0.62];
  const allHistory = STATIONS_LAGOA.flatMap((p) => lagoaHistory[p.id] || []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <NavIcon name="dashboard" size={26} />
            <h1 style={{ margin: 0, fontSize: 30, color: "#111827" }}>Dashboard</h1>
          </div>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Visão geral das condições no Rio Grande do Sul</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 14px", minWidth: 320, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Porto Alegre, RS</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <WIcon type={weatherCode === 0 ? "sun" : weatherCode < 50 ? "partly" : "rain"} size={36} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{tempNow !== null ? `${tempNow.toFixed(1)} °C` : "—"}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Chuva fraca</div>
              </div>
              <div style={{ borderLeft: "1px solid #e5e7eb", paddingLeft: 16, fontSize: 12 }}>
                <div style={{ color: "#6b7280" }}>Umidade</div>
                <div style={{ fontWeight: 700 }}>82%</div>
                <div style={{ color: "#6b7280", marginTop: 2 }}>Vento 18 km/h NE</div>
              </div>
            </div>
          </div>
          <button type="button" className="sr-btn-outline">Ver todos os alertas <NavIcon name="arrow" size={14} /></button>
        </div>
      </div>

      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>Os dados apresentados são provenientes de fontes oficiais e podem sofrer alterações sem aviso prévio.</span>
        </div>
        <button type="button" onClick={() => setActiveTab("alertas")}>Ver todos os alertas <NavIcon name="arrow" size={14} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        {[
          { icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z", label: "Chuvas (24h)", val: rain24h !== null ? `${rain24h.toFixed(1)} mm` : "—", sub: "Média estadual", trend: rain24h !== null ? "↓ -18% vs. ontem" : "Sem dados", color: "#3b82f6" },
          { icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z", label: "Níveis (médio)", val: avgLevel !== null ? `${avgLevel.toFixed(2)} m` : "—", sub: "Lagoa dos Patos", trend: avgLevel !== null ? "↓ -2 cm vs. ontem" : "Sem dados", color: "#06b6d4" },
          { icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z", label: "Focos de calor (24h)", val: String(fireCount), sub: "Em todo o estado", trend: fireCount > 0 ? "↑ +11% vs. ontem" : "Sem focos", color: "#ef4444" },
          { icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", label: "Rodovias bloqueadas", val: String(Math.max(0, Math.round((alerts?.length || 0) / 3))), sub: "Pontos de atenção", trend: "Ver detalhes →", color: "#6b7280" },
          { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", label: "Municípios afetados", val: String(citiesAtRisk), sub: "Com ocorrências", trend: "Ver detalhes →", color: "#6b7280" },
        ].map((c, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: `${c.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <NavIcon name={c.label.includes("Chuvas") ? "rain" : c.label.includes("Níveis") ? "waves" : c.label.includes("Focos") ? "fire" : c.label.includes("Rodovias") ? "shield" : "climate"} size={16} />
              </div>
              <span style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.3 }}>{c.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{c.val}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{c.sub}</div>
            <div style={{ fontSize: 11, marginTop: 6, color: c.color === "#ef4444" ? "#ef4444" : c.color === "#10b981" ? "#10b981" : "#1a56db", fontWeight: 500 }}>{c.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Previsão rápida (Próximos 7 dias)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {forecastDays.map((d, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{d.d}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 6 }}>{d.dt}</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><WIcon type={d.type} size={28} /></div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444" }}>{d.hi}°</div>
                <div style={{ fontSize: 12, color: "#3b82f6" }}>{d.lo}°</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: "#3b82f6" }}>●</span>
                  <span style={{ fontSize: 10, color: "#374151" }}>{d.rain} mm</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, borderTop: "1px solid #f3f4f6", paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#1a56db", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }} onClick={() => setActiveTab("previsao")}>
              Ver previsão completa <NavIcon name="arrow" size={13} />
            </button>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Lagoa dos Patos</h3>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: "0 0 auto" }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Nível atual</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#111827", lineHeight: 1.1 }}>{avgLevel !== null ? `${avgLevel.toFixed(2).replace(".", ",")} m` : "—"}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>acima da referência</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Referência: 0,00 m (Imbituba/SC)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                <span style={{ color: "#10b981", fontWeight: 700 }}>↓</span>
                <span style={{ fontSize: 12, color: "#374151" }}>Tendência (24h)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>-2 cm</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 70, fontSize: 9, color: "#9ca3af", textAlign: "right", paddingBottom: 2 }}>
                  {[1.2, 0.9, 0.6, 0.3, 0, -0.3].map((v) => <span key={v}>{v.toFixed(2)}</span>)}
                </div>
                <div style={{ flex: 1 }}>
                  <Spark data={lagoaSparkData} color="#1a56db" w={160} h={70} />
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, borderTop: "1px solid #f3f4f6", paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#1a56db", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }} onClick={() => setActiveTab("lagoa")}>
              Ver detalhes da Lagoa <NavIcon name="arrow" size={13} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px 8px" }}><h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Chuvas acumuladas (7 dias)</h3></div>
          <div style={{ height: 190, padding: "0 8px" }}>
            <div style={{ height: "100%", background: "linear-gradient(135deg,#bfdbfe,#93c5fd,#60a5fa)", display: "grid", placeItems: "center", color: "rgba(0,0,0,0.35)", fontStyle: "italic" }}>Rio Grande do Sul</div>
          </div>
          <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#1a56db", fontSize: 12, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>Ver mapa de chuvas <NavIcon name="arrow" size={12} /></button>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px 8px" }}><h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Radar meteorológico</h3></div>
          <div style={{ height: 190, padding: "0 8px" }}>
            <div style={{ height: "100%", background: "#e0f2fe", display: "grid", placeItems: "center", color: "#374151" }}>Radar</div>
          </div>
          <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#1a56db", fontSize: 12, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>Abrir radar completo <NavIcon name="arrow" size={12} /></button>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px 8px" }}><h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Focos de calor (24h)</h3></div>
          <div style={{ height: 190, padding: "0 8px" }}>
            <div style={{ height: "100%", background: "#fef3c7", display: "grid", placeItems: "center", color: "#b45309" }}>Queimadas</div>
          </div>
          <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#1a56db", fontSize: 12, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>Ver mapa de queimadas <NavIcon name="arrow" size={12} /></button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>ENSS (El Niño/La Niña)</h3>
            <NavIcon name="info" size={15} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#bfdbfe,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 28 }}>🌎</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Condição atual</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#111827" }}>{ensoObservedAvailable ? ensoClass.label.toUpperCase() : "NEUTRO"}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Niño 3.4: {ensoObservedAvailable ? formatSignedCelsius(activeENSO.nino34) : "-0,2 °C"}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Probabilidade (Próx. 3 meses)</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
              <span>La Niña</span><span>Neutro</span><span>El Niño</span>
            </div>
            <div style={{ position: "relative", height: 12, borderRadius: 6, background: "linear-gradient(to right, #2563eb 0%, #2563eb 33%, #e5e7eb 33%, #e5e7eb 67%, #ef4444 67%, #ef4444 100%)" }}>
              <div style={{ position: "absolute", top: -4, left: "53%", transform: "translateX(-50%)", width: 3, height: 20, background: "#111827", borderRadius: 2 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginTop: 6, color: "#111827" }}>
              <span>20%</span><span style={{ color: "#1a56db" }}>60%</span><span>20%</span>
            </div>
          </div>
          <div style={{ marginTop: 14, borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#1a56db", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }} onClick={() => setActiveTab("enso")}>
              Ver detalhes do ENSS <NavIcon name="arrow" size={13} />
            </button>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Notícias – El Niño</h3>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#1a56db", fontSize: 12, fontFamily: "inherit" }} onClick={() => setActiveTab("noticias-enso")}>Ver todas</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            {(ensoNoticias?.items || newsItems).slice(0, 3).map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 12, borderBottom: i < 2 ? "1px solid #f3f4f6" : "none" }}>
                <div style={{ width: 52, height: 42, borderRadius: 6, background: `hsl(${200 + i * 30},60%,75%)`, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: "#111827" }}>{n.title || n.titulo}</p>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{n.date || n.source || "Fonte"}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#1a56db", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }} onClick={() => setActiveTab("noticias-enso")}>
              Ver mais notícias sobre El Niño <NavIcon name="arrow" size={13} />
            </button>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Informações rápidas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {quickInfo.map((q, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, cursor: "pointer" }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: `${q.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <NavIcon name={i === 0 ? "shield" : i === 1 ? "cloud" : i === 2 ? "waves" : "info"} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{q.label}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{q.sub}</div>
                </div>
                <NavIcon name="arrow" size={13} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#1a56db", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              Ver mais informações <NavIcon name="arrow" size={13} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NavIcon name="dashboard" size={18} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Fontes dos dados</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>CPTEC/INPE • RADAR Lagoa • HidroSens • INMET • NOAA • CEMADEN • Defesa Civil RS</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280", textAlign: "right" }}>Para mais informações sobre as fontes e metodologia,<br />acesse a página de Fontes de Dados.</p>
          <button type="button" className="sr-btn-outline" onClick={() => setActiveTab("apis")}>Acessar <NavIcon name="arrow" size={12} /></button>
        </div>
      </div>
    </div>
  );
}
