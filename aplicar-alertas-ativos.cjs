const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode este script na raiz do projeto sentinela-rs.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(process.cwd(), "src", "App.jsx.backup-alertas-ativos");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, app, "utf8");
  console.log("Backup criado em src/App.jsx.backup-alertas-ativos");
}

const oldBlock = `        if (risk !== "NORMAL") {
          const parts=[];
          if (precip>80) parts.push(\`chuva \${precip.toFixed(0)}mm/14d\`);
          if (tempMin<5) parts.push(\`temp. mín. \${tempMin.toFixed(1)}°C\`);
          if (windMax>50) parts.push(\`rajadas \${windMax.toFixed(0)}km/h\`);
          if (lagoa?.isReal && lagoa.atual>0.8) parts.push(\`lagoa \${lagoa.atual.toFixed(2)}m (ANA)\`);
          newAlerts.push({ id:\`\${st.id}_\${Date.now()}\`, station:st.name, risk_level:risk, message:parts.join(" · ")||"Parâmetros em atenção", at:new Date() });
        }`;

const newBlock = `        // Só ALERTA, EMERGÊNCIA e CRÍTICO entram na aba Alertas.
        // ATENÇÃO permanece visível no card, mas não infla o contador de alertas ativos.
        if (["ALERTA", "EMERGENCIA", "CRITICO"].includes(risk)) {
          const parts=[];
          if (precip>80) parts.push(\`chuva \${precip.toFixed(0)}mm/14d\`);
          if (tempMin<5) parts.push(\`temp. mín. \${tempMin.toFixed(1)}°C\`);
          if (windMax>50) parts.push(\`rajadas \${windMax.toFixed(0)}km/h\`);
          if (lagoa?.isReal && lagoa.atual>0.8) parts.push(\`lagoa \${lagoa.atual.toFixed(2)}m (ANA)\`);
          newAlerts.push({ id:\`\${st.id}_\${Date.now()}\`, station:st.name, risk_level:risk, message:parts.join(" · ")||"Parâmetros acima do normal", at:new Date(), official:false });
        }`;

if (app.includes(oldBlock)) {
  app = app.replace(oldBlock, newBlock);
} else if (!app.includes('["ALERTA", "EMERGENCIA", "CRITICO"].includes(risk)')) {
  console.error("ERRO: não encontrei o bloco de criação de alertas locais.");
  process.exit(1);
}

// Ajusta texto da tela de nenhum alerta para deixar claro que atenção pode existir no dashboard.
app = app.replace(
  "Estações dentro dos parâmetros normais.",
  "Sem alertas operacionais severos. Condições de atenção podem aparecer no Dashboard."
);

// Opcional: melhora o rodapé da aba Alertas quando há alertas.
app = app.replace(
  "🔔 Alertas na tela\",    s:\"Ativo — 30min\"",
  "🔔 Alertas na tela\",    s:\"Ativo — oficiais + severos\""
);

fs.writeFileSync(appPath, app, "utf8");

console.log("App.jsx atualizado: ATENÇÃO local não entra mais como alerta ativo.");
console.log("Backup preservado em src/App.jsx.backup-alertas-ativos.");
console.log("Agora rode: npm run build");
