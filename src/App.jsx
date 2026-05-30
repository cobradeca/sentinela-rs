import { Component, Suspense, lazy, useState, useEffect, useCallback, useRef } from "react";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { Sparkline as HistorySparkline } from "./components/Sparkline";
import { appendLagoaHistorySnapshot, loadLagoaHistory } from "./services/lagoaHistory";
import {
  fetchAnaLevel,
  fetchCemadenAccumulations,
  fetchCopernicusEms,
  fetchCopernicusNdvi,
  fetchCopernicusSentinel1,
  fetchCopernicusWater,
  fetchCptecInpeProducts,
  fetchDefesaCivilAlerts,
  fetchEffisWmsHealth,
  fetchHidroSensLaranjalLevel,
  fetchIcmbioUcsRs,
  fetchInmetForecast,
  fetchIriEnsoProbabilities,
  fetchLagoaRadarLevels,
  fetchNoaaEnso,
  fetchQueimadas,
  fetchWeather14Days,
} from "./services/api";
import { APAS_RS, ALL_STATIONS, FIRE_MONITORED_AREAS_RS, STATIONS, STATIONS_CIDADES, STATIONS_LAGOA } from "./config/stations";
import { CEMADEN_ATTRIBUTION, COPERNICUS_REFERENCE, ENSO_UNAVAILABLE } from "./config/sources";
import { RISK_LEVELS, getRiskLevel } from "./utils/risk";
import {
  classifyENSO,
  formatDominantEnsoProbability,
  formatProbability,
  formatSignedCelsius,
  getDominantEnsoPhase,
  percentValue,
  safeEnsoForecast,
} from "./utils/enso";
import { dataStaleness, dayNames } from "./utils/freshness";
import { mapWithConcurrency } from "./utils/async";

const DashboardTab = lazy(() => import("./tabs/DashboardTab").then((m) => ({ default: m.DashboardTab })));
const PrevisaoTab = lazy(() => import("./tabs/PrevisaoTab").then((m) => ({ default: m.PrevisaoTab })));
const LagoaDosPatosTab = lazy(() => import("./tabs/LagoaDosPatosTab").then((m) => ({ default: m.LagoaDosPatosTab })));
const EnsoTab = lazy(() => import("./tabs/EnsoTab").then((m) => ({ default: m.EnsoTab })));
const CptecTab = lazy(() => import("./tabs/CptecTab").then((m) => ({ default: m.CptecTab })));
const CopernicusTab = lazy(() => import("./tabs/CopernicusTab").then((m) => ({ default: m.CopernicusTab })));
const QueimadasTab = lazy(() => import("./tabs/QueimadasTab").then((m) => ({ default: m.QueimadasTab })));
const AlertasTab = lazy(() => import("./tabs/AlertasTab").then((m) => ({ default: m.AlertasTab })));
const FontesDeDadosTab = lazy(() => import("./tabs/FontesDeDadosTab").then((m) => ({ default: m.FontesDeDadosTab })));

class TabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, border: "1px solid rgba(239,68,68,0.35)", borderRadius: 8, background: "rgba(239,68,68,0.08)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Nao foi possivel abrir esta aba.</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Atualize a pagina. Se persistir, volte para Dashboard e tente novamente.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

function radarRiskToLevel(status) {
  if (status === "ALERTA") return "ALERTA";
  if (status === "ATENCAO") return "ATENCAO";
  return "NORMAL";
}

