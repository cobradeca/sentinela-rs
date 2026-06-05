export const RISK_LEVELS = {
  NORMAL:     { label: "Normal",     color: "#22c55e", bg: "#052e16", bgLight: "#dcfce7", colorLight: "#15803d", icon: "\u2713" },
  ATENCAO:    { label: "Aten\u00e7\u00e3o",    color: "#eab308", bg: "#1c1a05", bgLight: "#fef9c3", colorLight: "#a16207", icon: "\u26a0" },
  ALERTA:     { label: "Alerta",     color: "#f97316", bg: "#1c0a05", bgLight: "#ffedd5", colorLight: "#c2410c", icon: "\u25b2" },
  SEVERO:     { label: "Severo",     color: "#ef4444", bg: "#1c0505", bgLight: "#fee2e2", colorLight: "#b91c1c", icon: "\u25b2" },
  EMERGENCIA: { label: "Emerg\u00eancia", color: "#ef4444", bg: "#1c0505", bgLight: "#fee2e2", colorLight: "#b91c1c", icon: "\u2b06" },
  CRITICO:    { label: "Cr\u00edtico",    color: "#dc2626", bg: "#1c0000", bgLight: "#fecaca", colorLight: "#991b1b", icon: "\u2620" },
};

export function getRiskLevel(precipAccum, tempMin, windMax, lagoaLevel = null) {
  let score = 0;
  if (precipAccum > 150) score += 4; else if (precipAccum > 80) score += 3;
  else if (precipAccum > 40) score += 2; else if (precipAccum > 20) score += 1;
  if (tempMin < 0) score += 3; else if (tempMin < 5) score += 2;
  if (windMax > 80) score += 3; else if (windMax > 50) score += 2; else if (windMax > 30) score += 1;
  if (lagoaLevel !== null) {
    // Lagoa risk is station-specific and must use each station threshold.
  }
  if (score >= 9) return "CRITICO";
  if (score >= 6) return "EMERGENCIA";
  if (score >= 4) return "ALERTA";
  if (score >= 2) return "ATENCAO";
  return "NORMAL";
}
