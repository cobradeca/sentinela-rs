const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", `App.jsx.backup-caixa-explicativa-status-${Date.now()}`);
fs.writeFileSync(backup, app, "utf8");

function fail(label) {
  console.error("ERRO: trecho não encontrado:", label);
  process.exit(1);
}

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) fail(label);
  app = app.replace(search, replacement);
  console.log("OK:", label);
}

function insertAfter(search, insert, label) {
  if (!app.includes(search)) fail(label);
  app = app.replace(search, search + insert);
  console.log("OK:", label);
}

// 1) Helpers de explicação.
if (!app.includes("function explainCityRisk")) {
  insertAfter(
`function formatCemadenRain(cemaden) {
  if (!cemaden) return "";
  const acc24 = typeof cemaden.max_acc24hr === "number" ? cemaden.max_acc24hr : null;
  const acc6 = typeof cemaden.max_acc6hr === "number" ? cemaden.max_acc6hr : null;

  if (acc24 !== null) return \`chuva observada 24h \${acc24.toFixed(1)}mm\`;
  if (acc6 !== null) return \`chuva observada 6h \${acc6.toFixed(1)}mm\`;

  return "chuva observada disponível";
}
`,
`
function explainCityRisk(station, d, ensoText = "") {
  if (!d || d.error) {
    return {
      title: \`\${station?.name || "Cidade"} — sem dados suficientes\`,
      status: "Sem leitura",
      lines: ["Não foi possível carregar todos os parâmetros necessários para classificar esta cidade."],
      note: "Sem simulação: quando uma fonte não responde, o app mostra indisponibilidade."
    };
  }

  const lines = [];
  const precip = typeof d.precip === "number" ? d.precip : null;
  const tempMin = typeof d.tempMin === "number" ? d.tempMin : null;
  const windMax = typeof d.windMax === "number" ? d.windMax : null;

  if (precip !== null) {
    if (precip > 150) lines.push(\`Chuva prevista muito alta em 14 dias: \${precip.toFixed(0)}mm.\`);
    else if (precip > 80) lines.push(\`Chuva prevista alta em 14 dias: \${precip.toFixed(0)}mm.\`);
    else if (precip > 40) lines.push(\`Chuva prevista moderada em 14 dias: \${precip.toFixed(0)}mm.\`);
    else if (precip > 20) lines.push(\`Chuva prevista em acompanhamento em 14 dias: \${precip.toFixed(0)}mm.\`);
    else lines.push(\`Chuva prevista baixa em 14 dias: \${precip.toFixed(0)}mm.\`);
  }

  if (tempMin !== null) {
    if (tempMin < 0) lines.push(\`Temperatura mínima extrema: \${tempMin.toFixed(1)}°C.\`);
    else if (tempMin < 5) lines.push(\`Temperatura mínima baixa: \${tempMin.toFixed(1)}°C.\`);
    else if (tempMin < 10) lines.push(\`Temperatura mínima em atenção: \${tempMin.toFixed(1)}°C.\`);
    else lines.push(\`Temperatura mínima sem gatilho de atenção: \${tempMin.toFixed(1)}°C.\`);
  }

  if (windMax !== null) {
    if (windMax > 80) lines.push(\`Vento muito forte previsto: \${windMax.toFixed(0)}km/h.\`);
    else if (windMax > 50) lines.push(\`Vento forte previsto: \${windMax.toFixed(0)}km/h.\`);
    else if (windMax > 30) lines.push(\`Vento em acompanhamento: \${windMax.toFixed(0)}km/h.\`);
    else lines.push(\`Vento sem gatilho de atenção: \${windMax.toFixed(0)}km/h.\`);
  }

  if (d.cemaden) {
    lines.push(\`CEMADEN: \${formatCemadenRain(d.cemaden)}.\`);
  } else {
    lines.push("CEMADEN: sem leitura observada validada para esta cidade no período.");
  }

  const riskLabel = RISK_LEVELS[d.risk]?.label || d.risk || "Indefinido";

  return {
    title: \`\${station?.name || "Cidade"} — \${riskLabel}\`,
    status: riskLabel,
    lines,
    note: \`Regra: o status da cidade vem de parâmetros locais: chuva prevista, temperatura mínima, vento, CEMADEN e nível quando houver estação. ENSO é contexto climático\${ensoText ? \` (\${ensoText})\` : ""}; não aciona alerta local sozinho.\`
  };
}

function explainDailyRisk(station, date, p, tn, w, riskCode) {
  const dd = new Date(date + "T12:00:00");
  const riskLabel = RISK_LEVELS[riskCode]?.label || riskCode || "Indefinido";
  const weightedPrecip = p * 1.5;

  return {
    title: \`\${station?.name || "Cidade"} — \${dd.toLocaleDateString("pt-BR")} — \${riskLabel}\`,
    status: riskLabel,
    lines: [
      \`Chuva prevista no dia: \${p.toFixed(0)}mm. Ponderação operacional diária usada no cálculo: \${weightedPrecip.toFixed(1)}mm.\`,
      \`Temperatura mínima prevista: \${tn.toFixed(1)}°C.\`,
      \`Vento máximo previsto: \${w.toFixed(0)}km/h.\`
    ],
    note: "Normal significa sem gatilho operacional relevante no dia. Atenção significa combinação leve de parâmetros meteorológicos; não é alerta oficial."
  };
}

function explainForecastRisk(station, d, ensoText = "") {
  return explainCityRisk(station, d, ensoText);
}

function explainLagoaRisk(point, lagoa) {
  const label = lagoaStatusLabel(lagoa?.levelStatus);

  if (!lagoa?.isReal || lagoa?.atual === null || lagoa?.atual === undefined) {
    return {
      title: \`\${point?.name || "Ponto"} — Sem leitura\`,
      status: "Sem leitura",
      lines: ["Sem leitura operacional validada no período."],
      note: "Sem simulação: o app não inventa nível quando a fonte não retorna dado válido."
    };
  }

  const lines = [
    \`Cota atual: \${(lagoa.atual * 100).toFixed(1)}cm (\${lagoa.atual.toFixed(3)}m).\`
  ];

  if (typeof lagoa.threshold_m === "number") {
    lines.push(\`Limiar validado da estação: \${(lagoa.threshold_m * 100).toFixed(0)}cm (\${lagoa.threshold_m.toFixed(2)}m).\`);
  } else {
    lines.push("Dado real, mas sem limiar operacional validado.");
  }

  if (typeof lagoa.critical_threshold_m === "number") {
    lines.push(\`Cota crítica validada: \${(lagoa.critical_threshold_m * 100).toFixed(0)}cm (\${lagoa.critical_threshold_m.toFixed(2)}m).\`);
  }

  const measuredAt = getLagoaMeasuredAt(lagoa);
  if (measuredAt) lines.push(\`Horário da leitura: \${formatDateTimeBR(measuredAt)}.\`);

  if (lagoa.isFallback) {
    lines.push("Esta é última leitura salva/fallback local. Não deve gerar novo alerta automático se estiver vencida.");
  }

  return {
    title: \`\${point?.name || "Ponto"} — \${label}\`,
    status: label,
    lines,
    note: "Normal significa abaixo do limiar validado. Atenção/Acima da cota dependem do limiar próprio da estação, não de limiar genérico."
  };
}
`,
"helpers explicativos"
  );
}

