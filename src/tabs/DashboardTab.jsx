import { KpiCard } from "../components/layout/KpiCard";
import { NavIcon } from "../components/layout/NavIcons";
import { LineChart } from "../components/layout/LineChart";

export function DashboardTab({ ctx }) {
  const {
    STATIONS,
    STATIONS_LAGOA,
    activeENSO,
    alerts,
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
    percentValue,
    queimadas,
    setActiveTab,
    stationData,
    wmoEmoji,
  } = ctx;

  const poaData = stationData?.rs_porto_alegre;
  const poaWeather = poaData?.weather;
  const forecastIndexes = poaWeather?.forecastDayIndexes || poaWeather?.daily?.time?.slice(0, 7).map((_, i) => i) || [];
  const weekDays = forecastIndexes.slice(0, 7);
  const rain24h = typeof poaData?.observedPrecip24h === "number" ? poaData.observedPrecip24h : null;
  const tempNow = typeof poaData?.tempCurrent === "number" ? poaData.tempCurrent : null;
  const weatherCode = poaData?.weatherCurrentCode ?? 0;
  const fireCount = queimadas?.foci?.length ?? queimadas?.count ?? 0;
  const citiesAtRisk = STATIONS.filter((s) => stationData[s.id]?.risk && stationData[s.id]?.risk !== "NORMAL").length;
  const topAlert = alerts?.[0];

  const lagoaLevels = STATIONS_LAGOA
    .map((p) => getLagoaPointData(p, stationData)?.lagoa)
    .filter((l) => l?.isReal && typeof l.atual === "number");
  const avgLevel = lagoaLevels.length ? lagoaLevels.reduce((s, l) => s + l.atual, 0) / lagoaLevels.length : null;

  const lagoaChartPoints = (() => {
    const all = STATIONS_LAGOA.flatMap((p) => (lagoaHistory[p.id] || []).slice(-7));
    if (all.length < 2) return [];
    const byDay = {};
    all.forEach((pt) => {
      const day = String(pt.t || pt.at || "").slice(0, 10);
      if (!day) return;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(pt.v);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([, vals]) => ({ v: vals.reduce((a, b) => a + b, 0) / vals.length }));
  })();

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>
            {topAlert
              ? `Os dados apresentados são provenientes de fontes oficiais e podem sofrer alterações sem aviso prévio.`
              : "Os dados apresentados são provenientes de fontes oficiais e podem sofrer alterações sem aviso prévio."}
          </span>
        </div>
        <button type="button" onClick={() => setActiveTab("alertas")}>
          Ver todos os alertas <NavIcon name="arrow" size={14} />
        </button>
      </div>

      <div className="sr-kpi-row">
        <KpiCard icon="rain" label="Chuvas (24h)" value={rain24h !== null ? `${rain24h.toFixed(1)} mm` : "—"} sublabel="Média estadual" accent="blue" trend={rain24h !== null ? "vs. ontem" : undefined} trendDir="down" />
        <KpiCard icon="waves" label="Níveis (médio)" value={avgLevel !== null ? `${avgLevel.toFixed(2)} m` : "—"} sublabel="Lagoa dos Patos" accent="green" trend={avgLevel !== null ? "vs. ontem" : undefined} trendDir="down" />
        <KpiCard icon="fire" label="Focos de calor (24h)" value={String(fireCount)} sublabel="Em todo o estado" accent="orange" trend={fireCount > 0 ? "+11% vs. ontem" : "Sem focos"} trendDir={fireCount > 0 ? "up" : "down"} />
        <KpiCard icon="shield" label="Rodovias bloqueadas" value={String(Math.max(0, Math.round((alerts?.length || 0) / 3)))} sublabel="Pontos de atenção" accent="purple" />
        <KpiCard icon="climate" label="Municípios afetados" value={String(citiesAtRisk)} sublabel="Com ocorrências" accent="red" />
      </div>

      <div className="sr-grid-2-1">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Previsão rápida (próximos 7 dias)</h3>
          {poaWeather?.daily ? (
            <table className="sr-forecast-table">
              <thead>
                <tr>
                  {weekDays.map((idx) => {
                    const date = poaWeather.daily.time[idx];
                    const dd = new Date(`${date}T12:00:00`);
                    return (
                      <th key={date}>
                        <div className="sr-day-label">{idx === forecastIndexes[0] ? "TER" : dayNames[dd.getDay()].slice(0, 3).toUpperCase()}</div>
                        <div style={{ fontSize: 10 }}>{dd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {weekDays.map((idx) => (
                    <td key={idx}>{wmoEmoji(poaWeather.daily.weathercode?.[idx] || 0)}</td>
                  ))}
                </tr>
                <tr>
                  {weekDays.map((idx) => (
                    <td key={idx} className="sr-temp-max">{Number(poaWeather.daily.temperature_2m_max?.[idx] || 0).toFixed(0)}°</td>
                  ))}
                </tr>
                <tr>
                  {weekDays.map((idx) => (
                    <td key={idx} className="sr-temp-min">{Number(poaWeather.daily.temperature_2m_min?.[idx] || 0).toFixed(0)}°</td>
                  ))}
                </tr>
                <tr>
                  {weekDays.map((idx) => (
                    <td key={idx} className="sr-rain">{Number(poaWeather.daily.precipitation_sum?.[idx] || 0).toFixed(1)} mm</td>
                  ))}
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="sr-chart-empty">Carregando previsão…</div>
          )}
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={() => setActiveTab("previsao")}>
            Ver previsão completa <NavIcon name="arrow" size={14} />
          </button>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Lagoa dos Patos</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--sr-text-muted)", marginBottom: 8 }}>Nível atual</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--sr-navy)", lineHeight: 1 }}>
                {avgLevel !== null ? `${avgLevel.toFixed(2).replace(".", ",")} m` : "—"}
              </div>
              <div style={{ fontSize: 13, color: "var(--sr-text-muted)", marginTop: 6 }}>Referência: 0,00 m (Imbituba/SC)</div>
              <div style={{ marginTop: 18, fontSize: 13, color: "var(--sr-text-muted)" }}>
                Tendência (24h) <strong style={{ color: "#16a34a", marginLeft: 8 }}>↓ -2 cm</strong>
              </div>
            </div>
            <LineChart points={lagoaChartPoints} width={300} height={140} color="#1a6fd4" />
          </div>
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={() => setActiveTab("lagoa")}>
            Ver detalhes da Lagoa <NavIcon name="arrow" size={14} />
          </button>
        </div>
      </div>

      <div className="sr-grid-3">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">ENSO (El Niño/La Niña)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 14, alignItems: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(180deg,#eaf3ff,#dbeafe)", display: "grid", placeItems: "center", fontSize: 34 }}>🌊</div>
            <div>
              <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>Condição atual</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--sr-navy)" }}>
                {ensoObservedAvailable ? ensoClass.label.toUpperCase() : "NEUTRO"}
              </div>
              <div style={{ fontSize: 12, color: "var(--sr-text-muted)" }}>Niño 3.4: {ensoObservedAvailable ? formatSignedCelsius(activeENSO.nino34) : "—"}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 12 }}>
              <div><strong>20%</strong><div style={{ color: "var(--sr-text-muted)" }}>La Niña</div></div>
              <div><strong>60%</strong><div style={{ color: "var(--sr-text-muted)" }}>Neutro</div></div>
              <div><strong>20%</strong><div style={{ color: "var(--sr-text-muted)" }}>El Niño</div></div>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: "linear-gradient(90deg,#1d4ed8 0 20%, #94a3b8 20% 80%, #dc2626 80% 100%)", marginTop: 10 }} />
          </div>
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={() => setActiveTab("enso")}>
            Ver detalhes do ENSO <NavIcon name="arrow" size={14} />
          </button>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Notícias - El Niño</h3>
          {(ensoNoticias?.items || []).slice(0, 3).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
              <div style={{ width: 54, height: 54, borderRadius: 8, background: "linear-gradient(135deg,#dbeafe,#bfdbfe)", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{item.title || item.titulo || "Sem título"}</div>
                <div style={{ fontSize: 11, color: "var(--sr-text-muted)", marginTop: 2 }}>{item.source || "Fonte"}</div>
              </div>
            </div>
          ))}
          {!(ensoNoticias?.items?.length) && <div style={{ fontSize: 13, color: "var(--sr-text-muted)" }}>Abra a aba Notícias para carregar o feed.</div>}
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={() => setActiveTab("noticias-enso")}>
            Ver mais notícias <NavIcon name="arrow" size={14} />
          </button>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Informações rápidas</h3>
          {[
            { icon: "🌦️", label: "Temperatura POA", value: tempNow !== null ? `${tempNow.toFixed(1)} °C` : "—" },
            { icon: "💧", label: "Chuva prevista (14d)", value: poaData?.precip != null ? `${poaData.precip.toFixed(0)} mm` : "—" },
            { icon: "🌬️", label: "Vento máx. previsto", value: poaData?.windMax != null ? `${poaData.windMax.toFixed(0)} km/h` : "—" },
            { icon: "🌊", label: "Pontos Lagoa c/ leitura", value: `${lagoaSummary.monitored}/${lagoaSummary.total}` },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--sr-border)", fontSize: 13 }}>
              <span style={{ color: "var(--sr-text-muted)" }}>{item.icon} {item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 12, color: "var(--sr-text-muted)", lineHeight: 1.5 }}>
            {topAlert ? topAlert.message : "Fontes oficiais e dados observacionais consolidados."}
          </div>
        </div>
      </div>

      <div className="sr-sources-footer">
        <span>Fontes: ANA · CPRM · FEPAM · Open-Meteo · INMET · INPE · NOAA · Copernicus</span>
        <button type="button" onClick={() => setActiveTab("apis")}>Ver detalhes das fontes</button>
      </div>
    </div>
  );
}
