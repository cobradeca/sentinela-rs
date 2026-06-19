const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

const replacements = [
  [/Nao foi possivel abrir esta aba/g, "Não foi possível abrir esta aba"],
  [/Sem leitura real disponivel/g, "Sem leitura real disponível"],
  [/Aguarde a sincronizacao das estacoes monitoradas/g, "Aguarde a sincronização das estações monitoradas"],
  [/Condi.o atual/g, "Condição atual"],
  [/Aerdromo/g, "Aeródromo"],
  [/CONDI..ES DE VOO/g, "CONDIÇÕES DE VOO"],
  [/clim.tico/g, "climático"],
  [/Nivel medio/g, "Nível médio"],
  [/Previsao/g, "Previsão"],
  [/nao sao alertas/g, "não são alertas"],
  [/m.dio/g, "médio"],
  [/Vegeta.o/g, "Vegetação"],
  [/historico suficiente/g, "histórico suficiente"],
  [/estacoes com leitura real/g, "estações com leitura real"],
  [/Nivel atual \(m\)/g, "Nível atual (m)"],
  [/Medias diarias/g, "Médias diárias"],
  [/ultimos 7 dias/g, "últimos 7 dias"],
  [/pior caso entre as estacoes/g, "pior caso entre as estações"],
  [/Atencao:/g, "Atenção:"],
  [/sao emitidos/g, "são emitidos"],
  [/orientacoes/g, "orientações"],
  [/Fogo provavel/g, "Fogo provável"],
  [/Fogo prov.vel/g, "Fogo provável"],
  [/em observao/g, "em observação"],
  [/em observa.o/g, "em observação"],
  [/deteco/g, "detecção"],
  [/detec.o/g, "detecção"],
  [/ltimas 48 horas/g, "últimas 48 horas"],
  [/.ltimas 48 horas/g, "últimas 48 horas"],
  [/ tratado como alerta t.rmico/g, "é tratado como alerta térmico"],
  [/HISTORICO 7 DIAS/g, "HISTÓRICO 7 DIAS"],
  [/LA NI.A/g, "LA NIÑA"],
  [/EL NI.O/g, "EL NIÑO"],
  [/> Atencao</g, "> Atenção<"]
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
