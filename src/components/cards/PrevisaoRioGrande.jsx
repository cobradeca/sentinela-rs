import { useEffect, useState } from "react";

const API_URL = "https://api.open-meteo.com/v1/forecast?latitude=-32.035&longitude=-52.099&daily=weathercode,precipitation_sum,windspeed_10m_max,temperature_2m_min,temperature_2m_max&timezone=America/Sao_Paulo&forecast_days=5";

function dayLabel(dateIso) {
  const date = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "");
}

function dateLabel(dateIso) {
  const date = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function WeatherIcon({ code }) {
  const stroke = "currentColor";
  if (code >= 95) {
    return <svg viewBox="0 0 48 48"><path d="M13 29a9 9 0 018-9h2a7 7 0 110 14H16a5 5 0 01-3-5z" fill="#475569" opacity="0.9" /><path d="M20 34l-3 7M28 34l-3 7M36 34l-3 7" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" /><path d="M22 12l3 6h-6z" fill="#facc15" /></svg>;
  }
  if (code >= 51) {
    return <svg viewBox="0 0 48 48"><path d="M13 29a9 9 0 018-9h2a7 7 0 110 14H16a5 5 0 01-3-5z" fill="#94a3b8" opacity="0.95" /><path d="M19 35l-3 6M27 35l-3 6M35 35l-3 6" stroke="#38bdf8" strokeWidth="3.25" strokeLinecap="round" /></svg>;
  }
  if (code >= 3) {
    return <svg viewBox="0 0 48 48"><path d="M13 30a9 9 0 018-9h2a7 7 0 110 14H16a5 5 0 01-3-5z" fill="#cbd5e1" /><path d="M18 17a6 6 0 017-4 7 7 0 017 7" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>;
  }
  if (code >= 1) {
    return <svg viewBox="0 0 48 48"><circle cx="17" cy="17" r="8" fill="#f59e0b" opacity="0.9" /><path d="M20 31a8 8 0 017-6h2a6 6 0 110 12H22a5 5 0 01-2-6z" fill="#e2e8f0" /><path d="M21 36l-2 4M29 36l-2 4" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" /></svg>;
  }
  return <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9" fill="#f59e0b" /><path d="M24 4v7M24 37v7M4 24h7M37 24h7M10 10l5 5M33 33l5 5M38 10l-5 5M15 33l-5 5" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" /></svg>;
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

export function PrevisaoRioGrande({ className = "" }) {
  const [state, setState] = useState({ loading: true, error: null, days: [], updatedAt: null });

  const load = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
      const data = await response.json();
      setState({ loading: false, error: null, days: normalizeDaily(data), updatedAt: new Date() });
    } catch (error) {
      setState({ loading: false, error: error?.message || "Falha ao carregar previsão", days: [], updatedAt: null });
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
        <div className="sr-mod-title"><span>☁</span> PREVISÃO • Acumulado de chuva (mm)</div>
        <div className="sr-mod-badge">Fonte: Open-Meteo • Atualizado: {state.updatedAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
      </header>
      <div className="sr-forecast-grid">
        {state.days.map((day, index) => (
          <div key={day.date} className={`sr-forecast-day ${index === 0 ? "is-today" : ""}`}>
            <strong>{index === 0 ? "Hoje" : dayLabel(day.date)}</strong>
            <span>{dateLabel(day.date)}</span>
            <div className="sr-weather-svg"><WeatherIcon code={day.code} /></div>
            <b>{Number(day.rain || 0).toFixed(0)} mm</b>
            <small>↗ {Number(day.wind || 0).toFixed(0)} km/h</small>
            <div><span>{Number(day.min || 0).toFixed(0)}°</span> <span>{Number(day.max || 0).toFixed(0)}°</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PrevisaoRioGrande;
