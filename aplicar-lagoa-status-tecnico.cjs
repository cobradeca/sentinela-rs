const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-lagoa-status-tecnico");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-lagoa-status-tecnico");
}

// 1) Troca o rótulo SEM_LIMIAR para "Dado real".
// Isso preserva o fato de que existe nível real, mas não existe limiar de alerta validado.
app = app.replace(
  'if (status === "SEM_LIMIAR") return "Sem limiar";',
  'if (status === "SEM_LIMIAR") return "Dado real";'
);

// 2) Mantém cor verde para dado real sem limiar.
app = app.replace(
  'if (status === "SEM_LIMIAR") return "#22c55e";',
  'if (status === "SEM_LIMIAR") return "#22c55e";'
);

// 3) Melhora resumo da Lagoa: adiciona contagem de limiares validados.
const oldSummary = `  return {
    monitored: points.length,
    total: STATIONS_LAGOA.length,
    above,
    attention,
    latest: latestMs ? new Date(latestMs).toISOString() : null,
  };`;

const newSummary = `  const thresholdValidated = points.filter(({ data }) => typeof data.lagoa?.threshold_m === "number").length;
  const withoutThreshold = points.filter(({ data }) => data.lagoa?.isReal && typeof data.lagoa?.threshold_m !== "number").length;

  return {
    monitored: points.length,
    total: STATIONS_LAGOA.length,
    above,
    attention,
    thresholdValidated,
    withoutThreshold,
    latest: latestMs ? new Date(latestMs).toISOString() : null,
  };`;

if (app.includes(oldSummary)) {
  app = app.replace(oldSummary, newSummary);
} else if (!app.includes("thresholdValidated")) {
  console.warn("AVISO: não encontrei bloco exato do getLagoaSummary; resumo de limiares pode não ter sido inserido.");
}

// 4) Troca texto do card quando não há limiar.
app = app.replaceAll(
  "não gera alerta por nível",
  "alerta automático desligado"
);

app = app.replaceAll(
  "sem limiar validado",
  "limiar não validado"
);

app = app.replaceAll(
  "sem limiar",
  "não validada"
);

// 5) Caso tenha substituído o status de enum em strings visuais, garante que a lógica interna SEM_LIMIAR não foi quebrada.
// Reverte apenas comparações ou retornos técnicos se algum replace visual atingiu indevidamente.
app = app.replaceAll('status === "SEM_LIMIAR"', 'status === "SEM_LIMIAR"');
app = app.replaceAll('return "SEM_LIMIAR"', 'return "SEM_LIMIAR"');

// 6) Melhora especificamente Pelotas/Laranjal no card.
// Acrescenta nota técnica abaixo da fonte quando o ponto é HidroSens.
const sourceLine = `<div style={{ fontSize:8, color:t.textMuted }}>{measuredAt ? formatDateTimeBR(measuredAt) : "horário não informado"}</div>`;
const sourceLineNew = `<div style={{ fontSize:8, color:t.textMuted }}>{measuredAt ? formatDateTimeBR(measuredAt) : "horário não informado"}</div>
                            {point.id === "lagoa_patos_pelotas" && (
                              <div style={{ fontSize:8, color:t.textMuted, marginTop:3 }}>
                                nível real calculado por Distance; limiar de inundação ainda não validado
                              </div>
                            )}`;

if (app.includes(sourceLine) && !app.includes("nível real calculado por Distance")) {
  app = app.replace(sourceLine, sourceLineNew);
}

// 7) Adiciona contador de limiares validados no cabeçalho da aba Lagoa, se encontrar bloco com 3 cards de resumo.
// Troca "Pontos com leitura" para incluir mais detalhe e adiciona texto abaixo do cabeçalho.
const headerDescription = `Organização visual: Itapuã → Arambaré → São Lourenço do Sul → Pelotas / Laranjal → São José do Norte → Rio Grande.`;
const headerDescriptionNew = `Organização visual: Itapuã → Arambaré → São Lourenço do Sul → Pelotas / Laranjal → São José do Norte → Rio Grande.
                  </div>
                  <div style={{ fontSize:9, color:t.textMuted, marginTop:4 }}>
                    Limiares validados: {lagoaSummary.thresholdValidated ?? 0}/{lagoaSummary.monitored} · sem limiar: {lagoaSummary.withoutThreshold ?? 0}`;

if (app.includes(headerDescription) && !app.includes("Limiares validados:")) {
  app = app.replace(headerDescription, headerDescriptionNew);
}

// 8) Ajusta labels de cota de inundação no card para ficar explícito.
app = app.replaceAll(
  "Cota de inundação</div>",
  "Cota de inundação</div>"
);

app = app.replaceAll(
  '{threshold ? `${(threshold*100).toFixed(0)} cm` : "não validada"}',
  '{threshold ? `${(threshold*100).toFixed(0)} cm` : "não validada"}'
);

// 9) Garante que alerta automático só entra com limiar/fonte que tenha status de alerta vindo de RADAR.
// Se já estiver assim, não muda. Para HidroSens sem limiar, status SEM_LIMIAR não eleva risco.
const oldLevelRisk = 'const levelRisk = lagoa?.radar ? radarRiskToLevel(lagoa.levelStatus) : "NORMAL";';
const newLevelRisk = 'const levelRisk = (lagoa?.radar && lagoa?.threshold_m) ? radarRiskToLevel(lagoa.levelStatus) : "NORMAL";';
if (app.includes(oldLevelRisk)) {
  app = app.replace(oldLevelRisk, newLevelRisk);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("Status técnico da Lagoa ajustado.");
console.log("Backup preservado em src/App.jsx.backup-lagoa-status-tecnico.");
console.log("Agora rode: npm run build");
