import { DefesaCivilNotice } from "../components/DefesaCivilNotice";

export function CptecTab({ ctx }) {
  const { cptecProducts, dark, formatDateTimeBR, s, t } = ctx;

  const products = (cptecProducts?.products || []).filter((p) => p.ok);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <DefesaCivilNotice t={t} dark={dark} />

      <div className="sr-card-v2" style={{ border: `1px solid ${t.borderActive}` }}>
        <div className="sr-section-eyebrow">CPTEC / INPE</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: t.text, marginTop: 6 }}>
          Produtos sazonais e subsazonais oficiais
        </div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, lineHeight: 1.7 }}>
          Os mapas ajudam a ler tendências climáticas em semanas ou meses. Eles não substituem alerta local da Defesa Civil, INMET, Open-Meteo observado ou sensores de nível.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, fontSize: 9 }}>
          <span style={{ padding: "4px 8px", border: `1px solid ${cptecProducts?.ok ? "#22c55e" : "#64748b"}`, color: cptecProducts?.ok ? "#22c55e" : t.textMuted, borderRadius: 4 }}>
            {cptecProducts?.ok ? "ATIVO" : "CARREGANDO"}
          </span>
          <span style={{ padding: "4px 8px", border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 4 }}>
            Produtos válidos: {cptecProducts?.available ?? 0}/{cptecProducts?.total ?? 0}
          </span>
          <span style={{ padding: "4px 8px", border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 4 }}>
            Última consulta: {cptecProducts?.fetched_at ? formatDateTimeBR(cptecProducts.fetched_at) : "—"}
          </span>
        </div>
      </div>

      <div className="sr-card-v2" style={{ color: t.textMuted, fontSize: 11, lineHeight: 1.7 }}>
        <strong style={{ color: t.text }}>Como ler:</strong> produtos sazonais resumem aproximadamente 3 meses; subsazonais mostram semanas à frente. São contexto regional, não previsão diária por município.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12 }}>
        {products.map((p) => (
          <div key={p.id} className="sr-card-v2" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 8, color: t.textMuted, letterSpacing: 2 }}>{p.group?.toUpperCase()} · {p.period}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{p.title}</div>
              </div>
              <div style={{ fontSize: 8, color: "#22c55e", border: "1px solid #22c55e55", borderRadius: 4, padding: "3px 6px" }}>OK</div>
            </div>
            <a href={p.url} target="_blank" rel="noreferrer">
              <img src={p.url} alt={p.title} style={{ width: "100%", borderRadius: 6, border: `1px solid ${t.border}`, background: "#fff" }} />
            </a>
            <div style={{ marginTop: 7, fontSize: 8, color: t.textMuted }}>
              Fonte: CPTEC/INPE · produto gráfico oficial · {p.contentLength ? `${Math.round(p.contentLength / 1024)} KB` : "tamanho não informado"}
            </div>
            <div style={{ marginTop: 6, padding: "7px 10px", background: dark ? "rgba(34,211,238,0.04)" : "rgba(8,145,178,0.03)", border: `1px solid ${t.border}`, borderRadius: 4, fontSize: 8, color: t.textMuted, lineHeight: 1.6 }}>
              {(p.group?.toLowerCase().includes("subsaz") || p.title?.toLowerCase().includes("semana")) ? (
                <span>📆 <strong style={{ color: t.text }}>Subsazonal semanal:</strong> tendência de 1 a 4 semanas à frente.</span>
              ) : p.group?.toLowerCase().includes("saz") ? (
                <span>🗓 <strong style={{ color: t.text }}>Sazonal:</strong> tendência provável para cerca de 3 meses.</span>
              ) : p.group?.toLowerCase().includes("precipitacao") ? (
                <span>🌧 <strong style={{ color: t.text }}>Chuva:</strong> tendência regional de acumulado no período.</span>
              ) : p.group?.toLowerCase().includes("temperatura") ? (
                <span>🌡 <strong style={{ color: t.text }}>Temperatura:</strong> comparação com o padrão histórico.</span>
              ) : (
                <span>🛰 <strong style={{ color: t.text }}>Produto CPTEC/INPE:</strong> imagem oficial de monitoramento climático.</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {cptecProducts && !cptecProducts.ok && (
        <div className="sr-card-v2" style={{ color: t.textMuted, fontSize: 11 }}>
          Nenhum produto CPTEC/INPE validado no momento.
        </div>
      )}
    </div>
  );
}

