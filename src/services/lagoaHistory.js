import { supabase } from "../lib/supabase";
import { fetchLagoaMonitoramentoHistorico } from "./api";

const HISTORY_MAX_POINTS = 336;
const HISTORY_LOOKBACK_HOURS = 168;
const LOCAL_CACHE_KEY = "sentinela_rs_lagoa_history_v2";
const LOCAL_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

let sessionHistory = {};

function saveHistoryToLocalStorage(history) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({
      saved_at: new Date().toISOString(),
      history,
    }));
  } catch { /* quota cheia — silencia */ }
}

function loadHistoryFromLocalStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.saved_at || 0).getTime();
    if (age > LOCAL_CACHE_MAX_AGE_MS) return null;
    return parsed.history || null;
  } catch {
    return null;
  }
}

function sanitizePoint(point) {
  const value = Number(point?.v);
  const time = point?.t ? new Date(point.t).toISOString() : null;
  if (!Number.isFinite(value) || !time) return null;
  return { t: time, v: value };
}

function normalizeHistory(map) {
  return Object.fromEntries(
    Object.entries(map || {}).map(([stationId, points]) => [
      stationId,
      (points || [])
        .map(sanitizePoint)
        .filter(Boolean)
        .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
        .slice(-HISTORY_MAX_POINTS),
    ])
  );
}

export function appendLagoaHistorySnapshot(history, stationId, levelM, measuredAt) {
  if (typeof levelM !== "number" || !Number.isFinite(levelM)) return history || {};

  const next = normalizeHistory(history || sessionHistory);
  const arr = next[stationId] ? [...next[stationId]] : [];
  const timestamp = measuredAt || new Date().toISOString();
  const last = arr[arr.length - 1];

  if (!last || last.t !== timestamp) {
    arr.push({ t: timestamp, v: levelM });
  }

  next[stationId] = arr.slice(-HISTORY_MAX_POINTS);
  sessionHistory = next;
  // persiste no localStorage a cada nova leitura
  saveHistoryToLocalStorage(next);
  return next;
}

export async function loadLagoaHistory(stationIds) {
  const since = new Date(Date.now() - HISTORY_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  // Carrega localStorage como base imediata (mantém histórico entre sessões)
  const localCache = loadHistoryFromLocalStorage();
  if (localCache) {
    sessionHistory = normalizeHistory({ ...localCache, ...sessionHistory });
  }

  try {
    const remote = await fetchLagoaMonitoramentoHistorico();
    if (remote?.ok && remote.history && Object.keys(remote.history).length) {
      const filteredRemote = Object.fromEntries(
        Object.entries(remote.history).filter(([stationId]) => stationIds.includes(stationId))
      );
      const mergedRemote = normalizeHistory({ ...sessionHistory, ...filteredRemote });
      sessionHistory = mergedRemote;
      saveHistoryToLocalStorage(mergedRemote);

      return {
        history: mergedRemote,
        source: "Monitoramento Lagoa + HidroSens",
        persistent: true,
        fetched_at: remote.fetched_at,
      };
    }
  } catch {
    // Continua para Supabase/localStorage.
  }

  try {
    const { data, error } = await supabase
      .from("readings")
      .select("station_id, recorded_at, lagoa_level")
      .in("station_id", stationIds)
      .not("lagoa_level", "is", null)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: true })
      .limit(1000);

    if (error) throw error;

    const fromSupabase = {};
    for (const row of data || []) {
      const level = Number(row?.lagoa_level);
      if (!row?.station_id || !Number.isFinite(level)) continue;
      if (!fromSupabase[row.station_id]) fromSupabase[row.station_id] = [];
      fromSupabase[row.station_id].push({ t: row.recorded_at, v: level });
    }

    // Supabase + localStorage + sessão atual — Supabase prevalece para o mesmo período
    const merged = normalizeHistory({ ...sessionHistory, ...fromSupabase });
    sessionHistory = merged;
    saveHistoryToLocalStorage(merged);

    return {
      history: merged,
      source: Object.keys(fromSupabase).length ? "histórico operacional" : "sessão atual",
      persistent: Object.keys(fromSupabase).length > 0,
    };
  } catch (error) {
    // Supabase falhou: usa localStorage como fallback persistido
    const fromLocal = loadHistoryFromLocalStorage();
    const fallback = normalizeHistory({ ...(fromLocal || {}), ...sessionHistory });
    sessionHistory = fallback;

    return {
      history: fallback,
      source: fromLocal ? "cache local (Supabase indisponível)" : "sessão atual",
      persistent: Boolean(fromLocal),
      error: error?.message || "histórico Supabase indisponível",
    };
  }
}
