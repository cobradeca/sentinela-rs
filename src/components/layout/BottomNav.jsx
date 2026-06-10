import { MOBILE_NAV } from "../../config/navigation";
import { NavIcon } from "./NavIcons";

export function BottomNav({ activeTab, onNavigate, onAction }) {
  return (
    <nav className="sr-bottom-nav" aria-label="Navegação rápida">
      {MOBILE_NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`sr-bottom-nav-item${item.tab && activeTab === item.tab ? " is-active" : ""}`}
          onClick={() => {
            if (item.action) onAction?.(item.action);
            else if (item.tab) onNavigate(item.tab);
          }}
        >
          <NavIcon name={item.icon} size={20} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
