export function classifyENSO(a) {
  if (a === null || a === undefined || Number.isNaN(Number(a))) return { label:"Indispon\u00edvel", color:"#64748b", icon:"\u2013" };
  if (a >= 2.0)   return { label:"Super El Ni\u00f1o",   color:"#dc2626", icon:"\ud83d\udd34" };
  if (a >= 1.5)   return { label:"El Ni\u00f1o Forte",   color:"#ef4444", icon:"\ud83d\udfe0" };
  if (a >= 0.5)   return { label:"El Ni\u00f1o",         color:"#f97316", icon:"\ud83d\udfe1" };
  if (a > -0.5)   return { label:"Neutro",          color:"#22c55e", icon:"\ud83d\udfe2" };
  if (a > -1.5)   return { label:"La Ni\u00f1a",         color:"#3b82f6", icon:"\ud83d\udd35" };
  if (a > -2.0)   return { label:"La Ni\u00f1a Forte",   color:"#1d4ed8", icon:"\ud83d\udfe3" };
  return           { label:"Super La Ni\u00f1a",         color:"#1e3a8a", icon:"\u26ab" };
}

export function formatSignedCelsius(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}\u00b0C`
    : "indispon\u00edvel";
}

export function formatProbability(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${(value * 100).toFixed(0)}%`
    : "indispon\u00edvel";
}

export function percentValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value * 100 : 0;
}

export function safeEnsoForecast(forecast) {
  return Array.isArray(forecast) ? forecast : [];
}

export function getDominantEnsoPhase(prob) {
  const items = [
    { key: "elNino", label: "El Ni\u00f1o", value: prob?.elNino, color: "#f97316" },
    { key: "neutral", label: "Neutro", value: prob?.neutral, color: "#22c55e" },
    { key: "laNina", label: "La Ni\u00f1a", value: prob?.laNina, color: "#3b82f6" },
  ].filter((item) => typeof item.value === "number" && Number.isFinite(item.value));

  if (!items.length) return null;
  return items.sort((a, b) => b.value - a.value)[0];
}

export function formatDominantEnsoProbability(prob, period = "") {
  const dominant = getDominantEnsoPhase(prob);
  if (!dominant) return "Probabilidade IRI/CCSR indispon\u00edvel";
  return `Evento mais prov\u00e1vel: ${dominant.label} ${formatProbability(dominant.value)}${period ? ` \u00b7 ${period}` : ""}`;
}
