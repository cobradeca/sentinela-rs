import { NavIcon } from "./NavIcons";

export function PageHeader({
  title,
  subtitle,
  lastUpdate,
  formatDateTime,
  sourceText,
  onAction,
  actionLabel = "Saiba mais",
  weatherWidget,
}) {
  return (
    <div className="sr-page-header">
      <div className="sr-page-header-top">
        <div>
          <h1 className="sr-page-title">{title}</h1>
          {subtitle && <p className="sr-page-subtitle">{subtitle}</p>}
        </div>
        <div className="sr-page-header-actions">
          {sourceText && <span className="sr-page-source">{sourceText}</span>}
          {onAction && (
            <button type="button" className="sr-btn-outline" onClick={onAction}>
              <NavIcon name="info" size={16} />
              {actionLabel}
            </button>
          )}
          {weatherWidget}
        </div>
      </div>
      {lastUpdate && (
        <div className="sr-update-bar">
          <NavIcon name="clock" size={16} />
          <span>Última atualização: {formatDateTime ? formatDateTime(lastUpdate) : lastUpdate}</span>
        </div>
      )}
    </div>
  );
}
