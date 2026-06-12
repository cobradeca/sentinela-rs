export const MOCK_VOO = [
  { icao: "SBPA", cidade: "Porto Alegre", ventoDir: 210, ventoKt: 12, rajadaKt: 18, visKm: 10, tetoFt: 4200, obs: "—" },
  { icao: "SBPK", cidade: "Pelotas", ventoDir: 190, ventoKt: 10, rajadaKt: 16, visKm: 8, tetoFt: 2600, obs: "—" },
  { icao: "SBRG", cidade: "Rio Grande", ventoDir: 220, ventoKt: 14, rajadaKt: 20, visKm: 10, tetoFt: 3800, obs: "—" },
];

function classifyFlight(row) {
  if (row.visKm < 1.6 || row.tetoFt < 500) return { label: "LIFR", color: "#dc2626" };
  if (row.visKm < 5 || row.tetoFt < 1000) return { label: "IFR", color: "#f97316" };
  if (row.visKm < 8 || row.tetoFt < 3000) return { label: "MVFR", color: "#facc15" };
  return { label: "VFR", color: "#4ade80" };
}

export function CondicoesVoo({ className = "", data = MOCK_VOO, loading = false, error = null, onRetry }) {
  if (loading) return <section className={`sr-mod-card ${className}`}><div className="sr-mod-skeleton h-40 w-full" /></section>;
  if (error) return <section className={`sr-mod-card ${className}`}><div className="sr-mod-error"><span>{error}</span>{onRetry && <button type="button" onClick={onRetry}>Tentar novamente</button>}</div></section>;

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header"><div className="sr-mod-title"><span>✈</span> CONDIÇÕES DE VOO • Corredor POA–RIO GRANDE</div></header>
      <div className="sr-voo-table">
        <div className="sr-voo-head"><span>Aeródromo</span><span>Vento</span><span>Visibilidade</span><span>Teto</span><span>Class.</span><span>Obs.</span></div>
        {data.map((row) => {
          const flight = classifyFlight(row);
          return (
            <div key={row.icao} className="sr-voo-row">
              <span><strong>{row.icao}</strong><small>{row.cidade}</small></span>
              <span>{row.ventoDir}° {row.ventoKt} kt{row.rajadaKt ? <small>raj. {row.rajadaKt} kt</small> : null}</span>
              <span>{row.visKm >= 10 ? "10 km ou mais" : `${row.visKm} km`}</span>
              <span>{row.tetoFt} ft</span>
              <span className="sr-flight-pill" style={{ background: `${flight.color}22`, color: flight.color }}>{flight.label}</span>
              <span>{row.obs}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default CondicoesVoo;
