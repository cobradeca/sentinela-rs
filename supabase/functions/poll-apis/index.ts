/**
 * poll-apis — DESATIVADO
 *
 * Esta função foi desativada porque gerava alertas próprios no banco,
 * o que conflita com a regra operacional do Sentinela·RS:
 *
 *   Alertas operacionais são exclusivamente os avisos oficiais
 *   da Defesa Civil RS (RSS). O app não gera nem publica alertas próprios.
 *
 * O cron associado deve ser removido via migration 004.
 * As tabelas readings e alerts permanecem no banco mas não recebem
 * novos dados por esta função.
 *
 * Se futuramente houver necessidade de persistir histórico de leituras,
 * criar nova função sem lógica de alerta próprio e revisar em sessão dedicada.
 */

Deno.serve(() => {
  return new Response(
    JSON.stringify({
      ok: false,
      disabled: true,
      reason:
        "poll-apis desativado. Alertas operacionais são exclusivamente os avisos oficiais da Defesa Civil RS.",
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
});
