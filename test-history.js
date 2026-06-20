import { fetchLagoaMonitoramentoHistorico } from "./src/services/api.js";
import { STATIONS_LAGOA } from "./src/config/stations.js";

async function run() {
  const data = await fetchLagoaMonitoramentoHistorico();
  console.log(JSON.stringify(data, null, 2));
}

run();
