import { DefesaCivilNotice } from "../components/DefesaCivilNotice";

const SOURCE_COLORS = {
  gnews: "#38bdf8",
  metsul: "#f97316",
  copernicus: "#34d399",
  cptec: "#fb923c",
};

const SOURCE_ICONS = {
  gnews: "📰",
  metsul: "🌦️",
  copernicus: "🌍",
  cptec: "🇧🇷",
};

function formatRelativeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function NoticiasEnsoTab({ ctx }) {
  const { dark, ensoNoticias, ensoNoticiasLoading, loadEnsoNoticias, t } = ctx;
  const items = ensoNoticias?.items || [];
  const sources = ensoNoticias?.sources || [];
  const failedSources = sources.filter((src) => !src.ok);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <DefesaCivilNotice t={t} dark={dark} compact />

      <div className="sr-card-v2" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="sr-section-eyebrow">NOTÍCIAS ENSO</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginTop: 4 }}>
            Portais brasileiros e fontes científicas sobre El Niño e ENSO
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, lineHeight: 1.6 }}>
            Contexto informativo. Os links abrem a fonte original e não substituem avisos oficiais.
          </div>
        </div>
        <button
          onClick={loadEnsoNoticias}
          disabled={ensoNoticiasLoading}
          className="sr-btn-outline"
        >
          {ensoNoticiasLoading ? "Buscando..." : "Atualizar"}
        </button>
      </div>

      {failedSources.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {failedSources.map((src) => (
            <div key={src.id} style={{
              fontSize: 9,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#ef4444",
            }}>
              {SOURCE_ICONS[src.id] || "📡"} {src.name}: {src.error || "indisponível"}
            </div>
          ))}
        </div>
      )}

      {ensoNoticiasLoading && (
        <div style={{ textAlign: "center", padding: 36, color: t.accent, fontSize: 12 }}>
          🌪️ Buscando notícias...
        </div>
      )}

      {!ensoNoticiasLoading && !ensoNoticias && (
        <div style={{ textAlign: "center", padding: 36, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textMuted, fontSize: 11 }}>
          Clique em <strong>Atualizar</strong> para consultar as notícias.
        </div>
      )}

      {!ensoNoticiasLoading && ensoNoticias && !ensoNoticias.ok && items.length === 0 && (
        <div style={{ padding: "12px 14px", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: dark ? "#fca5a5" : "#b91c1c", fontSize: 11 }}>
          Não foi possível carregar as notícias agora. Tente novamente em alguns minutos.
        </div>
      )}

      {!ensoNoticiasLoading && ensoNoticias && items.length === 0 && ensoNoticias.ok && (
        <div style={{ padding: "12px 14px", border: `1px solid ${t.border}`, borderRadius: 8, color: t.textMuted, fontSize: 11, textAlign: "center" }}>
          Nenhuma notícia sobre ENSO encontrada nas fontes no momento.
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => {
          const color = SOURCE_COLORS[item.source_id] || t.accent;
          const icon = SOURCE_ICONS[item.source_id] || "📡";
          const when = formatRelativeDate(item.pub_date);
          return (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                textDecoration: "none",
                padding: "14px 15px",
                background: dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${t.border}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 9, color, fontWeight: 700 }}>{icon} {item.source_name}</span>
                {when && <span style={{ fontSize: 9, color: t.textMuted }}>{when}</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.45, marginBottom: 5 }}>{item.title}</div>
              {item.description && <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.6 }}>{item.description}</div>}
              <div style={{ marginTop: 8, fontSize: 9, color, textAlign: "right" }}>ler na fonte original →</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

