export function AlertasTab({ ctx }) {
  const {
    RISK_LEVELS,
    alerts,
    dark,
    formatDateTimeBR,
    getRiskBg,
    getRiskColor,
    t,
  } = ctx;

  const orderedAlerts = [...(alerts || [])].sort((a, b) => {
    const order = ["CRITICO", "EMERGENCIA", "ALERTA", "ATENCAO", "NORMAL"];
    return order.indexOf(a.risk_level) - order.indexOf(b.risk_level);
  });

  const smallCard = {
    padding: "9px 10px",
    background: dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.55)",
    border: `1px solid ${t.border}`,
    borderRadius: 5,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          padding: "12px 14px",
          background: dark ? "rgba(34,197,94,0.08)" : "rgba(22,163,74,0.06)",
          border: "1px solid rgba(34,197,94,0.35)",
          borderRadius: 6,
          fontSize: 12,
          color: dark ? "#bbf7d0" : "#166534",
          lineHeight: 1.6,
        }}
      >
        <strong>Acompanhe os avisos oficiais da Defesa Civil RS.</strong> Em emergência, ligue 199. Para Bombeiros, 193. Para Brigada Militar, 190.
        <a
          href="https://www.defesacivil.rs.gov.br/"
          target="_blank"
          rel="noreferrer"
          style={{ color: t.accent, marginLeft: 8 }}
        >
          Abrir Defesa Civil RS
        </a>
      </div>

      <div
        style={{
          padding: "13px 15px",
          background: dark ? "rgba(14,165,233,0.08)" : "rgba(14,165,233,0.06)",
          border: "1px solid rgba(14,165,233,0.32)",
          borderRadius: 6,
          color: dark ? "#bae6fd" : "#075985",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 2, marginBottom: 8, color: t.textMuted }}>CANAIS OFICIAIS DA DEFESA CIVIL RS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
          {[
            ["SMS 40199", "Envie o CEP para 40199 para receber avisos gratuitos no celular."],
            ["Site oficial / RSS", "Últimos avisos e alertas oficiais exibidos nesta aba."],
            ["Emergência", "Em situação de risco, ligue 199. Bombeiros: 193. Brigada Militar: 190."],
          ].map(([title, text]) => (
            <div key={title} style={smallCard}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.text }}>{title}</div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3 }}>{text}</div>
            </div>
          ))}
          <div style={smallCard}>
            <div style={{ fontSize: 11, fontWeight: 800, color: t.text }}>WhatsApp oficial</div>
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3 }}>
              Clique{" "}
              <a
                href="https://web.whatsapp.com/accept?channel_invite_code=0029VbAHjAn2f3EQlWU7nz2E&source_surface="
                target="_blank"
                rel="noreferrer"
                style={{ color: t.accent, fontWeight: 800, textDecoration: "underline" }}
              >
                aqui
              </a>{" "}
              e entre no canal do WhatsApp.
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "13px 15px",
          background: dark ? "rgba(234,179,8,0.07)" : "rgba(234,179,8,0.05)",
          border: "1px solid rgba(234,179,8,0.28)",
          borderRadius: 6,
          color: dark ? "#fef08a" : "#854d0e",
          fontSize: 11,
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 2, marginBottom: 8, color: t.textMuted }}>COMO SE CADASTRAR NOS ALERTAS OFICIAIS</div>
        <div>1. Abra o app de SMS do celular.</div>
        <div>2. No destinatário, digite 40199.</div>
        <div>3. No corpo da mensagem, digite o CEP que deseja monitorar.</div>
        <div>4. Envie. Você pode cadastrar mais de um CEP.</div>
      </div>

      <div
        style={{
          padding: "13px 15px",
          background: dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${t.border}`,
          borderRadius: 6,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 2, marginBottom: 8, color: t.textMuted }}>DICAS OFICIAIS DE PREVENÇÃO</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}>
          {[
            ["Chuva forte", "Evite sair, não atravesse ruas alagadas e acompanhe os avisos meteorológicos."],
            ["Ventos fortes", "Fique longe de placas, postes, árvores e coberturas frágeis. Recolha objetos soltos."],
            ["Inundações", "Guarde documentos e objetos de valor em locais altos e evite contato com água contaminada."],
            ["Deslizamentos", "Observe rachaduras, postes inclinados e sinais de instabilidade. Busque local seguro."],
          ].map(([title, text]) => (
            <div key={title} style={{ ...smallCard, background: dark ? "rgba(0,0,0,0.22)" : t.bg }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.text }}>{title}</div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {orderedAlerts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 42,
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 6,
            background: "rgba(34,197,94,0.05)",
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 10 }}>✓</div>
          <div style={{ fontSize: 14, color: "#22c55e", letterSpacing: 1.5 }}>
            Sem aviso oficial ativo no RSS
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
            Continue acompanhando os canais oficiais da Defesa Civil RS.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {orderedAlerts.map((alert, i) => {
            const level = alert.risk_level || "ALERTA";
            const risk = RISK_LEVELS[level] || RISK_LEVELS.ALERTA;
            const riskColor = getRiskColor(level);
            const riskBg = getRiskBg(level);
            const when = alert.at ? formatDateTimeBR(alert.at) : "sem horário";

            return (
              <div
                key={alert.id || `${alert.station || "defesa-civil"}-${i}`}
                style={{
                  padding: "13px 15px",
                  background: riskBg,
                  border: `1px solid ${riskColor}55`,
                  borderLeft: `4px solid ${riskColor}`,
                  borderRadius: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 7 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: riskColor }}>
                    {risk.icon} {risk.label.toUpperCase()} - Defesa Civil RS
                  </div>
                  <div style={{ fontSize: 10, color: t.textMuted, whiteSpace: "nowrap" }}>{when}</div>
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.55 }}>{alert.message}</div>
                {(alert.url || alert.link) && (
                  <a
                    href={alert.url || alert.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-block", marginTop: 9, fontSize: 11, color: t.accent }}
                  >
                    Ver aviso oficial
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
