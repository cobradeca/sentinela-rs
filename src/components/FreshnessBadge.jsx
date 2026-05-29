function dataStaleness(measuredAt) {
  if (!measuredAt) return "unknown";
  const ageMin = (Date.now() - new Date(measuredAt).getTime()) / 60000;
  if (ageMin <= 180) return "fresh";
  if (ageMin <= 1440) return "attention";
  return "stale";
}

export function FreshnessBadge({ measuredAt, fallback, fallbackAgeMin, t }) {
  const status = fallback ? "stale" : dataStaleness(measuredAt);
  const cfg = {
    fresh: { label: "Atualizado", color: "#22c55e", dot: "●" },
    attention: { label: "Atenção", color: "#eab308", dot: "◐" },
    stale: { label: "Desatualizado", color: "#ef4444", dot: "○" },
    unknown: { label: "Sem horário", color: "#64748b", dot: "-" },
  }[status];

  const age = fallback && fallbackAgeMin
    ? ` · ${fallbackAgeMin}min atrás`
    : measuredAt
      ? ` · ${Math.round((Date.now() - new Date(measuredAt).getTime()) / 60000)}min atrás`
      : "";

  return (
    <span style={{ fontSize: 8, color: cfg.color, fontWeight: 600 }}>
      {cfg.dot} {cfg.label}{age}
    </span>
  );
}
