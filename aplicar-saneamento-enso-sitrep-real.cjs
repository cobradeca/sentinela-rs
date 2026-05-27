const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("ERRO: não encontrei src/App.jsx. Rode na raiz do projeto.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
const backup = path.join(process.cwd(), "src", "App.jsx.backup-saneamento-enso-sitrep-real");
if (!fs.existsSync(backup)) fs.writeFileSync(backup, app, "utf8");

function mustReplace(search, replacement, label) {
  if (!app.includes(search)) {
    console.error("ERRO: trecho não encontrado:", label);
    process.exit(1);
  }
  app = app.replace(search, replacement);
  console.log("OK:", label);
}

// 1) null/indisponível não pode virar "Emergindo".
app = app.replace(
  '  if (a === null) return { label:"Emergindo",       color:"#8b5cf6", icon:"📈" };',
  '  if (a === null || a === undefined || Number.isNaN(Number(a))) return { label:"Indisponível", color:"#64748b", icon:"–" };'
);

// 2) Helpers.
if (!app.includes("function formatSignedCelsius")) {
  const helperAnchor = `function classifyENSO(a) {
  if (a === null || a === undefined || Number.isNaN(Number(a))) return { label:"Indisponível", color:"#64748b", icon:"–" };
  if (a >= 2.0)   return { label:"Super El Niño",   color:"#dc2626", icon:"🔴" };
  if (a >= 1.5)   return { label:"El Niño Forte",   color:"#ef4444", icon:"🟠" };
  if (a >= 0.5)   return { label:"El Niño",         color:"#f97316", icon:"🟡" };
  if (a > -0.5)   return { label:"Neutro",          color:"#22c55e", icon:"🟢" };
  if (a > -1.5)   return { label:"La Niña",         color:"#3b82f6", icon:"🔵" };
  if (a > -2.0)   return { label:"La Niña Forte",   color:"#1d4ed8", icon:"🟣" };
  return           { label:"Super La Niña",         color:"#1e3a8a", icon:"⚫" };
}
`;
  const helperBlock = `${helperAnchor}
function formatSignedCelsius(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? \`\${value >= 0 ? "+" : ""}\${value.toFixed(2)}°C\`
    : "indisponível";
}

function formatProbability(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? \`\${(value * 100).toFixed(0)}%\`
    : "indisponível";
}

function percentValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value * 100 : 0;
}

function safeEnsoForecast(forecast) {
  return Array.isArray(forecast) ? forecast : [];
}
`;
  mustReplace(helperAnchor, helperBlock, "helpers ENSO");
}

// 3) Troca objeto ENSO hardcoded por estado indisponível não operacional.
app = app.replace(
/\/\/ ENSO — dados reais NOAA\/IRI mai 2026[\s\S]*?const ENSO = \{[\s\S]*?\n\};/,
`// ENSO — estado base não operacional.
const ENSO_UNAVAILABLE = {
  nino34: null,
  oni3m: null,
  phase: "UNAVAILABLE",
  referenceDate: null,
  referenceSource: "NOAA/CPC indisponível",
  prob: null,
  superThreshold: 1.5,
  forecast: [],
};`
);

// 4) Rebaixa Copernicus de dado para referência, sem const COPERNICUS_DATA.
app = app.replaceAll("const COPERNICUS_DATA = {", "const COPERNICUS_REFERENCE = {");
app = app.replaceAll(
  "Indicadores abaixo são dados de referência publicados — não atualizados em tempo real.",
  "Referência histórica/contextual. Não é SITREP operacional em tempo real."
);
app = app.replaceAll("COPERNICUS_DATA", "COPERNICUS_REFERENCE");

// 5) NOAA não mistura mais com ENSO fixo.
app = app.replace(
`      // Mantém forecast/probabilidade do objeto estático até a integração IRI específica.
      setEnsoLive({ ...ENSO, ...live, prob: activeENSO.prob, forecast: activeENSO.forecast });`,
`      setEnsoLive(live);`
);

app = app.replace(
`  const observedENSO = ensoLive || ENSO;
  const activeENSO = ensoProbLive ? {
    ...observedENSO,
    prob: ensoProbLive.prob || observedENSO.prob,
    forecast: ensoProbLive.forecast || observedENSO.forecast,
    probabilitySource: ensoProbLive.probabilitySource,
    probabilityReferenceDate: ensoProbLive.probabilityReferenceDate,
    probabilityDynamic: true,
    probabilityFetchedAt: ensoProbLive.probabilityFetchedAt,
    probabilityParsing: ensoProbLive.probabilityParsing,
  } : observedENSO;
  const ensoClass = classifyENSO(activeENSO.nino34);`,
`  const observedENSO = ensoLive || ENSO_UNAVAILABLE;
  const activeENSO = {
    ...observedENSO,
    prob: ensoProbLive?.prob || null,
    forecast: ensoProbLive?.forecast || [],
    probabilitySource: ensoProbLive?.probabilitySource || null,
    probabilityReferenceDate: ensoProbLive?.probabilityReferenceDate || null,
    probabilityDynamic: Boolean(ensoProbLive),
    probabilityFetchedAt: ensoProbLive?.probabilityFetchedAt || null,
    probabilityParsing: ensoProbLive?.probabilityParsing || null,
  };
  const ensoClass = classifyENSO(activeENSO.nino34);
  const ensoObservedAvailable = typeof activeENSO.nino34 === "number" && Number.isFinite(activeENSO.nino34);
  const ensoProbabilityAvailable = typeof activeENSO.prob?.elNino === "number" && Number.isFinite(activeENSO.prob.elNino);
  const ensoFirstForecast = safeEnsoForecast(activeENSO.forecast)[0] || null;
  const ensoObservedText = ensoObservedAvailable
    ? \`\${ensoClass.icon} Condição observada: \${ensoClass.label} · Niño 3.4 \${formatSignedCelsius(activeENSO.nino34)}\`
    : "ENSO observado indisponível";
  const ensoProbabilityText = ensoProbabilityAvailable
    ? \`IRI/CCSR: \${formatProbability(activeENSO.prob.elNino)} para El Niño\${ensoFirstForecast?.p ? \` · \${ensoFirstForecast.p}\` : ""}\`
    : "Probabilidade IRI/CCSR indisponível";`
);

// 6) Header e banner principal.
app = app.replace(
`                 {ensoClass.icon} El Niño em Desenvolvimento · +{activeENSO.nino34}°C · {(activeENSO.prob.elNino*100).toFixed(0)}% prob.`,
`                 {ensoObservedText} · {ensoProbabilityText}`
);

app = app.replace(
`            ⚠️ <strong>EL NIÑO EMERGINDO (98% prob. NOAA/IRI)</strong> — Niño 3.4: +0,9°C. Risco de enchentes e queimadas elevado no RS em 2026/27.
            <button onClick={()=>setActiveTab("enso")} style={{ background:"none", border:"none", color:t.accent, cursor:"pointer", fontSize:11, padding:0, fontFamily:"inherit" }}>Ver análise completa →</button>`,
`            ⚠️ <strong>ENSO — leitura observada e probabilidade</strong> — {ensoObservedText}. {ensoProbabilityText}.
            <button onClick={()=>setActiveTab("enso")} style={{ background:"none", border:"none", color:t.accent, cursor:"pointer", fontSize:11, padding:0, fontFamily:"inherit" }}>Ver dados completos →</button>`
);

// 7) Probabilidade segura nos cards.
app = app.replaceAll('`${(activeENSO.prob.elNino*100).toFixed(0)}%`', 'formatProbability(activeENSO.prob?.elNino)');
app = app.replaceAll('{(activeENSO.prob.elNino*100).toFixed(0)}% prob.', '{formatProbability(activeENSO.prob?.elNino)} prob.');

// 8) Seção ENSO inteira.
const ensoStart = app.indexOf('        {/* ══ ENSO — El Niño / La Niña ══ */}');
const cptecStart = app.indexOf('        {/* ══ CPTEC / INPE ══ */}');
if (ensoStart < 0 || cptecStart < 0 || cptecStart <= ensoStart) {
  console.error("ERRO: não encontrei seção ENSO/CPTEC para substituição segura.");
  process.exit(1);
}

const newEnsoSection = `        {/* ══ ENSO — SITREP REAL NOAA/CPC + IRI/CCSR ══ */}
        {activeTab==="enso" && (
          <div style={{ display:"grid", gap:12 }}>
            <div style={{ padding:"12px 16px", background: dark?"rgba(34,211,238,0.08)":"rgba(8,145,178,0.06)", border:\`1px solid \${t.borderActive}\`, borderRadius:5, display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:24 }}>🌡️</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:3 }}>ENSO — SITREP OBSERVADO + PROBABILÍSTICO</div>
                <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                  {ensoObservedText}. {ensoProbabilityText}. Sem valores simulados: quando a fonte não responde, o dado fica indisponível.
                </div>
              </div>
            </div>

            <div style={{ padding:"8px 14px", background: dark?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:4, fontSize:9, color: dark?"#bbf7d0":"#166534", display:"flex", gap:8, alignItems:"center" }}>
              ✅ <span><strong>Fontes ativas:</strong> observado por NOAA/CPC; probabilidade por IRI/CCSR. Consulta: {activeENSO.probabilityFetchedAt ? formatDateTimeBR(activeENSO.probabilityFetchedAt) : lastUpdate ? lastUpdate.toLocaleString("pt-BR") : "sem horário"}.</span>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:11 }}>
              {[
                { l:"Fase observada", v: ensoObservedAvailable ? \`\${ensoClass.icon} \${ensoClass.label}\` : "indisponível", s: ensoObservedAvailable ? \`Niño 3.4: \${formatSignedCelsius(activeENSO.nino34)}\` : "NOAA/CPC sem leitura", c:ensoClass.color },
                { l:"ONI trimestral", v: formatSignedCelsius(activeENSO.oni3m), s:"NOAA/CPC observado", c: ensoObservedAvailable ? "#f97316" : "#64748b" },
                { l:"Prob. El Niño", v: formatProbability(activeENSO.prob?.elNino), s: ensoFirstForecast?.p ? \`IRI/CCSR · \${ensoFirstForecast.p}\` : "IRI/CCSR", c:"#f97316" },
                { l:"Prob. Neutro", v: formatProbability(activeENSO.prob?.neutral), s:"IRI/CCSR", c:"#22c55e" },
                { l:"Prob. La Niña", v: formatProbability(activeENSO.prob?.laNina), s:"IRI/CCSR", c:"#3b82f6" },
                { l:"Tipo de uso", v:"Contexto climático", s:"não dispara alerta sozinho", c:"#eab308" },
              ].map(item=>(
                <div key={item.l} style={{ padding:"12px 14px", background:t.cardBg, border:\`1px solid \${item.c}44\`, borderTop:\`3px solid \${item.c}\`, borderRadius:5, boxShadow:t.shadowCard }}>
                  <div style={{ fontSize:8, color:t.textMuted, letterSpacing:2, marginBottom:5 }}>{item.l.toUpperCase()}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:item.c, marginBottom:3 }}>{item.v}</div>
                  <div style={{ fontSize:8, color:t.textFaint }}>{item.s}</div>
                </div>
              ))}
            </div>

            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>ESCALA NIÑO 3.4 — OBSERVADO NOAA/CPC</div>
              <div style={{ position:"relative", height:24, borderRadius:3, overflow:"hidden", background:t.barBg }}>
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#1e3a8a 0%,#3b82f6 20%,#22c55e 38%,#22c55e 62%,#f97316 76%,#ef4444 88%,#dc2626 100%)", opacity:0.75 }} />
                {[
                  {l:"La Niña Forte",pos:"10%"},{l:"La Niña",pos:"28%"},{l:"Neutro",pos:"50%"},{l:"El Niño",pos:"70%"},{l:"Super",pos:"90%"}
                ].map(lb=>(
                  <div key={lb.l} style={{ position:"absolute", top:0, left:lb.pos, transform:"translateX(-50%)", fontSize:7, color:"rgba(255,255,255,0.8)", height:"100%", display:"flex", alignItems:"center" }}>{lb.l}</div>
                ))}
                {ensoObservedAvailable && (
                  <div style={{ position:"absolute", top:0, left:\`\${Math.min(97,Math.max(3,((activeENSO.nino34+3)/6)*100))}%\`, transform:"translateX(-50%)", width:3, height:"100%", background:"#fff", boxShadow:"0 0 6px #fff" }} />
                )}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:8, color:t.textMuted }}>
                <span>-3°C</span>
                <span style={{ color:ensoClass.color, fontWeight:700 }}>{ensoObservedAvailable ? \`▲ ATUAL: \${formatSignedCelsius(activeENSO.nino34)} → \${ensoClass.label}\` : "NOAA/CPC indisponível"}</span>
                <span>+3°C</span>
              </div>
            </div>

            <div style={{ ...s.card }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:2, marginBottom:12 }}>PREVISÃO PROBABILÍSTICA IRI/CCSR</div>
              {safeEnsoForecast(activeENSO.forecast).length ? (
                <div style={{ display:"grid", gap:7 }}>
                  {safeEnsoForecast(activeENSO.forecast).map((f,i)=>(
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"100px 1fr 1fr 1fr", gap:6, alignItems:"center" }}>
                      <div style={{ fontSize:9, color:t.textMuted }}>{f.p}</div>
                      {[{l:"El Niño",v:f.en,c:"#f97316"},{l:"Neutro",v:f.nu,c:"#22c55e"},{l:"La Niña",v:f.ln,c:"#3b82f6"}].map(bar=>(
                        <div key={bar.l}>
                          <div style={{ fontSize:7, color:bar.c, marginBottom:2 }}>{bar.l} {formatProbability(bar.v)}</div>
                          <div style={{ height:4, background:t.barBg, borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:\`\${percentValue(bar.v)}%\`, background:bar.c }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize:10, color:t.textMuted }}>Sem previsão probabilística validada no momento.</div>
              )}
              <div style={{ fontSize:8, color:t.textFaint, marginTop:8 }}>
                Fonte: {activeENSO.probabilitySource || "IRI/CCSR"} · Referência: {activeENSO.probabilityReferenceDate || "indisponível"} · Consulta: {activeENSO.probabilityFetchedAt ? formatDateTimeBR(activeENSO.probabilityFetchedAt) : "sem horário"}
              </div>
            </div>

            <div style={{ padding:12, background: dark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.25)", borderRadius:5 }}>
              <div style={{ fontSize:10, color:"#eab308", letterSpacing:2, marginBottom:6 }}>REGRA OPERACIONAL</div>
              <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.6 }}>
                ENSO e CPTEC são contexto climático. Não geram alerta local sozinhos. Alertas operacionais dependem de Defesa Civil, chuva observada CEMADEN, previsão oficial INMET/Open-Meteo e níveis reais da Lagoa/RADAR/HidroSens.
              </div>
            </div>
          </div>
        )}

`;

app = app.slice(0, ensoStart) + newEnsoSection + app.slice(cptecStart);

// 9) Limpeza de textos críticos restantes.
app = app.replaceAll("dados estáticos", "dados de fonte consultada");
app = app.replaceAll("Dados estáticos", "Dados de fonte consultada");
app = app.replaceAll("atualização manual necessária", "verificar fonte quando indisponível");
app = app.replaceAll("EL_NINO_DEVELOPING", "UNAVAILABLE");
app = app.replaceAll("El Niño Emergindo", "Contexto histórico");
app = app.replaceAll("El Niño emergindo", "contexto histórico");
app = app.replaceAll("El Niño em Desenvolvimento", "ENSO observado/probabilístico");
app = app.replaceAll("EL NIÑO EMERGINDO", "ENSO OBSERVADO/PROBABILÍSTICO");
app = app.replaceAll("EL NIÑO EM DESENVOLVIMENTO", "ENSO OBSERVADO/PROBABILÍSTICO");
app = app.replaceAll("Risco de enchentes e queimadas elevado", "Contexto climático em acompanhamento");
app = app.replaceAll("Prob. mai", "Probabilidade");

fs.writeFileSync(appPath, app, "utf8");

console.log("Saneamento ENSO/SITREP aplicado.");
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("Agora rode:");
console.log("npm run build");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
