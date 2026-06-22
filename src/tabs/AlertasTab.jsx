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

  const topOfficialAlert = orderedAlerts[0] || null;
  const topLevel = topOfficialAlert?.risk_level || "NORMAL";
  const topRisk = RISK_LEVELS[topLevel] || RISK_LEVELS.NORMAL;
  const topColor = topOfficialAlert ? getRiskColor(topLevel) : "#22c55e";

  const smallCard = {
    padding: "10px 12px",
    background: dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.6)",
    border: `1px solid ${t.border}`,
    borderRadius: 8,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          padding: "16px",
          background: topOfficialAlert ? (dark ? "rgba(239,68,68,0.09)" : "rgba(239,68,68,0.05)") : (dark ? "rgba(34,197,94,0.07)" : "rgba(34,197,94,0.05)"),
          border: `1px solid ${topColor}55`,
          borderLeft: `4px solid ${topColor}`,
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 280px", minWidth: 220 }}>
            <div className="sr-section-eyebrow">PRIORIDADE OPERACIONAL</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: topColor, marginTop: 6 }}>
              {topOfficialAlert ? `${topRisk.icon} ${topRisk.label.toUpperCase()} - Defesa Civil RS` : "Sem aviso oficial ativo no RSS"}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6, marginTop: 8 }}>
              {topOfficialAlert ? topOfficialAlert.message : "Continue acompanhando os canais oficiais. Em situação de risco, ligue para os números abaixo."}
            </div>
            <div className="sr-source-badges" aria-label="Fontes dos avisos oficiais">
              <span className="sr-source-badge is-official">Defesa Civil RS</span>
            </div>
          </div>
          <div className="sr-emergency-actions">
            <a className="sr-emergency-action-link" href="tel:199">199 Defesa Civil</a>
            <a className="sr-emergency-action-link" href="tel:193">193 Bombeiros</a>
            <a className="sr-emergency-action-link" href="tel:190">190 Brigada</a>
            <a className="sr-emergency-action-link" href="https://www.defesacivil.rs.gov.br/" target="_blank" rel="noreferrer">Site oficial</a>
          </div>
        </div>
      </div>

      {orderedAlerts.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {orderedAlerts.slice(1).map((alert, i) => {
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
                  borderRadius: 8,
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

      <div
        style={{
          padding: "14px 16px",
          background: dark ? "rgba(14,165,233,0.08)" : "rgba(14,165,233,0.06)",
          border: "1px solid rgba(14,165,233,0.32)",
          borderRadius: 8,
          color: dark ? "#bae6fd" : "#075985",
          lineHeight: 1.6,
        }}
      >
        <div className="sr-section-eyebrow" style={{ marginBottom: 8 }}>CANAIS OFICIAIS DA DEFESA CIVIL RS</div>
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
              Registre-se pelo telefone (61) 2034-4611 ou clique{" "}
              <a
                href="https://wa.me/556120344611"
                target="_blank"
                rel="noreferrer"
                style={{ color: t.accent, fontWeight: 800, textDecoration: "underline" }}
              >
                aqui
              </a>{" "}
              e envie "Oi" para o robô de atendimento.
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "13px 15px",
          background: dark ? "rgba(234,179,8,0.07)" : "rgba(234,179,8,0.05)",
          border: "1px solid rgba(234,179,8,0.28)",
          borderRadius: 8,
          color: dark ? "#fef08a" : "#854d0e",
          fontSize: 11,
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 2, marginBottom: 8, color: t.textMuted }}>COMO SE CADASTRAR NOS ALERTAS OFICIAIS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Via SMS</div>
            <div>1. Abra o app de SMS do celular.</div>
            <div>2. No destinatário, digite 40199.</div>
            <div>3. No corpo da mensagem, digite o CEP que deseja monitorar.</div>
            <div>4. Envie. Você pode cadastrar mais de um CEP.</div>
          </div>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Via WhatsApp</div>
            <div>1. Registre-se pelo (61) 2034-4611 ou pelo link acima.</div>
            <div>2. Envie "Oi" para iniciar a conversa com o robô.</div>
            <div>3. Compartilhe sua localização atual ou outra de interesse.</div>
            <div>4. Você passa a receber os alertas dessa localidade.</div>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "13px 15px",
          background: dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${t.border}`,
          borderRadius: 8,
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
    </div>
  );
}

