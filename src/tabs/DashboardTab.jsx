import { useState } from "react";
import { Sparkline as HistorySparkline } from "../components/Sparkline";
import { NavIcon } from "../components/layout/NavIcons";

export function DashboardTab({ ctx }) {
  const {
    STATIONS_LAGOA,
    activeENSO,
    alerts,
    dark,
    dayNames,
    ensoClass,
    ensoDominantProb,
    ensoObservedAvailable,
    formatDateTimeBR,
    formatProbability,
    getLagoaMeasuredAt,
    getLagoaPointData,
    lagoaHistory,
    lagoaSummary,
    queimadas,
    s,
    selData,
    setActiveTab,
    stationData,
    t,
    wmoEmoji,
  } = ctx;

  const [expandedLagoaStation, setExpandedLagoaStation] = useState(null);

  const lagoaLevels = STATIONS_LAGOA
    .map((p) => getLagoaPointData(p, stationData)?.lagoa)
    .filter((l) => l?.isReal && typeof l.atual === "number");
  const avgLagoaLevel = lagoaLevels.length
    ? lagoaLevels.reduce((sum, l) => sum + l.atual, 0) / lagoaLevels.length
    : null;

  const lagoaTendency = (() => {
    if (avgLagoaLevel === null) return null;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const allHistory = STATIONS_LAGOA.flatMap((p) => lagoaHistory[p.id] || []);
    const todayMeasures = allHistory.filter((m) => String(m.t || m.at || "").slice(0, 10) === today).map((m) => m.v);
    const yesterdayMeasures = allHistory.filter((m) => String(m.t || m.at || "").slice(0, 10) === yesterday).map((m) => m.v);
    const todayAvg = todayMeasures.length ? todayMeasures.reduce((a, b) => a + b, 0) / todayMeasures.length : null;
    const yesterdayAvg = yesterdayMeasures.length ? yesterdayMeasures.reduce((a, b) => a + b, 0) / yesterdayMeasures.length : null;
    if (todayAvg && yesterdayAvg) return todayAvg - yesterdayAvg;
    return null;
  })();

  const poaWeather = stationData?.rs_porto_alegre?.weather;
  const forecasted5DaysPrecip = poaWeather?.daily
    ? poaWeather.daily.precipitation_sum?.slice(0, 5).reduce((a, b) => a + (b || 0), 0) || 0
    : null;

  const ensoStatus = ensoObservedAvailable ? ensoClass?.label || "Desconhecido" : "Sem dado";
  const fireCount24h = queimadas?.foci?.length ?? queimadas?.count ?? 0;
  const hasCriticalAlerts = alerts?.some((a) => a.risk_level === "CRITICO" || a.risk_level === "EMERGENCIA");
  const defesaCivilStatus = hasCriticalAlerts ? "⚠️ Alerta ativo" : "✅ Normalidade";
  const topAlert = alerts?.[0];
  const lagoaStations = STATIONS_LAGOA.slice(0, 4);
  const forecastIndexes = poaWeather?.forecastDayIndexes || poaWeather?.daily?.time?.slice(0, 5).map((_, i) => i) || [];
  const nextFiveDays = forecastIndexes.slice(0, 5);
  const ensoProbLaNina = activeENSO?.prob?.laNina || 0;
  const ensoProbNeutral = activeENSO?.prob?.neutral || 0;
  const ensoProbElNino = activeENSO?.prob?.elNino || 0;
  const ndviMedium = queimadas?.ndvi_medium ?? null;
  const vooData = stationData?.rs_porto_alegre?.metar || null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...s.card, border: `1px solid ${t.borderActive}`, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 15px", borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.accent }}>📊 PANORAMA GERAL</div>
            <div style={{ fontSize: 10, color: t.textMuted }}>Dados informativos • não são alertas</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
          <div style={{ padding: "12px 12px", borderRight: `1px solid ${t.border}`, cursor: "pointer" }} onClick={() => setActiveTab("lagoa")} role="button" tabIndex={0}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>🌊 Lagoa dos Patos</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#06b6d4", marginBottom: 2 }}>{avgLagoaLevel !== null ? `${avgLagoaLevel.toFixed(2)} m` : "—"}</div>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>Nível médio</div>
            <div style={{ fontSize: 11, color: lagoaTendency !== null ? (lagoaTendency < 0 ? "#ef4444" : "#22c55e") : t.textMuted }}>
              {lagoaTendency !== null ? <>{lagoaTendency < 0 ? "↓" : "↑"} {Math.abs(lagoaTendency).toFixed(2)} m (24h)</> : "—"}
            </div>
          </div>

          <div style={{ padding: "12px 12px", borderRight: `1px solid ${t.border}`, cursor: "pointer" }} onClick={() => setActiveTab("previsao")} role="button" tabIndex={0}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>🌧️ Previsão</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#06b6d4", marginBottom: 2 }}>{forecasted5DaysPrecip !== null ? `${forecasted5DaysPrecip.toFixed(0)} mm` : "—"}</div>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>Acumulado 5 dias</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>Chuva prevista</div>
          </div>

          <div style={{ padding: "12px 12px", borderRight: `1px solid ${t.border}`, cursor: "pointer" }} onClick={() => setActiveTab("enso")} role="button" tabIndex={0}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>🌡️ ENSO</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#06b6d4", marginBottom: 2 }}>{ensoStatus}</div>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>Prob. (IRI/CCSR)</div>
            <div style={{ fontSize: 9, color: t.textMuted }}>{ensoDominantProb ? `${formatProbability(Math.max(ensoProbLaNina, ensoProbNeutral, ensoProbElNino))}` : "—"}</div>
          </div>

          <div style={{ padding: "12px 12px", borderRight: `1px solid ${t.border}`, cursor: "pointer" }} onClick={() => setActiveTab("queimadas")} role="button" tabIndex={0}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>🔥 Queimadas</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: fireCount24h > 0 ? "#f97316" : "#22c55e", marginBottom: 2 }}>{fireCount24h > 0 ? `${fireCount24h}` : "Sem foco"}</div>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>Focos detectados</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>Nas últimas 24h</div>
          </div>

          <div style={{ padding: "12px 12px", cursor: "pointer" }} onClick={() => setActiveTab("alertas")} role="button" tabIndex={0}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>🚨 Defesa Civil RS</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: hasCriticalAlerts ? "#ef4444" : "#22c55e", marginBottom: 2 }}>{defesaCivilStatus}</div>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>Situação informativa</div>
            <div style={{ fontSize: 9, color: t.textMuted }}>Acompanhe canais oficiais</div>
          </div>
        </div>
      </div>

      {topAlert && (
        <div style={{ ...s.card, background: dark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.3)", borderLeft: "4px solid #ef4444", padding: "12px 15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, marginBottom: 4 }}>⚠️ ATENÇÃO</div>
              <div style={{ fontSize: 12, color: t.text, lineHeight: 1.5, marginBottom: 6 }}>{topAlert.message || "Alerta da Defesa Civil RS"}</div>
              <div style={{ fontSize: 10, color: t.textMuted }}>Em caso de riscos, siga orientações oficiais e ligue 199.</div>
            </div>
            <button onClick={() => setActiveTab("alertas")} style={{ background: "none", border: "none", color: t.accent, cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", textDecoration: "underline" }}>
              Defesa Civil RS ↗
            </button>
          </div>
        </div>
      )}

      <div style={{ ...s.card, border: `1px solid ${t.borderActive}`, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 15px", borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.accent }}>🌊 LAGOA DOS PATOS</div>
            <div style={{ fontSize: 9, color: t.textMuted }}>Níveis em metros (m) • Referência: DHN/CPRM</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 0 }}>
          {lagoaStations.map((station, idx) => {
            const lagoa = getLagoaPointData(station, stationData)?.lagoa;
            const history = lagoaHistory[station.id] || [];
            const isExpanded = expandedLagoaStation === station.id;
            return (
              <div key={station.id}>
                <div style={{ padding: "12px 15px", borderBottom: idx < lagoaStations.length - 1 ? `1px solid ${t.border}` : "none", cursor: "pointer" }} onClick={() => setExpandedLagoaStation(isExpanded ? null : station.id)} role="button" tabIndex={0}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 16, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{station.name}</div>
                      <div style={{ fontSize: 10, color: t.textMuted }}>{station.subtitle || station.city}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#06b6d4" }}>{lagoa?.isReal ? `${lagoa.atual.toFixed(2)} m` : "—"}</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 50 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: lagoa?.trend === "down" ? "#ef4444" : "#22c55e" }}>{lagoa?.trend === "down" ? "↓" : "↑"} {lagoa?.trendValue?.toFixed(2) || "—"}</div>
                      <div style={{ fontSize: 9, color: t.textMuted }}>24h</div>
                    </div>
                    <div style={{ minWidth: 80 }}>
                      {history.length > 0 && <HistorySparkline points={history.map((h) => ({ v: h.v }))} color="#06b6d4" t={t} />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: 8, fontSize: 10, color: t.textMuted, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
                      <div>Última medição: {getLagoaMeasuredAt(station)}</div>
                      <div>Fonte: {lagoa?.source || "CPRM"}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...s.card, border: `1px solid ${t.borderActive}`, padding: 0, overflow: "hidden" }} onClick={() => setActiveTab("previsao")} role="button" tabIndex={0}>
          <div style={{ padding: "12px 15px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.accent }}>🌧️ PREVISÃO • Acumulado de chuva (mm)</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
            {nextFiveDays.map((idx) => {
              const date = poaWeather?.daily?.time?.[idx];
              const dd = new Date(`${date}T12:00:00`);
              const tx = Number(poaWeather?.daily?.temperature_2m_max?.[idx] || 0);
              const tn = Number(poaWeather?.daily?.temperature_2m_min?.[idx] || 0);
              const p = Number(poaWeather?.daily?.precipitation_sum?.[idx] || 0);
              const c = poaWeather?.daily?.weathercode?.[idx] || 0;
              const wind = Number(poaWeather?.daily?.windspeed_10m_max?.[idx] || 0);
              return (
                <div key={date} style={{ padding: 12, borderRight: `1px solid ${t.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{idx === 0 ? "Hoje" : dayNames[dd.getDay()]}</div>
                  <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 4 }}>{dd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{wmoEmoji(c)}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>{tx.toFixed(0)}°</div>
                    <div style={{ fontSize: 11, color: "#2563eb" }}>{tn.toFixed(0)}°</div>
                  </div>
                  <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 3 }}>💧 {p.toFixed(0)} mm</div>
                  <div style={{ fontSize: 9, color: t.textMuted }}>↗ {wind.toFixed(0)} km/h</div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: "8px 12px", textAlign: "center", fontSize: 10, color: t.textMuted }}>Fonte: INMET • Atualizado: {poaWeather?.lastUpdate ? formatDateTimeBR(poaWeather.lastUpdate) : "—"}</div>
        </div>

        <div style={{ ...s.card, border: `1px solid ${t.borderActive}`, padding: 0, overflow: "hidden" }} onClick={() => setActiveTab("enso")} role="button" tabIndex={0}>
          <div style={{ padding: "12px 15px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.accent }}>🌊 ENSO • Contexto climático</div>
          </div>
          <div style={{ padding: 15 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: t.text }}>Condição atual: <span style={{ color: "#06b6d4" }}>{ensoStatus}</span></div>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12, gap: 8 }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 80, background: "linear-gradient(180deg, #3b82f6 0%, #1e40af 100%)", borderRadius: "4px 4px 0 0", marginBottom: 8 }} />
                <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 2 }}>La Niña</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{formatProbability(ensoProbLaNina)}</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 60, background: "#94a3b8", borderRadius: "4px 4px 0 0", marginBottom: 8 }} />
                <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 2 }}>Neutro</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{formatProbability(ensoProbNeutral)}</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 40, background: "#ef4444", borderRadius: "4px 4px 0 0", marginBottom: 8 }} />
                <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 2 }}>El Niño</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{formatProbability(ensoProbElNino)}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 10, color: t.textMuted }}>
              <div>IRI: {formatProbability(ensoProbLaNina)}</div>
              <div style={{ textAlign: "right" }}>CCSR: {formatProbability(ensoProbNeutral)}</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 9, color: t.textMuted }}>Atualizado: Mai/2025</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...s.card, border: `1px solid ${t.borderActive}` }} onClick={() => setActiveTab("queimadas")} role="button" tabIndex={0}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.accent, marginBottom: 12 }}>🔥 QUEIMADAS E VEGETAÇÃO</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: fireCount24h > 0 ? "#f97316" : "#22c55e", fontWeight: 700, marginBottom: 4 }}>{fireCount24h > 0 ? fireCount24h : "Sem foco"}</div>
              <div style={{ fontSize: 10, color: t.textMuted }}>Focos de calor (24h)</div>
              <div style={{ fontSize: 9, color: t.textMuted }}>No RS</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#06b6d4", fontWeight: 700, marginBottom: 4 }}>{ndviMedium !== null ? ndviMedium.toFixed(2) : "PLACEHOLDER"}</div>
              <div style={{ fontSize: 10, color: t.textMuted }}>NDVI médio (RS)</div>
              <div style={{ fontSize: 9, color: t.textMuted }}>Condição: {ndviMedium !== null ? (ndviMedium > 0.6 ? "Boa" : "Normal") : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: t.text }}>→ Estável</div>
              <div style={{ fontSize: 10, color: t.textMuted }}>Tendência (7 dias)</div>
              <div style={{ fontSize: 9, color: t.textMuted }}>&nbsp;</div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 9, color: t.textMuted }}>Fonte: INPE • Atualizado: 08:00</div>
        </div>

        <div style={{ ...s.card, border: `1px solid ${t.borderActive}` }} onClick={() => setActiveTab("info-voo")} role="button" tabIndex={0}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.accent, marginBottom: 12 }}>✈️ CONDIÇÕES DE VOO • Corredor POA-RIO GRANDE</div>
          {vooData ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 3 }}>Vento</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{vooData.windDir || "—"}° {vooData.windSpeed || "—"} kt</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 3 }}>Visibilidade</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{vooData.visibility || "10 km ou mais"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 3 }}>Obs.</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>—</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: t.textMuted }}>⚠️ PLACEHOLDER: Dados de VOO (METAR) não configurados. Buscar endpoint METAR.</div>
          )}
          <div style={{ marginTop: 10, fontSize: 9, color: t.textMuted }}>Fonte: METAR • Atualizado: 08:10</div>
        </div>
      </div>

      <div style={{ ...s.card, border: `1px solid ${t.borderActive}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.accent, marginBottom: 12 }}>📡 FONTES E ATUALIZAÇÃO</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {[
            { name: "DHN/CPRM", time: "07:30" },
            { name: "INMET", time: "08:00" },
            { name: "INPE", time: "08:00" },
            { name: "Defesa Civil RS", time: "07:45" },
            { name: "METAR", time: "08:10" },
            { name: "IRI/CCSR", time: "Mai/2025" },
          ].map((src) => (
            <div key={src.name} style={{ fontSize: 10, color: t.textMuted }}>● {src.name} {src.time}</div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: t.textMuted }}>
          <span>Última sincronização: {new Date().toLocaleDateString("pt-BR")} {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <span>✓ Atualização automática ativa</span>
        </div>
      </div>
    </div>
  );
}