// 2) State da caixa.
if (!app.includes("const [riskExplain")) {
  replaceOnce(
    '  const [expandedCard, setExpandedCard] = useState(null); // para detalhe do card',
    '  const [expandedCard, setExpandedCard] = useState(null); // para detalhe do card\n  const [riskExplain, setRiskExplain] = useState(null);',
    "state riskExplain"
  );
}

// 3) Dashboard: status clicável.
replaceOnce(
`                    <div style={{ fontSize:9, fontWeight:700, padding:"2px 7px", border:\`1px solid \${rColor}\`, color:rColor, borderRadius:3 }}>{risk.icon} {risk.label}</div>`,
`                    <button
                      onClick={(e)=>{ e.stopPropagation(); setRiskExplain(explainCityRisk(station, d, ensoProbabilityText)); }}
                      title="Clique para entender este status"
                      style={{ background:"none", fontSize:9, fontWeight:700, padding:"2px 7px", border:\`1px solid \${rColor}\`, color:rColor, borderRadius:3, cursor:"pointer", fontFamily:"inherit" }}
                    >
                      {risk.icon} {risk.label} ⓘ
                    </button>`,
"Dashboard: status clicável"
);

// 4) Textos do dashboard/previsão.
app = app.replaceAll("Contexto ENSO", "Contexto climático");
app = app.replaceAll("sem leitura observada", "sem leitura observada validada");

