import { useState, useCallback, useRef } from "react";
import * as api from "../services/api";

export function useDataSync(allStations) {
  const [loading, setLoading] = useState(true);
  const [stationData, setStationData] = useState({});
  const [health, setHealth] = useState({});
  const sourceHealthRef = useRef({});

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const newHealth = { ...sourceHealthRef.current };
    const t0 = Date.now();

    async function tracked(key, fn) {
      const start = Date.now();
      try {
        const result = await fn();
        const latencyMs = Date.now() - start;
        newHealth[key] = { ok: true, lastOk: new Date().toISOString(), latencyMs, error: null };
        return result;
      } catch (err) {
        newHealth[key] = { ok: false, lastOk: newHealth[key]?.lastOk || null, latencyMs: Date.now() - start, error: err?.message || "erro desconhecido" };
        return null;
      }
    }

    // Parallel fetch for top-level independent sources
    const [cemadenByCityId, lagoaRadarByStationId, hidrosensLaranjal] = await Promise.allSettled([
      tracked("CEMADEN", api.fetchCemadenAccumulations),
      tracked("RADAR Lagoa", api.fetchLagoaRadarLevels),
      tracked("HidroSens", api.fetchHidroSensLaranjalLevel),
    ]);

    const cemadenMap = cemadenByCityId.status === "fulfilled" ? (cemadenByCityId.value || {}) : {};
    const lagoaRadarMap = lagoaRadarByStationId.status === "fulfilled" ? (lagoaRadarByStationId.value || {}) : {};
    const hidrosens = hidrosensLaranjal.status === "fulfilled" ? (hidrosensLaranjal.value || null) : null;

    const results = {};

    // Throttled fetching for stations (batching requests to prevent overloading the browser/APIs)
    const BATCH_SIZE = 4;
    for (let i = 0; i < allStations.length; i += BATCH_SIZE) {
      const batch = allStations.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (st) => {
        try {
          // Weather
          const weather = await (async () => {
            const start = Date.now();
            try {
              const r = await api.fetchWeather14Days(st.lat, st.lon);
              if (!newHealth["Open-Meteo"]) newHealth["Open-Meteo"] = { ok: true, lastOk: new Date().toISOString(), latencyMs: Date.now()-start, error: null };
              return r;
            } catch(err) {
              newHealth["Open-Meteo"] = { ok: false, lastOk: newHealth["Open-Meteo"]?.lastOk || null, latencyMs: Date.now()-start, error: err?.message };
              return null;
            }
          })();

          // ANA Level
          let realLevel = null;
          if (st.anaCode) {
            const start = Date.now();
            realLevel = await api.fetchAnaLevel(st.anaCode);
            if (!newHealth["ANA HidroWeb"]) {
               newHealth["ANA HidroWeb"] = { ok: realLevel !== null, lastOk: realLevel !== null ? new Date().toISOString() : newHealth["ANA HidroWeb"]?.lastOk || null, latencyMs: Date.now()-start, error: realLevel === null ? "sem leitura" : null };
            }
          }

          const radarLevel = lagoaRadarMap[st.id] || null;
          const hidrosensLevel = st.id === "lagoa_patos_pelotas" ? hidrosens : null;

          // Process the risk and return data to be merged (Risk calculation will be imported from useRiskEngine later)
          // For now, we return raw fetched data
          return {
            id: st.id,
            weather,
            realLevel,
            radarLevel,
            hidrosensLevel,
            cemaden: st.ibgeCode ? cemadenMap[st.ibgeCode] : null
          };
        } catch (e) {
          console.error(`Error processing station ${st.id}:`, e);
          return { id: st.id, error: true };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Merge results
      batchResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          results[result.value.id] = result.value;
        }
      });
    }

    sourceHealthRef.current = newHealth;
    setHealth(newHealth);
    setStationData(results); // Currently just raw data, will integrate with risk engine next
    setLoading(false);
    
    return results;
  }, [allStations]);

  return {
    loading,
    stationData,
    health,
    loadAllData
  };
}
