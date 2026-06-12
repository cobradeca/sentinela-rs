import {
  CondicoesVoo,
  ENSOCard,
  LagoadosPatos,
  MOCK_LAGOA,
  MOCK_RIOS,
  PanoramaGeral,
  PrevisaoRioGrande,
  QueimadasVegetacao,
} from "../components/cards";

function toLagoaRows(STATIONS_LAGOA, stationData, getLagoaPointData) {
  const rows = STATIONS_LAGOA.map((point) => {
    const lagoa = getLagoaPointData(point, stationData)?.lagoa;
    if (!lagoa?.isReal || typeof lagoa.atual !== "number") return null;
    return {
      id: point.id,
      nome: point.displayName || point.name,
      subEstacao: point.rioRef || point.name,
      nivelM: lagoa.atual,
      variacaoM: typeof lagoa.delta24h === "number" ? lagoa.delta24h : 0,
      historico: [lagoa.atual, lagoa.atual, lagoa.atual, lagoa.atual, lagoa.atual, lagoa.atual, lagoa.atual],
      hora: lagoa.measuredAt ? new Date(lagoa.measuredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--",
      fonte: lagoa.source || "RADAR",
    };
  }).filter(Boolean);
  return rows.length >= 4 ? rows.slice(0, 6) : MOCK_LAGOA;
}

function buildRoadRows(roadBlocks) {
  const brs = Array.isArray(roadBlocks?.brs) ? roadBlocks.brs : [];
  return ["BR-101", "BR-116", "BR-471"].map((id) => {
    const road = brs.find((item) => item.id === id);
    const first = road?.incidents?.[0];
    const blocked = road?.status === "bloqueado";
    const incident = road?.status === "incidente";
    return {
      br: id,
      status: blocked ? "Bloqueada" : incident ? "Lenta" : "Livre",
      trecho: first?.trecho || road?.trecho || "Trecho monitorado",
      motivo: first?.descricao || (incident ? "Ponto de atenção de tráfego" : "Sem bloqueio informado"),
    };
  });
}

function buildRiverRows(riverLevels) {
  const rows = (riverLevels?.stations || [])
    .filter((station) => station?.ok && typeof station.level_m === "number")
    .slice(0, 3)
    .map((station) => ({
      nome: station.river || station.name,
      local: station.name,
      nivelM: station.level_m,
      status: station.level_m >= 4 ? "alerta" : station.level_m >= 3 ? "atenção" : "normal",
    }));
  return rows.length ? rows : MOCK_RIOS;
}

export function DashboardTab({ ctx }) {
  const {
    STATIONS_LAGOA,
    activeENSO,
    formatProbability,
    getLagoaPointData,
    loading,
    queimadas,
    riverLevels,
    roadBlocks,
    safeEnsoForecast,
    stationData,
  } = ctx;

  const lagoaRows = toLagoaRows(STATIONS_LAGOA, stationData, getLagoaPointData);
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
    ndviMedio: 0.64,
    historico7dias: [0.58, 0.6, 0.57, 0.63, 0.61, 0.66, 0.64],
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

      <LagoadosPatos data={lagoaRows} loading={loading && lagoaRows === MOCK_LAGOA} />

      <div className="sr-dashboard-two-col">
        <PrevisaoRioGrande />
        <ENSOCard
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
        <QueimadasVegetacao data={queimadasData} loading={loading && !queimadas} />
        <CondicoesVoo />
      </div>
    </div>
  );
}