// 5) Previsão 14 dias: status diário clicável.
replaceOnce(
`                        <div style={{ marginTop:5, fontSize:7, padding:"2px 3px", border:\`1px solid \${rColor}\`, color:rColor, borderRadius:3 }}>{r.label}</div>`,
`                        <button
                          onClick={()=>setRiskExplain(explainDailyRisk(selStation, date, p, tn, w, dr))}
                          title="Clique para entender este status diário"
                          style={{ marginTop:5, background:"none", fontSize:7, padding:"2px 3px", border:\`1px solid \${rColor}\`, color:rColor, borderRadius:3, cursor:"pointer", fontFamily:"inherit" }}
                        >
                          {r.label} ⓘ
                        </button>`,
"Previsão: status diário clicável"
);

// 6) Previsão 14 dias: análise de risco clicável no card consolidado.
replaceOnce(
`                <div style={{ padding:14, background:getRiskBg(selData.risk), border:\`1px solid \${getRiskColor(selData.risk)}44\`, borderRadius:5 }}>`,
`                <div
                  onClick={()=>setRiskExplain(explainForecastRisk(selStation, selData, ensoProbabilityText))}
                  title="Clique para entender a análise de risco"
                  style={{ padding:14, background:getRiskBg(selData.risk), border:\`1px solid \${getRiskColor(selData.risk)}44\`, borderRadius:5, cursor:"pointer" }}
                >`,
"Previsão: análise consolidada clicável"
);

// 7) Lagoa: status clicável.
replaceOnce(
`                       <div style={{ fontSize:9, fontWeight:800, padding:"3px 7px", border:\`1px solid \${rColor}\`, color:rColor, borderRadius:4 }}>
                         {lagoaStatusLabel(lagoa?.levelStatus)}
                       </div>`,
`                       <button
                         onClick={()=>setRiskExplain(explainLagoaRisk(point, lagoa))}
                         title="Clique para entender este status"
                         style={{ background:"none", fontSize:9, fontWeight:800, padding:"3px 7px", border:\`1px solid \${rColor}\`, color:rColor, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}
                       >
                         {lagoaStatusLabel(lagoa?.levelStatus)} ⓘ
                       </button>`,
"Lagoa: status clicável"
);

// 8) Caixa/modal explicativa antes do rodapé.
if (!app.includes("riskExplain && (")) {
  replaceOnce(
`        <div style={{ marginTop:28, borderTop:\`1px solid \${t.border}\`, paddingTop:12, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>`,
`        {riskExplain && (
          <div
            onClick={()=>setRiskExplain(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          >
            <div
              onClick={(e)=>e.stopPropagation()}
              style={{ width:"min(520px, 100%)", background:dark?"#0f172a":"#ffffff", border:\`1px solid \${t.borderActive}\`, borderRadius:8, boxShadow:"0 20px 60px rgba(0,0,0,0.35)", padding:16 }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:9, color:t.textMuted, letterSpacing:2 }}>EXPLICAÇÃO DO STATUS</div>
                  <div style={{ fontSize:17, fontWeight:900, color:t.text, marginTop:3 }}>{riskExplain.title}</div>
                </div>
                <button onClick={()=>setRiskExplain(null)} style={{ background:"none", border:\`1px solid \${t.border}\`, color:t.textMuted, borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:11, padding:"4px 8px" }}>fechar</button>
              </div>

              <div style={{ display:"grid", gap:7, marginTop:8 }}>
                {riskExplain.lines?.map((line, i)=>(
                  <div key={i} style={{ fontSize:10, color:t.textMuted, lineHeight:1.5, padding:"7px 9px", background:dark?"rgba(0,0,0,0.25)":t.bg, borderRadius:4 }}>
                    {line}
                  </div>
                ))}
              </div>

              {riskExplain.note && (
                <div style={{ marginTop:10, padding:"8px 10px", background:dark?"rgba(34,211,238,0.07)":"rgba(8,145,178,0.06)", border:"1px solid rgba(34,211,238,0.25)", borderRadius:4, fontSize:9, color:t.textMuted, lineHeight:1.55 }}>
                  {riskExplain.note}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop:28, borderTop:\`1px solid \${t.border}\`, paddingTop:12, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>`,
"caixa explicativa"
  );
}

fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log("Patch aplicado: Normal/Atenção/Alerta clicáveis com caixa explicativa nas abas Dashboard, Previsão 14 Dias e Lagoa dos Patos.");
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
