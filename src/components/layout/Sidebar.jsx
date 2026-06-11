import { NAV_ITEMS } from "../../config/navigation";
import { NavIcon, SentinelaLogo } from "./NavIcons";

export function Sidebar({ activeTab, onNavigate, lastUpdate, formatDateTime }) {
  return (
    <aside className="sr-sidebar-v2">
      <div className="sr-sidebar-brand">
        <SentinelaLogo size={82} />
        <div className="sr-sidebar-brand-text">
          <strong>SENTINELA</strong>
          <span>RS</span>
        </div>
      </div>

      <nav className="sr-sidebar-nav-v2" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sr-nav-item${activeTab === item.tab ? " is-active" : ""}`}
            onClick={() => onNavigate(item.tab)}
          >
            <NavIcon name={item.icon} size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <a className="sr-emergency-card" href="tel:199">
        <NavIcon name="phone" size={22} />
        <div>
          <div className="sr-emergency-label">EMERGÊNCIA</div>
          <div className="sr-emergency-number">199</div>
          <div className="sr-emergency-agency">Defesa Civil RS</div>
        </div>
      </a>

      <div className="sr-sidebar-footer">
        <div>Dados oficiais de fontes governamentais</div>
        {lastUpdate && (
          <div className="sr-sidebar-updated">
            <NavIcon name="clock" size={12} />
            {formatDateTime(lastUpdate)}
          </div>
        )}
      </div>
    </aside>
  );
}
