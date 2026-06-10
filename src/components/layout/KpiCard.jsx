import { NavIcon } from "./NavIcons";

export function KpiCard({ icon, label, value, sublabel, trend, trendDir, accent = "blue" }) {
  const trendClass = trendDir === "up" ? "is-up" : trendDir === "down" ? "is-down" : "";
  return (
    <div className={`sr-kpi-card sr-kpi-${accent}`}>
      <div className="sr-kpi-icon">
        <NavIcon name={icon} size={20} />
      </div>
      <div className="sr-kpi-body">
        <div className="sr-kpi-label">{label}</div>
        <div className="sr-kpi-value">{value}</div>
        {sublabel && <div className="sr-kpi-sublabel">{sublabel}</div>}
        {trend && <div className={`sr-kpi-trend ${trendClass}`}>{trend}</div>}
      </div>
    </div>
  );
}
