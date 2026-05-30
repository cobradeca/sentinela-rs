/**
 * DefesaCivilNotice — aviso padronizado em todas as abas informativas.
 *
 * O Sentinela·RS é um painel de contexto e monitoramento.
 * Alertas operacionais são exclusivamente os avisos oficiais da Defesa Civil RS.
 */
export function DefesaCivilNotice({ t, dark, compact = false }) {
  const bg   = dark ? "rgba(234,179,8,0.07)" : "rgba(234,179,8,0.06)";
  const bdr  = "1px solid rgba(234,179,8,0.28)";
  const pad  = compact ? "7px 11px" : "10px 14px";
  const fs   = compact ? 9 : 10;

  return (
    <div
      role="note"
      aria-label="Aviso: este painel é informativo. Para emergências, contate a Defesa Civil RS."
      style={{
        padding: pad,
        background: bg,
        border: bdr,
        borderRadius: 5,
        fontSize: fs,
        color: dark ? "#fef08a" : "#854d0e",
        lineHeight: 1.55,
      }}
    >
      <strong>⚠ Painel informativo.</strong>{" "}
      Indicadores de contexto — não substituem avisos oficiais.{" "}
      Emergências:{" "}
      <a
        href="https://www.defesacivil.rs.gov.br/"
        target="_blank"
        rel="noreferrer"
        aria-label="Site da Defesa Civil RS (abre em nova aba)"
        style={{ color: dark ? "#fbbf24" : "#92400e", fontWeight: 700, textDecoration: "underline" }}
      >
        Defesa Civil RS
      </a>
      {" · "}
      <a
        href="tel:199"
        aria-label="Ligue 199 para a Defesa Civil"
        style={{ color: dark ? "#fbbf24" : "#92400e", fontWeight: 700, textDecoration: "underline" }}
      >
        199
      </a>
      {" · "}
      <a
        href="tel:193"
        aria-label="Ligue 193 para o Corpo de Bombeiros"
        style={{ color: dark ? "#fbbf24" : "#92400e", fontWeight: 700, textDecoration: "underline" }}
      >
        193 Bombeiros
      </a>
    </div>
  );
}
