import { useEffect, useState } from "react";
import { fetchFlightConditions } from "../../services/api";
import { NavIcon } from "../layout/NavIcons";

export const MOCK_VOO = [
  { ok: false, icao: "SBPA", cidade: "Porto Alegre", class: "CARREGANDO", obs: "Aguardando METAR" },
  { ok: false, icao: "SBPK", cidade: "Pelotas", class: "CARREGANDO", obs: "Aguardando METAR" },
  { ok: false, icao: "SBRG", cidade: "Rio Grande", class: "CARREGANDO", obs: "Aguardando METAR" },
];

const ERROR_VOO = [
  { ok: false, icao: "SBPA", cidade: "Porto Alegre", class: "SEM DADOS", obs: "Fonte indispon?vel" },
  { ok: false, icao: "SBPK", cidade: "Pelotas", class: "SEM DADOS", obs: "Fonte indispon?vel" },
  { ok: false, icao: "SBRG", cidade: "Rio Grande", class: "SEM DADOS", obs: "Fonte indispon?vel" },
];

function classifyFlight(row) {
  if (row.class) {
    const label = String(row.class).toUpperCase();
    const color = label === "VFR" ? "#4ade80" : label === "MVFR" ? "#facc15" : label === "IFR" ? "#f97316" : label === "LIFR" ? "#dc2626" : "#94a3b8";
    return { label, color };
  }

  if (typeof row.visKm !== "number" || typeof row.tetoFt !== "number") return { label: "SEM METAR", color: "#94a3b8" };
  if (row.visKm < 1.6 || row.tetoFt < 500) return { label: "LIFR", color: "#dc2626" };
  if (row.visKm < 5 || row.tetoFt < 1000) return { label: "IFR", color: "#f97316" };
  if (row.visKm < 8 || row.tetoFt < 3000) return { label: "MVFR", color: "#facc15" };
  return { label: "VFR", color: "#4ade80" };
}

function formatWind(row) {
  if (typeof row.ventoKt !== "number") return "Sem leitura";
  const dir = typeof row.ventoDir === "number" ? `${row.ventoDir}?` : "VRB";
  return (
    <>
      {dir} {row.ventoKt} kt
      {typeof row.rajadaKt === "number" && row.rajadaKt > 0 ? <small>raj. {row.rajadaKt} kt</small> : null}
    </>
  );
}

function formatVisibility(row) {
  if (typeof row.visKm !== "number") return "Sem leitura";
  return row.visKm >= 9.9 ? "10 km ou mais" : `${row.visKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

function formatCeiling(row) {
  if (typeof row.tetoFt !== "number") return "Sem teto";
  return `${row.tetoFt} ft`;
}

export function CondicoesVoo({ className = "", data = null, loading = false, error = null, onRetry, onNavigate, compact = true }) {
  const [state, setState] = useState({ loading: !data, error: null, rows: data || MOCK_VOO, fetchedAt: null, source: null });

  useEffect(() => {
    if (data) {
      setState((current) => ({ ...current, loading: false, rows: data }));
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    fetchFlightConditions()
      .then((result) => {
        if (cancelled) return;
        const rows = Array.isArray(result?.aerodromos) && result.aerodromos.length ? result.aerodromos : ERROR_VOO;
        setState({
          loading: false,
          error: result?.ok ? null : result?.error || "METAR indisponivel",
          rows,
          fetchedAt: result?.fetched_at || null,
          source: result?.source || "Aviation Weather Center / NOAA",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, error: err?.message || "METAR indisponivel", rows: ERROR_VOO, fetchedAt: null, source: null });
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  const effectiveLoading = loading || state.loading;
  const effectiveError = error || state.error;

  if (effectiveLoading) return <section className={`sr-mod-card ${className}`}><div className="sr-mod-skeleton h-40 w-full" /></section>;
  if (effectiveError && state.rows === ERROR_VOO) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-error">
          <span>{effectiveError}</span>
          {onRetry && <button type="button" onClick={onRetry}>Tentar novamente</button>}
        </div>
      </section>
    );
  }

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header sr-mod-header-voo">
        <div className="sr-mod-title">
          <span>?</span> CONDI??ES DE VOO
          <span className="sr-mod-subtitle">Corredor POA?Rio Grande</span>
        </div>
        <div className="sr-mod-badge">{state.source || "AWC/NOAA"}{state.fetchedAt ? ` ? ${new Date(state.fetchedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</div>
      </header>
      <div className="sr-voo-table">
        <div className="sr-voo-head">
          <span>Aerodromo</span><span>Vento</span><span>Visibilidade</span><span>Teto</span><span>Class.</span>
          {!compact && <span>Obs.</span>}
        </div>
        {state.rows.map((row) => {
          const flight = classifyFlight(row);
          return (
            <div key={row.icao} className="sr-voo-row">
              <span><strong>{row.icao}</strong><small>{row.cidade}</small></span>
              <span>{formatWind(row)}</span>
              <span>{formatVisibility(row)}</span>
              <span>{formatCeiling(row)}</span>
              <span className="sr-flight-pill" style={{ background: `${flight.color}22`, color: flight.color }}>{flight.label}</span>
              {!compact && (
                <span title={row.raw || row.rawTaf || row.obs || ""}>
                  <strong>{row.obs || "METAR"}</strong>
                  {row.tafSummary ? <small>TAF: {row.tafSummary}</small> : row.rawTaf ? <small>TAF dispon?vel</small> : null}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {onNavigate && (
        <footer className="sr-mod-footer" style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="sr-btn-link" onClick={() => onNavigate("voo")}>
            Ver detalhes <NavIcon name="chevron" size={13} />
          </button>
        </footer>
      )}
    </section>
  );
}

export default CondicoesVoo;
