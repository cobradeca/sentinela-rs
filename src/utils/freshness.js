export function dataStaleness(measuredAt) {
  if (!measuredAt) return "unknown";
  const ageMin = (Date.now() - new Date(measuredAt).getTime()) / 60000;
  if (ageMin <= 180) return "fresh";
  if (ageMin <= 1440) return "attention";
  return "stale";
}

export const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\u00e1b"];
