import { KpiCard } from "../components/layout/KpiCard";
import { LineChart } from "../components/layout/LineChart";
import { NavIcon } from "../components/layout/NavIcons";

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
    formatDateTimeBR,
    formatProbability,
    formatSignedCelsius,
    getLagoaMeasuredAt,
    getLagoaPointData,
    lagoaHistory,
    lagoaStatusColor,
    lagoaStatusLabel,
    lagoaSummary,
    percentValue,
    queimadas,
    selData,
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
  const weatherCode = poaData?.weatherCurrentCode;

  const lagoaLevels = STATIONS_LAGOA
    .map((p) => getLagoaPointData(p, stationData)?.lagoa)
    .filter((l) => l?.isReal && typeof l.atual === "number");
  const avgLevel = lagoaLevels.length
    ? lagoaLevels.reduce((s, l) => s + l.atual, 0) / lagoaLevels.length
    : null;

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

  const fireCount = queimadas?.foci?.length ?? queimadas?.count ?? 0;
  const citiesAtRisk = STATIONS.filter((s) => {
    const d = stationData[s.id];
    return d && d.risk && d.risk !== "NORMAL";
  }).length;

  const topAlert = alerts?.[0];

  return (
    <div>
      <div className="sr-info-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavIcon name="info" size={18} />
          <span>
            {topAlert
              ? `Aviso oficial: ${topAlert.message?.slice(0, 120)}${topAlert.message?.length > 120 ? "…" : ""}`
              : "Sem avisos oficiais ativos. Em emergência, ligue 199 (Defesa Civil RS)."}
          </span>
        </div>
        <button type="button" onClick={() => setActiveTab("alertas")}>
          Ver todos os alertas <NavIcon name="arrow" size={14} />
        </button>
      </div>

      <div className="sr-kpi-row">
        <KpiCard
          icon="rain"
          label="Chuva (24h)"
          value={rain24h !== null ? `${rain24h.toFixed(1)} mm` : "—"}
          sublabel="Porto Alegre · Open-Meteo"
          accent="blue"
        />
        <KpiCard
          icon="waves"
          label="Níveis d'água"
          value={avgLevel !== null ? `${avgLevel.toFixed(2)} m` : "—"}
          sublabel={`${lagoaSummary.monitored}/${lagoaSummary.total} estações`}
          accent="green"
        />
        <KpiCard
          icon="fire"
          label="Focos de calor"
          value={String(fireCount)}
          sublabel="INPE · RS"
          trend={fireCount > 0 ? "Monitorar" : "Sem focos"}
          trendDir={fireCount > 0 ? "up" : "down"}
          accent="orange"
        />
        <KpiCard
          icon="shield"
          label="Alertas ativos"
          value={String(alerts?.length || 0)}
          sublabel="Defesa Civil RS"
          accent="red"
        />
        <KpiCard
          icon="climate"
          label="Cidades em monitoramento"
          value={String(citiesAtRisk)}
          sublabel={`de ${STATIONS.length} acompanhadas`}
          accent="purple"
        />
      </div>

      <div className="sr-grid-2-1">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">Previsão do tempo — próximos 7 dias</h3>
          {poaWeather?.daily ? (
            <table className="sr-forecast-table">
              <thead>
                <tr>
                  <th>Dia</th>
                  {weekDays.map((idx) => {
                    const date = poaWeather.daily.time[idx];
                    const dd = new Date(`${date}T12:00:00`);
                    return (
                      <th key={date}>
                        <div className="sr-day-label">{idx === forecastIndexes[0] ? "Hoje" : dayNames[dd.getDay()]}</div>
                        <div style={{ fontSize: 10, fontWeight: 400 }}>{dd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tempo</td>
                  {weekDays.map((idx) => (
                    <td key={idx}>{wmoEmoji(poaWeather.daily.weathercode?.[idx] || 0)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Máx</td>
                  {weekDays.map((idx) => (
                    <td key={idx} className="sr-temp-max">
                      {Number(poaWeather.daily.temperature_2m_max?.[idx] || 0).toFixed(0)}°
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Mín</td>
                  {weekDays.map((idx) => (
                    <td key={idx} className="sr-temp-min">
                      {Number(poaWeather.daily.temperature_2m_min?.[idx] || 0).toFixed(0)}°
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Chuva</td>
                  {weekDays.map((idx) => (
                    <td key={idx} className="sr-rain">
                      {Number(poaWeather.daily.precipitation_sum?.[idx] || 0).toFixed(1)} mm
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="sr-chart-empty">Carregando previsão…</div>
          )}
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={() => setActiveTab("previsao")}>
            Ver previsão completa (14 dias) <NavIcon name="arrow" size={14} />
          </button>
        </div>

        <div className="sr-card-v2 sr-link-card" role="button" tabIndex={0} onClick={() => setActiveTab("lagoa")} onKeyDown={(e) => { if (e.key === "Enter") setActiveTab("lagoa"); }}>
          <h3 className="sr-card-title">Lagoa dos Patos — nível médio</h3>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--sr-navy)", marginBottom: 4 }}>
            {avgLevel !== null ? `${avgLevel.toFixed(2).replace(".", ",")} m` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "var(--sr-text-muted)", marginBottom: 12 }}>
            {lagoaSummary.above > 0 ? `${lagoaSummary.above} acima da cota` : lagoaSummary.attention > 0 ? `${lagoaSummary.attention} em atenção` : "Situação normal"}
          </div>
          <LineChart points={lagoaChartPoints} width={280} height={100} color="#1a6fd4" />
          <div className="sr-card-footer-link">Ver detalhes <NavIcon name="arrow" size={14} /></div>
        </div>
      </div>

      <div className="sr-grid-3">
        <div className="sr-card-v2 sr-link-card" role="button" tabIndex={0} onClick={() => setActiveTab("copernicus")}>
          <h3 className="sr-card-title">Sensoriamento remoto</h3>
          <div style={{ height: 120, background: "linear-gradient(135deg,#dbeafe,#bfdbfe)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sr-blue)", fontWeight: 600, fontSize: 13 }}>
            Copernicus · Água · NDVI · S1
          </div>
          <div className="sr-card-footer-link">Abrir Copernicus <NavIcon name="arrow" size={14} /></div>
        </div>
        <div className="sr-card-v2 sr-link-card" role="button" tabIndex={0} onClick={() => setActiveTab("queimadas")}>
          <h3 className="sr-card-title">Focos de calor</h3>
          <div style={{ height: 120, background: "linear-gradient(135deg,#ffedd5,#fed7aa)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sr-orange)", fontWeight: 700, fontSize: 24 }}>
            {fireCount}
          </div>
          <div className="sr-card-footer-link">Ver queimadas <NavIcon name="arrow" size={14} /></div>
        </div>
        <div className="sr-card-v2 sr-link-card" role="button" tabIndex={0} onClick={() => setActiveTab("lagoa")}>
          <h3 className="sr-card-title">Estações da Lagoa</h3>
          <div style={{ fontSize: 13, color: "var(--sr-text-muted)", lineHeight: 1.6 }}>
            {STATIONS_LAGOA.slice(0, 4).map((p) => {
              const lagoa = getLagoaPointData(p, stationData)?.lagoa;
              const level = lagoa?.isReal ? `${lagoa.atual.toFixed(2)} m` : "sem leitura";
              return <div key={p.id}>{p.name}: <strong>{level}</strong></div>;
            })}
          </div>
          <div className="sr-card-footer-link">Ver mapa <NavIcon name="arrow" size={14} /></div>
        </div>
      </div>

      <div className="sr-grid-3">
        <div className="sr-card-v2">
          <h3 className="sr-card-title">ENSO — El Niño / La Niña</h3>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            {ensoObservedAvailable ? `${ensoClass.label} · Niño 3.4 ${formatSignedCelsius(activeENSO.nino34)}` : "Dado observado indisponível"}
          </div>
          {ensoDominantProb && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[
                { label: "La Niña", val: activeENSO.prob?.laNina, color: "#2563eb" },
                { label: "Neutro", val: activeENSO.prob?.neutral, color: "#94a3b8" },
                { label: "El Niño", val: activeENSO.prob?.elNino, color: "#dc2626" },
              ].map((item) => (
                <div key={item.label} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 60, display: "flex", alignItems: "flex-end" }}>
                    <div style={{ width: "100%", height: `${percentValue(item.val) || 0}%`, minHeight: 4, background: item.color, borderRadius: "4px 4px 0 0" }} />
                  </div>
                  <div style={{ fontSize: 10, marginTop: 4, color: "var(--sr-text-muted)" }}>{item.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{formatProbability(item.val)}</div>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={() => setActiveTab("enso")}>
            Ver ENSO completo <NavIcon name="arrow" size={14} />
          </button>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Notícias</h3>
          {(ensoNoticias?.items || []).slice(0, 3).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 6, background: "var(--sr-blue-light)", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{item.title || item.titulo || "Sem título"}</div>
                <div style={{ fontSize: 11, color: "var(--sr-text-muted)", marginTop: 2 }}>{item.source || "Fonte"}</div>
              </div>
            </div>
          ))}
          {!(ensoNoticias?.items?.length) && (
            <div style={{ fontSize: 13, color: "var(--sr-text-muted)" }}>Abra a aba Notícias para carregar o feed.</div>
          )}
          <button type="button" className="sr-card-footer-link" style={{ background: "none", border: "none", width: "100%" }} onClick={() => setActiveTab("noticias-enso")}>
            Ver mais notícias <NavIcon name="arrow" size={14} />
          </button>
        </div>

        <div className="sr-card-v2">
          <h3 className="sr-card-title">Informações rápidas</h3>
          {[
            { icon: "🌡️", label: "Temperatura POA", value: tempNow !== null ? `${tempNow.toFixed(1)} °C` : "—" },
            { icon: "🌧️", label: "Chuva prevista (14d)", value: poaData?.precip != null ? `${poaData.precip.toFixed(0)} mm` : "—" },
            { icon: "💨", label: "Vento máx. previsto", value: poaData?.windMax != null ? `${poaData.windMax.toFixed(0)} km/h` : "—" },
            { icon: "🌊", label: "Pontos Lagoa c/ leitura", value: `${lagoaSummary.monitored}/${lagoaSummary.total}` },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--sr-border)", fontSize: 13 }}>
              <span style={{ color: "var(--sr-text-muted)" }}>{item.icon} {item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="sr-sources-footer">
        <span>Fontes: ANA · CPRM · FEPAM · Open-Meteo · INMET · INPE · NOAA · Copernicus</span>
        <button type="button" onClick={() => setActiveTab("apis")}>Ver detalhes das fontes</button>
      </div>
    </div>
  );
}
