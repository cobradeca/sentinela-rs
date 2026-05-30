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

  return (
    <div>
      <div
        style={{
          marginBottom: 14,
          padding: "12px 14px",
          background: dark ? "rgba(34,197,94,0.08)" : "rgba(22,163,74,0.06)",
          border: "1px solid rgba(34,197,94,0.35)",
          borderRadius: 6,
          fontSize: 12,
          color: dark ? "#bbf7d0" : "#166534",
          lineHeight: 1.6,
        }}
      >
        Esta aba mostra apenas avisos oficiais publicados pela Defesa Civil RS. Em emergencia, ligue 199.
        <a
          href="https://www.defesacivil.rs.gov.br/"
          target="_blank"
          rel="noreferrer"
          style={{ color: t.accent, marginLeft: 8 }}
        >
          Abrir Defesa Civil RS
        </a>
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
            const when = alert.at ? formatDateTimeBR(alert.at) : "sem horario";

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
