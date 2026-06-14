import {
  CondicoesVoo,
  ENSOCard,
  LagoadosPatos,
  MOCK_LAGOA,
  MOCK_RIOS,
  MOCK_RODOVIAS,
  PanoramaGeral,
  PrevisaoRioGrande,
  QueimadasVegetacao,
} from "../components/cards";

function toLagoaRows(STATIONS_LAGOA, stationData, getLagoaPointData, lagoaHistory = {}) {
  const rows = STATIONS_LAGOA.map((point) => {
    const lagoa = getLagoaPointData(point, stationData)?.lagoa;
    if (!lagoa?.isReal || typeof lagoa.atual !== "number") return null;
    const historyValues = (lagoaHistory[point.id] || [])
      .map((item) => Number(item?.v))
      .filter(Number.isFinite)
      .slice(-7);
    const historyTrend = historyValues.length >= 2
      ? historyValues[historyValues.length - 1] - historyValues[historyValues.length - 2]
      : null;
    return {
      id: point.id,
      nome: point.name,
      subEstacao: point.rioRef || point.name,
      nivelM: lagoa.atual,
      variacaoM: typeof historyTrend === "number" ? historyTrend : null,
      historico: historyValues.length >= 2 ? historyValues : [],
      temHistorico: historyValues.length >= 2,
      hora: lagoa.measuredAt ? new Date(lagoa.measuredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--",
      fonte: lagoa.source || "RADAR",
    };
  }).filter(Boolean);
  return rows;
}

function buildRoadRows(roadBlocks) {
  const brs = Array.isArray(roadBlocks?.brs) ? roadBlocks.brs : [];
  return brs.length
    ? brs.map((road) => ({
        br: road.id,
        status: road.status === "erro" ? "Erro" : road.status,
        trecho: road.trecho,
        detalhe: road.status === "erro" ? "Sem dados de transito disponiveis" : road.detalhe,
      }))
    : MOCK_RODOVIAS;
}

function buildRiverRows(riverLevels) {
  const rows = (riverLevels?.stations || [])
    .filter((station) => station?.ok && typeof station.level_m === "number")
    .slice(0, 3)
    .map((station) => ({
      nome: station.river || station.name,
      local: station.name,
      nivelM: station.level_m,
      status: station.level_m >= 4 ? "alerta" : station.level_m >= 3 ? "atencao" : "normal",
    }));
  return rows.length ? rows : MOCK_RIOS;
}

export function DashboardTab({ ctx }) {
  const {
    STATIONS_LAGOA,
    activeENSO,
    formatProbability,
    getLagoaPointData,
    lagoaHistory,
    loading,
    copernicusNdvi,
    queimadas,
    riverLevels,
    roadBlocks,
    safeEnsoForecast,
    setActiveTab,
    stationData,
  } = ctx;

  const lagoaRows = toLagoaRows(STATIONS_LAGOA, stationData, getLagoaPointData, lagoaHistory);
  const rioGrande = stationData?.rs_rio_grande;
  const forecastIndexes = rioGrande?.weather?.forecastDayIndexes || [0, 1, 2, 3, 4];
  const chuva5dMm = forecastIndexes.slice(0, 5).reduce((sum, index) => {
    const value = rioGrande?.weather?.daily?.precipitation_sum?.[index];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
  const ensoForecast = safeEnsoForecast(activeENSO.forecast);
  const firstForecast = ensoForecast[0] || {};
  const queimadasData = {
    focos24h: queimadas?.foci?.length ?? queimadas?.count ?? 0,
    ndvi_mean: copernicusNdvi?.ndvi_mean,
    ndviMedio: copernicusNdvi?.ndvi_mean,
    historico7dias: Array.isArray(copernicusNdvi?.history_ndvi) ? copernicusNdvi.history_ndvi : [],
    vegetation_percent: copernicusNdvi?.vegetation_percent,
    low_vegetation_percent: copernicusNdvi?.low_vegetation_percent,
    valid_coverage_percent: copernicusNdvi?.valid_coverage_percent,
    period: copernicusNdvi?.period,
    source: copernicusNdvi?.source,
    method: copernicusNdvi?.method,
    limitation: copernicusNdvi?.limitation,
    status: copernicusNdvi?.ok ? "ativo" : "sem leitura",
    aoi: copernicusNdvi?.aoi,
  };

  return (
    <div className="sr-dashboard-modular">
      {loading && (
        <div className="sr-loading" style={{ margin: 0 }}>
          <div className="sr-loading-spinner" />
          <div>Carregando dados reais das fontes...</div>
        </div>
      )}

      <PanoramaGeral
        lagoa={lagoaRows}
        chuva5dMm={Math.round(chuva5dMm)}
        rodovias={buildRoadRows(roadBlocks)}
        rios={buildRiverRows(riverLevels)}
        loading={loading && !stationData?.rs_rio_grande}
      />

      <LagoadosPatos data={lagoaRows} loading={loading && lagoaRows.length === 0} onNavigate={setActiveTab} />

      <div className="sr-dashboard-two-col">
        <PrevisaoRioGrande onNavigate={setActiveTab} />
        <ENSOCard
          onNavigate={setActiveTab}
          data={{
            oni: typeof activeENSO.nino34 === "number" ? activeENSO.nino34 : 0,
            condicao: activeENSO.phase === "EL_NINO" ? "El Nino" : activeENSO.phase === "LA_NINA" ? "La Nina" : "Neutro",
            probIRI: Number.parseInt(formatProbability(firstForecast.en ?? activeENSO.prob?.elNino), 10) || 0,
            probCCSR: Number.parseInt(formatProbability(firstForecast.nu ?? activeENSO.prob?.neutral), 10) || 0,
            atualizadoEm: activeENSO.probabilityReferenceDate || "Atual",
          }}
        />
      </div>

      <div className="sr-dashboard-two-col">
        <QueimadasVegetacao data={queimadasData} loading={loading && !queimadas} onNavigate={setActiveTab} />
        <CondicoesVoo />
      </div>
    </div>
  );
}