function formatDateTimeBR(value) {
  if (!value) return "sem horário";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lagoaStatusLabel(status) {
  if (status === "ALERTA") return "Acima da cota";
  if (status === "ATENCAO") return "Atenção";
  if (status === "NORMAL") return "Normal";
  if (status === "SEM_LIMIAR") return "Dado real";
  if (status === "SEM_LEITURA") return "Sem leitura";
  return "Sem leitura";
}

function lagoaStatusColor(status) {
  if (status === "ALERTA") return "#f97316";
  if (status === "ATENCAO") return "#eab308";
  if (status === "NORMAL") return "#22c55e";
  if (status === "SEM_LIMIAR") return "#22c55e";
  return "#64748b";
}

function getLagoaPointData(point, stationData) {
  return stationData?.[point.id] || null;
}

function getLagoaSourceText(lagoa) {
  if (!lagoa?.isReal) return "Sem leitura";
  const suffix = lagoa?.isFallback ? " · última salva" : "";
  if (lagoa?.hidrosens) return "HidroSens/UFPel" + suffix;
  if (lagoa?.radar) return "RADAR Lagoa dos Patos" + suffix;
  if (lagoa?.anaLevel !== null && lagoa?.anaLevel !== undefined) return "ANA HidroWeb";
  return "Fonte validada" + suffix;
}

function getResponsibleAgencyText(source) {
  const text = String(source || "").toUpperCase();
  if (text.includes("HIDROSENS")) return "HidroSens/UFPel";
  if (text.includes("RADAR")) return "Rede RADAR Lagoa dos Patos";
  if (text.includes("ANA")) return "ANA HidroWeb";
  if (text.includes("CEMADEN")) return "CEMADEN/MCTI";
  if (text.includes("INMET")) return "INMET";
  if (text.includes("DEFESA")) return "Defesa Civil RS";
  if (text.includes("COPERNICUS")) return "Copernicus Data Space / Sentinel Hub";
  if (text.includes("NOAA") || text.includes("IRI")) return "NOAA/CPC ou IRI/CCSR";
  return "órgão responsável pela fonte";
}

function getFallbackWarningText(source, ageMinutes = null) {
  const ageText = typeof ageMinutes === "number" ? ` há ${ageMinutes} min` : "";
  return `Fonte primária indisponível. Exibindo última leitura válida salva${ageText}. Verifique a informação junto ao órgão responsável: ${getResponsibleAgencyText(source)}.`;
}

function getLagoaMeasuredAt(lagoa) {
  return lagoa?.hidrosens?.measured_at || lagoa?.radar?.measured_at || null;
}

function getLagoaMaxMay2024(lagoa) {
  return lagoa?.hidrosens?.max_may_2024_m ?? lagoa?.radar?.max_may_2024_m ?? null;
}

function getLagoaSummary(stationData) {
  const points = STATIONS_LAGOA
    .map((point) => ({ point, data: stationData?.[point.id] }))
    .filter((item) => item.data?.lagoa?.isReal);

  const above = points.filter(({ data }) => data.lagoa?.levelStatus === "ALERTA").length;
  const attention = points.filter(({ data }) => data.lagoa?.levelStatus === "ATENCAO").length;

  const latestMs = Math.max(
    0,
    ...points
      .map(({ data }) => new Date(getLagoaMeasuredAt(data.lagoa) || 0).getTime())
      .filter((value) => Number.isFinite(value))
  );

  const thresholdValidated = points.filter(({ data }) => typeof data.lagoa?.threshold_m === "number").length;
  const withoutThreshold = points.filter(({ data }) => data.lagoa?.isReal && typeof data.lagoa?.threshold_m !== "number").length;

  return {
    monitored: points.length,
    total: STATIONS_LAGOA.length,
    above,
    attention,
    thresholdValidated,
    withoutThreshold,
    latest: latestMs ? new Date(latestMs).toISOString() : null,
  };
}


// ANA HidroWeb — nível real via Supabase Edge Function.
// A função ana-rs consulta a ANA com datas reais, lê <Nivel> e converte cm → m.
// CEMADEN — chuva observada por acumulados recentes.
// O token fica no Supabase Secret CEMADEN_PED_TOKEN, nunca no App.jsx.
function formatCemadenRain(cemaden) {
  if (!cemaden) return "";
  const acc24 = typeof cemaden.max_acc24hr === "number" ? cemaden.max_acc24hr : null;
  const acc6 = typeof cemaden.max_acc6hr === "number" ? cemaden.max_acc6hr : null;

  if (acc24 !== null) return `chuva observada 24h ${acc24.toFixed(1)}mm`;
  if (acc6 !== null) return `chuva observada 6h ${acc6.toFixed(1)}mm`;

  return "chuva observada disponível";
}

function explainCityRisk(station, d, ensoText = "") {
  if (!d || d.error) {
    return {
      title: `${station?.name || "Cidade"} — sem dados suficientes`,
      lines: ["Não foi possível carregar todos os parâmetros necessários para classificar esta cidade."],
      note: "Sem simulação: quando uma fonte não responde, o app mostra indisponibilidade."
    };
  }

  const lines = [];
  const precip = typeof d.precip === "number" ? d.precip : null;
  const tempMin = typeof d.tempMin === "number" ? d.tempMin : null;
  const windMax = typeof d.windMax === "number" ? d.windMax : null;

  if (precip !== null) {
    if (precip > 150) lines.push(`A previsão soma ${precip.toFixed(0)}mm de chuva em 14 dias, um volume muito alto para acompanhar de perto.`);
    else if (precip > 80) lines.push(`A previsão soma ${precip.toFixed(0)}mm de chuva em 14 dias, volume alto o suficiente para elevar a atenção.`);
    else if (precip > 40) lines.push(`A previsão soma ${precip.toFixed(0)}mm de chuva em 14 dias. É chuva moderada, ainda sem sinal severo isolado.`);
    else if (precip > 20) lines.push(`A previsão soma ${precip.toFixed(0)}mm de chuva em 14 dias. Por enquanto, é um cenário de acompanhamento.`);
    else lines.push(`A previsão soma apenas ${precip.toFixed(0)}mm de chuva em 14 dias, sem pressão relevante por chuva acumulada.`);
  }

  if (tempMin !== null) {
    if (tempMin < 0) lines.push(`A mínima prevista chega a ${tempMin.toFixed(1)}°C, com risco de geada ou gelo.`);
    else if (tempMin < 5) lines.push(`A mínima prevista é de ${tempMin.toFixed(1)}°C. É frio suficiente para entrar em atenção no RS.`);
    else lines.push(`A mínima prevista é de ${tempMin.toFixed(1)}°C. Esse frio não aumenta o nível de atenção agora.`);
  }

  if (windMax !== null) {
    if (windMax > 80) lines.push(`As rajadas podem chegar a ${windMax.toFixed(0)}km/h, faixa de vento muito forte.`);
    else if (windMax > 50) lines.push(`As rajadas podem chegar a ${windMax.toFixed(0)}km/h, vento forte para acompanhar.`);
    else if (windMax > 30) lines.push(`As rajadas podem chegar a ${windMax.toFixed(0)}km/h. Ainda é atenção leve por vento.`);
    else lines.push(`O vento previsto chega a ${windMax.toFixed(0)}km/h, baixo demais para aumentar o nível de atenção.`);
  }

  if (d.cemaden) lines.push(`CEMADEN: ${formatCemadenRain(d.cemaden)}.`);
  else lines.push("CEMADEN: sem estação ativa ou sem acumulado validado para esta cidade no período. Ausência de dado não significa ausência de chuva.");

  const riskLabel = RISK_LEVELS[d.risk]?.label || d.risk || "Indefinido";

  return {
    title: `${station?.name || "Cidade"} — ${riskLabel}`,
    lines,
    note: `Regra: status calculado por parâmetros locais — chuva prevista, temperatura mínima, vento, CEMADEN e nível quando houver estação. ENSO é contexto climático${ensoText ? ` (${ensoText})` : ""}; não aciona alerta local sozinho.`
  };
}

function explainDailyRisk(station, date, p, tn, w, riskCode) {
  const dd = new Date(date + "T12:00:00");
  const riskLabel = RISK_LEVELS[riskCode]?.label || riskCode || "Indefinido";
  const weightedPrecip = p * 1.5;

  return {
    title: `${station?.name || "Cidade"} — ${dd.toLocaleDateString("pt-BR")} — ${riskLabel}`,
    lines: [
      p >= 10
        ? `Há ${p.toFixed(0)}mm de chuva previstos para o dia. Esse volume já justifica acompanhar a situação.`
        : `Quase não há chuva prevista para o dia (${p.toFixed(0)}mm), então a chuva não pesa no risco.`,
      tn < 0
        ? `A mínima pode cair para ${tn.toFixed(1)}°C, com risco de geada ou gelo.`
        : tn < 5
        ? `A mínima pode chegar a ${tn.toFixed(1)}°C. É frio relevante para o RS e entra como atenção.`
        : `A mínima prevista é de ${tn.toFixed(1)}°C. Esse frio não aumenta o nível de atenção agora.`,
      w >= 30
        ? `O vento pode chegar a ${w.toFixed(0)}km/h. A partir de 30km/h o app passa a acompanhar o vento com mais cuidado.`
        : `O vento previsto é baixo (${w.toFixed(0)}km/h), sem influência relevante no risco do dia.`
    ],
    note: "Este status resume chuva, frio e vento previstos. Para decisões de segurança, confira também os avisos oficiais da Defesa Civil e dos órgãos responsáveis."
  };
}

function explainLagoaRisk(point, lagoa) {
  const label = lagoaStatusLabel(lagoa?.levelStatus);

  if (!lagoa?.isReal || lagoa?.atual === null || lagoa?.atual === undefined) {
    return {
      title: `${point?.name || "Ponto"} — Sem leitura`,
      lines: ["Sem leitura operacional validada no período."],
      note: "Sem simulação: o app não inventa nível quando a fonte não retorna dado válido."
    };
  }

  const lines = [
    `Cota atual: ${(lagoa.atual * 100).toFixed(1)}cm (${lagoa.atual.toFixed(3)}m).`
  ];

  if (typeof lagoa.threshold_m === "number") {
    lines.push(`Limiar validado da estação: ${(lagoa.threshold_m * 100).toFixed(0)}cm (${lagoa.threshold_m.toFixed(2)}m).`);
  } else {
    lines.push("Dado real, mas sem limiar operacional validado.");
  }

  if (typeof lagoa.critical_threshold_m === "number") {
    lines.push(`Cota crítica validada: ${(lagoa.critical_threshold_m * 100).toFixed(0)}cm (${lagoa.critical_threshold_m.toFixed(2)}m).`);
  }

  const measuredAt = getLagoaMeasuredAt(lagoa);
  if (measuredAt) lines.push(`Horário da leitura: ${formatDateTimeBR(measuredAt)}.`);

  if (lagoa.operational === false || lagoa.stale) {
    const ageText = typeof lagoa.age_minutes === "number" ? ` (${lagoa.age_minutes}min atrás)` : "";
    lines.push(`A fonte retornou uma leitura real${ageText}, mas ela está velha para uso como leitura atual. O app mostra o valor como referência e não eleva o alerta com base nele.`);
  }

  if (lagoa.hidrosens?.distance_m && lagoa.hidrosens?.sensor_height_m) {
    lines.push(`Cálculo HidroSens: altura do sensor ${lagoa.hidrosens.sensor_height_m.toFixed(2)}m − Distance ${lagoa.hidrosens.distance_m.toFixed(2)}m = ${lagoa.atual.toFixed(2)}m.`);
  }

  if (lagoa.isFallback) {
    lines.push("Fonte primária indisponível. Esta é a última leitura válida salva. Verifique a informação junto ao órgão responsável pela fonte antes de qualquer decisão operacional. Fallback vencido não dispara novo alerta automático.");
  }

  return {
    title: `${point?.name || "Ponto"} — ${label}`,
    lines,
    note: "Normal significa abaixo do limiar validado. Atenção/Acima da cota dependem do limiar próprio da estação, não de limiar genérico."
  };
}

const WMO_WEATHER = {
  0: ["☀️", "Céu claro"],
  1: ["🌤️", "Principalmente claro"],
  2: ["⛅", "Parcialmente nublado"],
  3: ["☁️", "Nublado"],
  45: ["🌫️", "Neblina"],
  48: ["🌫️", "Neblina com geada"],
  51: ["🌦️", "Garoa fraca"],
  53: ["🌧️", "Garoa"],
  55: ["🌧️", "Garoa forte"],
  56: ["🌧️", "Garoa congelante fraca"],
  57: ["🌧️", "Garoa congelante forte"],
  61: ["🌧️", "Chuva fraca"],
  63: ["🌧️", "Chuva"],
  65: ["🌧️", "Chuva forte"],
  66: ["🌧️", "Chuva congelante fraca"],
  67: ["🌧️", "Chuva congelante forte"],
  71: ["❄️", "Neve fraca"],
  73: ["❄️", "Neve"],
  75: ["❄️", "Neve intensa"],
  77: ["❄️", "Grãos de neve"],
  80: ["🌦️", "Pancadas fracas"],
  81: ["🌧️", "Pancadas"],
  82: ["⛈️", "Pancadas fortes"],
  85: ["❄️", "Pancadas de neve"],
  86: ["❄️", "Pancadas fortes de neve"],
  95: ["⛈️", "Tempestade"],
  96: ["⛈️", "Tempestade com granizo"],
  99: ["⛈️", "Tempestade forte com granizo"],
};

const wmoDesc  = (c) => WMO_WEATHER[Number(c)]?.[1] || "Condição meteorológica";
const wmoEmoji = (c) => WMO_WEATHER[Number(c)]?.[0] || "🌦️";


// ─── APP ─────────────────────────────────────────────────────────────────────
export default function SentinelaRS() {
  const [stationData, setStationData]   = useState({});
  const [loading, setLoading]           = useState(true);
  const [lastUpdate, setLastUpdate]     = useState(null);
  const [lagoaHistory, setLagoaHistory] = useState({});
  const [lagoaHistoryMeta, setLagoaHistoryMeta] = useState({ source: "sessão atual", persistent: false });
  const [selStation, setSelStation]     = useState(STATIONS_CIDADES[0]); // POA default
  const [activeTab, setActiveTab]       = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alerts, setAlerts]             = useState([]);
  const [queimadas, setQueimadas]       = useState(null);
  const [icmbioUcs, setIcmbioUcs]       = useState(null);
  const [effisHealth, setEffisHealth]   = useState(null);
  const [qLoading, setQLoading]         = useState(false);
  const [expanded, setExpanded]         = useState(null);
  const [dark, setDark]                 = useState(true);
  const [ensoLive, setEnsoLive]         = useState(null);
  const [ensoProbLive, setEnsoProbLive]     = useState(null);
  const [cptecProducts, setCptecProducts]   = useState(null);
  const [copernicusWater, setCopernicusWater] = useState(null);
  const [copernicusS1, setCopernicusS1] = useState(null);
  const [copernicusNdvi, setCopernicusNdvi] = useState(null);
  const [copernicusEms, setCopernicusEms] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null); // para detalhe do card
  const [riskExplain, setRiskExplain] = useState(null);
  // BLOCO D — saúde das fontes
  const [sourceHealth, setSourceHealth] = useState({});
  const sourceHealthRef = useRef({});

  useEffect(() => {
    document.body.dataset.theme = dark ? "dark" : "light";
    return () => { delete document.body.dataset.theme; };
  }, [dark]);

  // Cores dinâmicas por tema
  const t = dark ? {
    bg: "#070b12",
    surface: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)",
    borderActive: "rgba(34,211,238,0.5)",
    text: "#f3f8ff",
    textMuted: "#c6d3e1",
    textFaint: "#9fb0c3",
    accent: "#22d3ee",
    grid: "rgba(34,211,238,0.04)",
    tabActiveBg: "rgba(34,211,238,0.15)",
    tabActive: "#22d3ee",
    tabInactive: "#64748b",
    cardBg: "rgba(255,255,255,0.03)",
    inputBg: "rgba(0,0,0,0.4)",
    barBg: "rgba(0,0,0,0.4)",
    shadowCard: "none",
  } : {
    bg: "#f1f5f9",
    surface: "rgba(255,255,255,0.9)",
    border: "rgba(0,0,0,0.1)",
    borderActive: "rgba(6,182,212,0.6)",
    text: "#0f172a",
    textMuted: "#475569",
    textFaint: "#94a3b8",
    accent: "#0891b2",
    grid: "rgba(6,182,212,0.05)",
    tabActiveBg: "rgba(6,182,212,0.12)",
    tabActive: "#0891b2",
    tabInactive: "#94a3b8",
    cardBg: "#ffffff",
    inputBg: "rgba(255,255,255,0.9)",
    barBg: "rgba(0,0,0,0.1)",
    shadowCard: "0 1px 4px rgba(0,0,0,0.08)",
  };

  const s = {
    card: { background: t.cardBg, border:`1px solid ${t.border}`, borderRadius:6, padding:"14px 16px", boxShadow: t.shadowCard },
    label: { fontSize:9, color: t.textMuted, letterSpacing:2, textTransform:"uppercase", marginBottom:6 },
  };

  const getRiskColor = (lvl) => {
    const r = RISK_LEVELS[lvl];
    return dark ? r.color : r.colorLight;
  };
  const getRiskBg = (lvl) => {
    const r = RISK_LEVELS[lvl];
    return dark ? r.bg : r.bgLight;
  };

  function getValidatedSourceHealth(name) {
    const existing = sourceHealthRef.current?.[name] || sourceHealth?.[name] || null;
    if (existing) return existing;

    if (name === "NOAA/CPC ENSO" && ensoLive && typeof ensoLive.nino34 === "number") {
      return { ok: true, lastOk: ensoLive.fetchedAt || ensoLive.referenceDate || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "IRI/CCSR ENSO" && ensoProbLive && ensoProbLive.prob && typeof ensoProbLive.prob.elNino === "number") {
      return { ok: true, lastOk: ensoProbLive.probabilityFetchedAt || ensoProbLive.probabilityReferenceDate || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "CPTEC/INPE" && cptecProducts && (cptecProducts.ok === true || Array.isArray(cptecProducts.products))) {
      return { ok: true, lastOk: cptecProducts.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus Water" && copernicusWater && copernicusWater.ok === true && typeof copernicusWater.water_percent === "number") {
      return { ok: true, lastOk: copernicusWater.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus Sentinel-1" && copernicusS1 && (copernicusS1.status === "OK" || copernicusS1.ok === true) && typeof copernicusS1.water_like_percent === "number") {
      return { ok: true, lastOk: copernicusS1.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus NDVI" && copernicusNdvi && copernicusNdvi.ok === true && typeof copernicusNdvi.ndvi_mean === "number") {
      return { ok: true, lastOk: copernicusNdvi.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    if (name === "Copernicus EMS" && copernicusEms && copernicusEms.ok === true) {
      return { ok: true, lastOk: copernicusEms.fetched_at || new Date().toISOString(), latencyMs: null, validated: true };
    }

    return null;
  }

  function markSourceHealth(name, ok, startedAt, error = null) {
    const next = {
      ...sourceHealthRef.current,
      [name]: {
        ok: Boolean(ok),
        lastOk: ok ? new Date().toISOString() : sourceHealthRef.current[name]?.lastOk || null,
        latencyMs: Date.now() - startedAt,
        error,
      },
    };
    sourceHealthRef.current = next;
    setSourceHealth({ ...next });
  }

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const results = {};
    const health = { ...sourceHealthRef.current };
    const t0 = Date.now();
    const historyResult = await loadLagoaHistory(STATIONS_LAGOA.map((station) => station.id));
    let nextLagoaHistory = historyResult.history || {};

    // ── fetch com rastreio de saúde ──────────────────────────────────────────
    async function tracked(key, fn) {
      const start = Date.now();
      try {
        const result = await fn();
        const latencyMs = Date.now() - start;
        health[key] = { ok: true, lastOk: new Date().toISOString(), latencyMs, error: null };
        return result;
      } catch (err) {
        health[key] = { ok: false, lastOk: health[key]?.lastOk || null, latencyMs: Date.now() - start, error: err?.message || "erro desconhecido" };
        return null;
      }
    }

    const [cemadenResult, lagoaRadarResult, hidrosensResult] = await Promise.allSettled([
      tracked("CEMADEN", fetchCemadenAccumulations),
      tracked("RADAR Lagoa", fetchLagoaRadarLevels),
      tracked("HidroSens", fetchHidroSensLaranjalLevel),
    ]);
    const cemadenMap = cemadenResult.status === "fulfilled" ? (cemadenResult.value || {}) : {};
    const lagoaRadarMap = lagoaRadarResult.status === "fulfilled" ? (lagoaRadarResult.value || {}) : {};
    const hidrosensLaranjal = hidrosensResult.status === "fulfilled" ? hidrosensResult.value : null;

    await mapWithConcurrency(ALL_STATIONS, 4, async (st) => {
      try {
        const weather = await (async () => {
          const start = Date.now();
          try {
            const r = await fetchWeather14Days(st.lat, st.lon);
            if (!health["Open-Meteo"]) health["Open-Meteo"] = { ok: true, lastOk: new Date().toISOString(), latencyMs: Date.now()-start, error: null };
            return r;
          } catch(err) {
            health["Open-Meteo"] = { ok: false, lastOk: health["Open-Meteo"]?.lastOk || null, latencyMs: Date.now()-start, error: err?.message };
            throw err;
          }
        })();
        let realLevel = null;
        if (st.anaCode) {
          const start = Date.now();
          realLevel = await fetchAnaLevel(st.anaCode);
          if (!health["ANA HidroWeb"]) health["ANA HidroWeb"] = { ok: realLevel !== null, lastOk: realLevel !== null ? new Date().toISOString() : health["ANA HidroWeb"]?.lastOk || null, latencyMs: Date.now()-start, error: realLevel === null ? "sem leitura" : null };
        }
        const radarLevel = lagoaRadarMap[st.id] || null;
        const hidrosensLevel = st.id === "lagoa_patos_pelotas" ? hidrosensLaranjal : null;
        const inmet = st.ibgeCode ? await (async () => {
          const start = Date.now();
          const r = await fetchInmetForecast(st.ibgeCode);
          if (!health["INMET"]) health["INMET"] = { ok: r !== null, lastOk: r !== null ? new Date().toISOString() : health["INMET"]?.lastOk || null, latencyMs: Date.now()-start, error: r === null ? "sem resposta" : null };
          return r;
        })() : null;
        const cemaden = cemadenMap[st.id] || null;
        const precip  = weather.daily?.precipitation_sum?.reduce((a,b)=>a+b,0)||0;
        const tempMin  = Math.min(...(weather.daily?.temperature_2m_min||[20]));
        const windMax  = Math.max(...(weather.daily?.windspeed_10m_max||[0]));

        // Nível real disponível: prioriza RADAR da Lagoa quando houver sensor validado.
        // ANA permanece como fonte complementar/parcial.
        const lagoa = st.type==="lagoa" ? {
          atual: hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel,
          isReal: Boolean(hidrosensLevel?.level_m ?? radarLevel?.level_m ?? realLevel),
          source: hidrosensLevel ? "HIDROSENS" : (radarLevel ? "RADAR" : (realLevel !== null ? "ANA" : null)),
          operational: hidrosensLevel?.operational ?? radarLevel?.operational ?? (realLevel !== null),
          stale: Boolean(hidrosensLevel?.stale || radarLevel?.stale),
          age_minutes: hidrosensLevel?.age_minutes ?? radarLevel?.age_minutes ?? null,
          note: hidrosensLevel?.note ?? radarLevel?.note ?? null,
          isFallback: Boolean(hidrosensLevel?.fallback || radarLevel?.fallback),
          fallback_saved_at: hidrosensLevel?.fallback_saved_at || radarLevel?.fallback_saved_at || null,
          fallback_age_minutes: hidrosensLevel?.fallback_age_minutes ?? radarLevel?.fallback_age_minutes ?? null,
          radar: radarLevel,
          hidrosens: hidrosensLevel,
          anaLevel: realLevel,
          threshold_m: hidrosensLevel?.threshold_m ?? radarLevel?.threshold_m ?? null,
          critical_threshold_m: hidrosensLevel?.critical_threshold_m ?? null,
          levelStatus: hidrosensLevel?.status ?? radarLevel?.status ?? (realLevel !== null ? "SEM_LIMIAR" : "SEM_LEITURA"),
        } : null;

        // Não usa limiar único de 0,8m. Risco de nível só entra quando a fonte traz limiar próprio validado.
        // Registra o ponto atual na série exibida e mescla com histórico persistido do Supabase.
        if (lagoa?.isReal && lagoa.atual !== null) {
          nextLagoaHistory = appendLagoaHistorySnapshot(nextLagoaHistory, st.id, lagoa.atual, getLagoaMeasuredAt(lagoa));
        }

        const baseRisk = getRiskLevel(precip, tempMin, windMax, null);
        const levelRisk = ((lagoa?.radar || lagoa?.hidrosens) && lagoa?.threshold_m && !lagoa?.isFallback && lagoa?.operational !== false) ? radarRiskToLevel(lagoa.levelStatus) : "NORMAL";
        const order = ["NORMAL","ATENCAO","ALERTA","EMERGENCIA","CRITICO"];
        const risk = order.indexOf(levelRisk) > order.indexOf(baseRisk) ? levelRisk : baseRisk;
        results[st.id] = { weather, inmet, cemaden, lagoa, precip, tempMin, windMax, risk, realLevel, radarLevel };
      } catch { results[st.id]={ error:true, risk:"NORMAL" }; }
    });
    const defesaStart = Date.now();
    const officialAlerts = await fetchDefesaCivilAlerts();
    health["Defesa Civil RS"] = { ok: Array.isArray(officialAlerts), lastOk: Array.isArray(officialAlerts) ? new Date().toISOString() : health["Defesa Civil RS"]?.lastOk || null, latencyMs: Date.now()-defesaStart, error: null };

    sourceHealthRef.current = health;
    setSourceHealth({ ...health });
    setStationData(results);
    setLagoaHistory(nextLagoaHistory);
    setLagoaHistoryMeta({
      source: historyResult.source,
      persistent: historyResult.persistent,
      error: historyResult.error || null,
    });
    setAlerts(officialAlerts);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  const loadQueimadas = useCallback(async () => {
    setQLoading(true);
    const startedAt = Date.now();
    const [data, ucs, effis] = await Promise.all([fetchQueimadas(), fetchIcmbioUcsRs(), fetchEffisWmsHealth()]);
    markSourceHealth("INPE BDQueimadas", Boolean(data?.ok), startedAt, data?.ok ? null : data?.error || "sem resposta operacional");
    markSourceHealth("ICMBio/MMA CNUC", Boolean(ucs?.ok), startedAt, ucs?.ok ? null : ucs?.error || "sem cadastro validado");
    markSourceHealth("Copernicus EFFIS", Boolean(effis?.ok), startedAt, effis?.ok ? null : effis?.error || "WMS EFFIS sem resposta validada");
    setQueimadas(data);
    setIcmbioUcs(ucs);
    setEffisHealth(effis);
    setQLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
    const iv = setInterval(loadAllData, 30*60*1000);
    return () => clearInterval(iv);
  }, [loadAllData]);

  useEffect(() => {
    let alive = true;

    async function loadCptecProducts() {
      const startedAt = Date.now();
      const data = await fetchCptecInpeProducts();
      if (!alive) return;
      markSourceHealth("CPTEC/INPE", Boolean(data), startedAt, data ? null : "sem produto oficial validado");
      if (!data) return;
      setCptecProducts(data);
    }

    loadCptecProducts();
    const iv = setInterval(loadCptecProducts, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCopernicusWater() {
      const startedAt = Date.now();
      const data = await fetchCopernicusWater("lagoa_patos", 30);
      if (!alive) return;
      markSourceHealth("Copernicus Water", Boolean(data?.ok && typeof data?.water_percent === "number"), startedAt, data?.error || (data ? data.status : "sem resposta"));
      setCopernicusWater(data);
    }

    loadCopernicusWater();
    const iv = setInterval(loadCopernicusWater, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCopernicusSentinel1() {
      const startedAt = Date.now();
      const data = await fetchCopernicusSentinel1("lagoa_patos", 18);
      if (!alive) return;
      markSourceHealth("Copernicus Sentinel-1", Boolean(data?.water_like_percent !== undefined), startedAt, data?.error || (data ? data.status : "sem resposta"));
      setCopernicusS1(data);
    }

    loadCopernicusSentinel1();
    const iv = setInterval(loadCopernicusSentinel1, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCopernicusEms() {
      const startedAt = Date.now();
      const data = await fetchCopernicusEms();
      if (!alive) return;
      markSourceHealth("Copernicus EMS", Boolean(data?.ok), startedAt, data?.error || (data ? data.source : "sem resposta"));
      setCopernicusEms(data);
    }

    loadCopernicusEms();
    const iv = setInterval(loadCopernicusEms, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCopernicusNdvi() {
      const startedAt = Date.now();
      const data = await fetchCopernicusNdvi("entorno_lagoa_patos", 30);
      if (!alive) return;
      markSourceHealth("Copernicus NDVI", Boolean(data?.ok && typeof data?.ndvi_mean === "number"), startedAt, data?.error || (data ? data.status : "sem resposta"));
      setCopernicusNdvi(data);
    }

    loadCopernicusNdvi();
    const iv = setInterval(loadCopernicusNdvi, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadIriProbabilities() {
      const startedAt = Date.now();
      const live = await fetchIriEnsoProbabilities();
      if (!alive) return;
      markSourceHealth("IRI/CCSR ENSO", Boolean(live), startedAt, live ? null : "sem probabilidade validada");
      if (!live) return;
      setEnsoProbLive(live);
    }

    loadIriProbabilities();
    const iv = setInterval(loadIriProbabilities, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadEnsoLive() {
      const startedAt = Date.now();
      const live = await fetchNoaaEnso();
      if (!alive) return;
      markSourceHealth("NOAA/CPC ENSO", Boolean(live), startedAt, live ? null : "sem índice observado validado");
      if (!live) return;

      setEnsoLive(live);
    }

    loadEnsoLive();
    const iv = setInterval(loadEnsoLive, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "queimadas" || activeTab === "apis") {
      loadQueimadas();
    }
  }, [activeTab, loadQueimadas]);

  const overallRisk = Object.values(stationData).reduce((w,d) => {
    const o=["NORMAL","ATENCAO","ALERTA","EMERGENCIA","CRITICO"];
    return o.indexOf(d.risk)>o.indexOf(w)?d.risk:w;
  }, "NORMAL");

  const observedENSO = ensoLive || ENSO_UNAVAILABLE;
  const activeENSO = {
    ...observedENSO,
    prob: ensoProbLive?.prob || null,
    forecast: ensoProbLive?.forecast || [],
    probabilitySource: ensoProbLive?.probabilitySource || null,
    probabilityReferenceDate: ensoProbLive?.probabilityReferenceDate || null,
    probabilityDynamic: Boolean(ensoProbLive),
    probabilityFetchedAt: ensoProbLive?.probabilityFetchedAt || null,
    probabilityParsing: ensoProbLive?.probabilityParsing || null,
  };
  const ensoClass = classifyENSO(activeENSO.nino34);
  const ensoObservedAvailable = typeof activeENSO.nino34 === "number" && Number.isFinite(activeENSO.nino34);
  const ensoProbabilityAvailable = Boolean(getDominantEnsoPhase(activeENSO.prob));
  const ensoFirstForecast = safeEnsoForecast(activeENSO.forecast)[0] || null;
  const ensoDominantProb = getDominantEnsoPhase(activeENSO.prob);
  const ensoObservedText = ensoObservedAvailable
    ? `${ensoClass.icon} Condição observada: ${ensoClass.label} · Niño 3.4 ${formatSignedCelsius(activeENSO.nino34)}`
    : "ENSO observado indisponível";
  const ensoProbabilityText = ensoProbabilityAvailable
    ? `IRI/CCSR: ${formatDominantEnsoProbability(activeENSO.prob, ensoFirstForecast?.p || "")}`
    : "Probabilidade IRI/CCSR indisponível";
  const ensoBannerActive = ensoObservedAvailable || ensoProbabilityAvailable;
  const ensoBannerColor = ensoObservedAvailable ? ensoClass.color : (ensoDominantProb?.color || t.textMuted);
  const selData   = stationData[selStation.id];
  const lagoaSummary = getLagoaSummary(stationData);

  // TABS: previsão agora é 14 dias
  const TABS = [
    { key:"dashboard",  label:"📡 Dashboard" },
    { key:"previsao",   label:"📅 Previsão 14 Dias" },
    { key:"lagoa",      label:"🌊 Lagoa dos Patos" },
    { key:"enso",       label:"🌡️ ENSO" },
    { key:"cptec",      label:"🌦️ CPTEC/INPE" },
    { key:"copernicus", label:"🛰️ Copernicus" },
    { key:"queimadas",  label:"🔥 Queimadas / APAs" },
    { key:"alertas",    label:`🔔 Alertas${alerts.length?` (${alerts.length})`:""}`},
    { key:"apis",       label:"🔌 Fontes de Dados" },
  ];

  // ─── CARD DETALHE (modal inline) ─────────────────────────────────────────
  function CardDetail({ station, d, onClose }) {
    if (!d || d.error) return null;
    const risk = RISK_LEVELS[d.risk];
    const rColor = getRiskColor(d.risk);
    const rBg    = getRiskBg(d.risk);
    const days   = d.weather?.daily?.time || [];
    return (
      <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
        onClick={onClose}>
        <div onClick={e=>e.stopPropagation()} style={{ background: dark?"#0f172a":"#ffffff", border:`1px solid ${t.border}`, borderRadius:10, padding:22, maxWidth:560, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>{station.type.toUpperCase()} · {station.rioRef||station.anaCode||""}</div>
              <div style={{ fontSize:16, fontWeight:700, color:t.text, marginTop:2 }}>{station.name}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:10, fontWeight:700, padding:"3px 10px", border:`1px solid ${rColor}`, color:rColor, background:rBg, borderRadius:4 }}>{risk.icon} {risk.label}</div>
              <button onClick={onClose} style={{ background:"none", border:`1px solid ${t.border}`, color:t.textMuted, cursor:"pointer", fontSize:14, borderRadius:4, padding:"2px 8px", fontFamily:"inherit" }}>✕</button>
            </div>
          </div>

          {/* Parâmetros */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:14 }}>
            {[
              { l:"Precip. 14d", v:`${d.precip?.toFixed(0)} mm`,    alert: d.precip>80 },
              { l:"Temp. mínima", v:`${d.tempMin?.toFixed(1)} °C`,   alert: d.tempMin<5 },
              { l:"Vento máx.",   v:`${d.windMax?.toFixed(0)} km/h`, alert: d.windMax>50 },
              { l:"Contexto climático",v: ensoObservedAvailable ? `${ensoClass.label} · ${formatSignedCelsius(activeENSO.nino34)}` : "ENSO indisponível", alert:false },
              ...(d.lagoa ? [
                { l:"Nível lagoa", v: d.lagoa.isReal && d.lagoa.atual !== null ? `${d.lagoa.atual.toFixed(2)} m (${d.lagoa.source || "real"})` : "– (indisponível)", alert: false },
              ] : []),
            ].map(item=>(
              <div key={item.l} style={{ background: dark?"rgba(0,0,0,0.3)":t.bg, padding:"8px 11px", borderRadius:5, borderLeft:`3px solid ${item.alert?rColor:t.textFaint}` }}>
                <div style={{ fontSize:8, color:t.textMuted, marginBottom:2 }}>{item.l}</div>
                <div style={{ fontSize:14, fontWeight:700, color:item.alert?rColor:t.text }}>{item.v}</div>
              </div>
            ))}
          </div>

          {/* Previsão compacta dos 14 dias */}
          <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2, marginBottom:8 }}>PREVISÃO 14 DIAS</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
            {days.slice(0,14).map((date,i)=>{
              const dd=new Date(date+"T12:00:00");
              const p=d.weather.daily.precipitation_sum?.[i]||0;
              const tx=d.weather.daily.temperature_2m_max?.[i]||0;
              const tn=d.weather.daily.temperature_2m_min?.[i]||0;
              const c=d.weather.daily.weathercode?.[i]||0;
              return (
                <div key={date} style={{ padding:"6px 3px", background: dark?(i===0?"rgba(34,211,238,0.08)":"rgba(255,255,255,0.03)"):(i===0?"rgba(8,145,178,0.08)":"rgba(0,0,0,0.03)"), border:`1px solid ${i===0?t.accent+"55":t.border}`, borderRadius:4, textAlign:"center" }}>
                  <div style={{ fontSize:7, color:t.textMuted }}>{i===0?"HOJE":dayNames[dd.getDay()]}</div>
                  <div style={{ fontSize:16, margin:"3px 0 2px" }}>{wmoEmoji(c)}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#fbbf24" }}>{tx.toFixed(0)}°</div>
                  <div style={{ fontSize:9, color:"#60a5fa" }}>{tn.toFixed(0)}°</div>
                  <div style={{ fontSize:7, color:t.accent, marginTop:3 }}>{p.toFixed(0)}mm</div>
                </div>
              );
            })}
          </div>

          <button onClick={()=>{setSelStation(station);setActiveTab("previsao");onClose();}}
            style={{ marginTop:14, width:"100%", padding:"9px", background:"none", border:`1px solid ${t.accent}44`, color:t.accent, cursor:"pointer", borderRadius:5, fontFamily:"inherit", fontSize:10, letterSpacing:2 }}>
            VER PREVISÃO COMPLETA →
          </button>
        </div>
      </div>
    );
  }

  const tabCtx = {
    APAS_RS, CEMADEN_ATTRIBUTION, COPERNICUS_REFERENCE, FIRE_MONITORED_AREAS_RS, FreshnessBadge, HistorySparkline, RISK_LEVELS, STATIONS, STATIONS_CIDADES, STATIONS_LAGOA,
    activeENSO, alerts, copernicusEms, copernicusNdvi, copernicusS1, copernicusWater, cptecProducts, dark, dataStaleness, dayNames, effisHealth,
    ensoClass, ensoDominantProb, ensoFirstForecast, ensoObservedAvailable, ensoObservedText, ensoProbabilityAvailable, ensoProbabilityText, expanded, explainCityRisk, explainDailyRisk, explainLagoaRisk,
    formatCemadenRain, formatDateTimeBR, formatProbability, formatSignedCelsius, getFallbackWarningText, getLagoaMaxMay2024, getLagoaMeasuredAt, getLagoaPointData, getLagoaSourceText,
    getResponsibleAgencyText, getRiskBg, getRiskColor, getRiskLevel, getValidatedSourceHealth, lagoaHistory, lagoaHistoryMeta, lagoaStatusColor, lagoaStatusLabel, lagoaSummary, lastUpdate,
    icmbioUcs, loadAllData, loadQueimadas, percentValue, qLoading, queimadas, s, safeEnsoForecast, selData, selStation, setActiveTab, setExpanded, setExpandedCard, setRiskExplain, setSelStation, sourceHealth, stationData, t, wmoDesc, wmoEmoji,
  };

  const renderNavButton = (tab, compact = false) => (
    <button
      key={tab.key}
      onClick={() => {
        setActiveTab(tab.key);
        setMobileMenuOpen(false);
      }}
      className={compact ? "sr-mobile-tab-button" : "sr-side-tab-button"}
      style={{
        padding: compact ? "8px 12px" : "10px 12px",
        fontSize: 12,
        fontFamily: "inherit",
        letterSpacing: 1,
        cursor: "pointer",
        borderRadius: 6,
        textAlign: "left",
        background: activeTab === tab.key ? t.tabActiveBg : "transparent",
        border: activeTab === tab.key ? `1px solid ${t.borderActive}` : `1px solid ${t.border}`,
        color: activeTab === tab.key ? t.tabActive : t.tabInactive,
        transition: "all 0.2s",
      }}
    >
      {tab.label}
    </button>
  );

  return (
    <div style={{ minHeight:"100vh", background:t.bg, color:t.text, fontFamily:"'IBM Plex Mono','Courier New',monospace", transition:"background 0.3s,color 0.3s" }}>
      {/* Grid bg */}
      <div style={{ position:"fixed", inset:0, zIndex:0, backgroundImage:`linear-gradient(${t.grid} 1px,transparent 1px),linear-gradient(90deg,${t.grid} 1px,transparent 1px)`, backgroundSize:"40px 40px", pointerEvents:"none" }} />

      {/* Modal detalhe */}
      {expandedCard && stationData[expandedCard.id] && (
        <CardDetail station={expandedCard} d={stationData[expandedCard.id]} onClose={()=>setExpandedCard(null)} />
      )}

      <div className="sr-app-inner" style={{ position:"relative", zIndex:2, maxWidth:1420, margin:"0 auto", padding:"0 16px 40px" }}>

        <div className="sr-mobile-quickbar">
          <button
            type="button"
            className="sr-mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <span />
            <span />
            <span />
          </button>
          <button onClick={()=>setDark(d=>!d)} title={dark?"Modo claro":"Modo escuro"} className="sr-mobile-quick-btn">
            {dark?"☀️":"🌙"}
          </button>
          <span className="sr-mobile-quick-time">{lastUpdate?lastUpdate.toLocaleTimeString("pt-BR"):"--:--"}</span>
          <button onClick={loadAllData} title="Atualizar" className="sr-mobile-quick-btn">↻</button>
        </div>

        {/* ── HEADER ── */}
        <header style={{ borderBottom:`1px solid ${dark?"rgba(34,211,238,0.2)":t.border}`, paddingBottom:14, marginBottom:20, paddingTop:18 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:loading?"#eab308":"#22c55e", boxShadow:`0 0 6px ${loading?"#eab308":"#22c55e"}` }} />
                <span style={{ fontSize:10, color:t.textMuted, letterSpacing:3 }}>SISTEMA ATIVO · RIO GRANDE DO SUL</span>
              </div>
              <h1 style={{ margin:"2px 0", fontSize:26, fontWeight:700, letterSpacing:-1, color:t.text }}>
                SENTINELA<span style={{ color:t.accent }}>·RS</span>
                <span style={{ fontSize:11, color:t.textMuted, fontWeight:400, letterSpacing:1, marginLeft:10 }}>v2.2</span>
              </h1>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
              <div style={{ padding:"5px 12px", borderRadius:4, border:`1px solid ${RISK_LEVELS[overallRisk].color}`, background:getRiskBg(overallRisk), color:getRiskColor(overallRisk), fontSize:12, fontWeight:700, letterSpacing:2 }}>
                {RISK_LEVELS[overallRisk].icon} RISCO GERAL: {RISK_LEVELS[overallRisk].label.toUpperCase()}
              </div>
              <div className="sr-header-controls" style={{ display:"flex", gap:6, alignItems:"center" }}>
                {/* Toggle modo claro/escuro */}
                <button onClick={()=>setDark(d=>!d)} title={dark?"Modo claro":"Modo escuro"}
                  style={{ padding:"6px 10px", borderRadius:4, fontFamily:"inherit", fontSize:11, cursor:"pointer", background: dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)", border:`1px solid ${t.border}`, color:t.textMuted }}>
                  {dark?"☀️":"🌙"}
                </button>
                <span style={{ fontSize:9, color:t.textFaint }}>{lastUpdate?lastUpdate.toLocaleTimeString("pt-BR"):"..."}</span>
                <button onClick={loadAllData} style={{ background:"none", border:"none", color:t.accent, cursor:"pointer", fontSize:12, padding:0 }}>↻</button>
              </div>
            </div>
          </div>

          {/* Banner ENSO */}
          <div style={{ marginTop:10, padding:"9px 14px", background: ensoBannerActive ? `${ensoBannerColor}12` : (dark?"rgba(100,116,139,0.10)":"rgba(100,116,139,0.08)"), border:`1px solid ${ensoBannerActive ? `${ensoBannerColor}55` : t.border}`, borderRadius:4, fontSize:11, color: ensoBannerActive ? ensoBannerColor : t.textMuted, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <strong>ENSO:</strong> {ensoObservedAvailable ? `${ensoClass.label} observado` : "observado indisponível"}{ensoDominantProb ? ` · ${ensoDominantProb.label} ${formatProbability(ensoDominantProb.value)}` : ""}.
            <button onClick={()=>setActiveTab("enso")} style={{ background:"none", border:"none", color:t.accent, cursor:"pointer", fontSize:11, padding:0, fontFamily:"inherit" }}>Ver dados completos →</button>
          </div>
        </header>

        <div
          className={`sr-mobile-drawer-backdrop ${mobileMenuOpen ? "is-open" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside className={`sr-mobile-drawer ${mobileMenuOpen ? "is-open" : ""}`} style={{ border:`1px solid ${t.borderActive}` }}>
          <div className="sr-mobile-drawer-head">
            <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2 }}>NAVEGAÇÃO</div>
            <button type="button" className="sr-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu">×</button>
          </div>
          <nav className="sr-mobile-tabs">
            {TABS.map((tab) => renderNavButton(tab, true))}
          </nav>
        </aside>

        <div className="sr-shell">
          <aside className="sr-sidebar" style={{ border:`1px solid ${t.border}`, background:t.cardBg, boxShadow:t.shadowCard }}>
            <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2, margin:"0 0 10px 2px" }}>NAVEGAÇÃO</div>
            <nav className="sr-sidebar-nav">
              {TABS.map((tab) => renderNavButton(tab))}
            </nav>
          </aside>

          <main className="sr-content">

        {loading && activeTab!=="copernicus" && activeTab!=="enso" && activeTab!=="apis" && (
          <div style={{ textAlign:"center", padding:50, color:t.accent }}>
            <div style={{ fontSize:28, marginBottom:10, animation:"spin 1s linear infinite", display:"inline-block" }}>◯</div>
            <div style={{ fontSize:11, letterSpacing:4 }}>ANALISANDO OS DADOS...</div>
            <div style={{ fontSize:9, color:t.textMuted, marginTop:4 }}>Open-Meteo · ANA HidroWeb · INPE · NOAA</div>
          </div>
        )}

        <TabErrorBoundary resetKey={activeTab}>
          <Suspense fallback={<div style={{ padding:24, color:t.accent, fontSize:11, letterSpacing:2 }}>CARREGANDO ABA...</div>}>
            {activeTab==="dashboard" && <DashboardTab ctx={tabCtx} />}
            {activeTab==="previsao" && <PrevisaoTab ctx={tabCtx} />}
            {activeTab==="lagoa" && <LagoaDosPatosTab ctx={tabCtx} />}
            {activeTab==="enso" && <EnsoTab ctx={tabCtx} />}
            {activeTab==="cptec" && <CptecTab ctx={tabCtx} />}
            {activeTab==="copernicus" && <CopernicusTab ctx={tabCtx} />}
            {activeTab==="queimadas" && <QueimadasTab ctx={tabCtx} />}
            {activeTab==="alertas" && <AlertasTab ctx={tabCtx} />}
            {activeTab==="apis" && <FontesDeDadosTab ctx={tabCtx} />}
          </Suspense>
        </TabErrorBoundary>

          </main>
        </div>

        {riskExplain && (
          <div
            onClick={()=>setRiskExplain(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          >
            <div
              onClick={(e)=>e.stopPropagation()}
              style={{ width:"min(520px, 100%)", background:dark?"#0f172a":"#ffffff", border:`1px solid ${t.borderActive}`, borderRadius:8, boxShadow:"0 20px 60px rgba(0,0,0,0.35)", padding:16 }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>EXPLICAÇÃO DO STATUS</div>
                  <div style={{ fontSize:17, fontWeight:900, color:t.text, marginTop:3 }}>{riskExplain.title}</div>
                </div>
                <button onClick={()=>setRiskExplain(null)} style={{ background:"none", border:`1px solid ${t.border}`, color:t.textMuted, borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:11, padding:"4px 8px" }}>fechar</button>
              </div>

              <div style={{ display:"grid", gap:7, marginTop:8 }}>
                {riskExplain.lines?.map((line, i)=>(
                  <div key={i} style={{ fontSize:10, color:t.textMuted, lineHeight:1.5, padding:"7px 9px", background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:4 }}>
                    {line}
                  </div>
                ))}
              </div>

              {riskExplain.note && (
                <div style={{ marginTop:10, padding:"8px 10px", background:dark?"rgba(34,211,238,0.07)":"rgba(8,145,178,0.06)", border:"1px solid rgba(34,211,238,0.25)", borderRadius:4, fontSize:9, color:t.textMuted, lineHeight:1.55 }}>
                  {riskExplain.note}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop:28, borderTop:`1px solid ${t.border}`, paddingTop:12, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
          <div style={{ fontSize:9, color:t.textFaint }}>SENTINELA·RS v2.2 · Open-Meteo + INMET + CEMADEN + Lagoa RADAR + HidroSens + ANA complementar/aguardando API + NOAA ENSO + INPE + Copernicus · Fonte CEMADEN: {CEMADEN_ATTRIBUTION}</div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
      `}</style>
    </div>
  );
}
