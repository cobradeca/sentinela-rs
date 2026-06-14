import { useEffect, useState } from "react";
import { NavIcon } from "../layout/NavIcons";
import { WeatherIcon } from "../layout/WeatherIcon";

const API_URL = "https://api.open-meteo.com/v1/forecast?latitude=-32.035&longitude=-52.099&daily=weathercode,precipitation_sum,windspeed_10m_max,temperature_2m_min,temperature_2m_max&timezone=America/Sao_Paulo&forecast_days=5";

function dayLabel(dateIso) {
  const date = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "");
}

function dateLabel(dateIso) {
  const date = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function normalizeDaily(data) {
  const daily = data?.daily || {};
  return (daily.time || []).map((date, index) => ({
    date,
    code: daily.weathercode?.[index],
    rain: daily.precipitation_sum?.[index],
    wind: daily.windspeed_10m_max?.[index],
    min: daily.temperature_2m_min?.[index],
    max: daily.temperature_2m_max?.[index],
  }));
}

export function PrevisaoRioGrande({ className = "", onNavigate, userCity }) {
  const [state, setState] = useState({ loading: true, error: null, days: [], updatedAt: null });

  const load = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
      const data = await response.json();
      setState({ loading: false, error: null, days: normalizeDaily(data), updatedAt: new Date() });
    } catch (error) {
      setState({ loading: false, error: error?.message || "Falha ao carregar previsao", days: [], updatedAt: null });
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (state.loading) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-skeleton h-5 w-1-2" />
        <div className="sr-forecast-grid">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="sr-mod-skeleton h-36 w-full" />)}</div>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className={`sr-mod-card ${className}`}>
        <div className="sr-mod-error"><span>{state.error}</span><button type="button" onClick={load}>Tentar novamente</button></div>
      </section>
    );
  }

  return (
    <section className={`sr-mod-card ${className}`}>
      <header className="sr-mod-header">
        <div className="sr-mod-title"><span>☁</span> PREVISÃO{userCity ? ` • ${userCity}` : " • Acumulado de chuva (mm)"}</div>
        <div className="sr-mod-badge">Fonte: Open-Meteo • Atualizado: {state.updatedAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
      </header>
      <div className="sr-forecast-grid">
        {state.days.map((day, index) => (
          <div key={day.date} className={`sr-forecast-day ${index === 0 ? "is-today" : ""}`}>
            <strong>{index === 0 ? "Hoje" : dayLabel(day.date)}</strong>
            <span>{dateLabel(day.date)}</span>
            <div className="sr-weather-svg"><WeatherIcon code={day.code} /></div>
            <b>{Number(day.rain || 0).toFixed(0)} mm</b>
            <small className="sr-forecast-metric"><span className="sr-forecast-label">vel</span> ↗ {Number(day.wind || 0).toFixed(0)} km/h</small>
            <div className="sr-forecast-minmax">
              <span><span className="sr-forecast-label">mín</span> {Number(day.min || 0).toFixed(0)}°</span>
              <span><span className="sr-forecast-label">máx</span> {Number(day.max || 0).toFixed(0)}°</span>
            </div>
          </div>
        ))}
      </div>
      {onNavigate && (
        <footer className="sr-mod-footer" style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="sr-btn-link" onClick={() => onNavigate("previsao")}>
            Ver detalhes <NavIcon name="chevron" size={13} />
          </button>
        </footer>
      )}
    </section>
  );
}

export default PrevisaoRioGrande;
