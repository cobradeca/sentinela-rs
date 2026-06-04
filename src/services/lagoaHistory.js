import { supabase } from "../lib/supabase";

const HISTORY_MAX_POINTS = 336;
const HISTORY_LOOKBACK_HOURS = 168;

let sessionHistory = {};

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
  return next;
}

export async function loadLagoaHistory(stationIds) {
  const since = new Date(Date.now() - HISTORY_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

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

    sessionHistory = normalizeHistory({ ...sessionHistory, ...fromSupabase });
    return {
      history: sessionHistory,
      source: Object.keys(fromSupabase).length ? "histórico operacional" : "sessão atual",
      persistent: Object.keys(fromSupabase).length > 0,
    };
  } catch (error) {
    return {
      history: normalizeHistory(sessionHistory),
      source: "sessão atual",
      persistent: false,
      error: error?.message || "histórico Supabase indisponível",
    };
  }
}
