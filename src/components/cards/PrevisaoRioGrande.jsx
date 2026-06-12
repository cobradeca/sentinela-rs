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
    return <svg viewBox="0 0 48 48"><path d="M14 28a10 10 0 0110-10h2a8 8 0 110 16H16a6 6 0 01-2-6z" fill="none" stroke={stroke} strokeWidth="3" /><path d="M22 34l-4 8M30 34l-4 8M27 33l5 6" stroke="#facc15" strokeWidth="3" /></svg>;
  }
  if (code >= 51) {
    return <svg viewBox="0 0 48 48"><path d="M14 28a10 10 0 0110-10h2a8 8 0 110 16H16a6 6 0 01-2-6z" fill="none" stroke={stroke} strokeWidth="3" /><path d="M18 36l-3 6M26 36l-3 6M34 36l-3 6" stroke="#38bdf8" strokeWidth="3" /></svg>;
  }
  if (code >= 3) {
    return <svg viewBox="0 0 48 48"><path d="M14 30a10 10 0 0110-10h2a8 8 0 110 16H16a6 6 0 01-2-6z" fill="none" stroke={stroke} strokeWidth="3" /></svg>;
  }
  if (code >= 1) {
    return <svg viewBox="0 0 48 48"><circle cx="18" cy="18" r="8" fill="none" stroke="#f59e0b" strokeWidth="3" /><path d="M20 32a9 9 0 018-7h2a6 6 0 110 12H22a5 5 0 01-2-5z" fill="none" stroke={stroke} strokeWidth="3" /></svg>;
  }
  return <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9" fill="none" stroke="#f59e0b" strokeWidth="3" /><path d="M24 4v7M24 37v7M4 24h7M37 24h7M10 10l5 5M33 33l5 5M38 10l-5 5M15 33l-5 5" stroke="#f59e0b" strokeWidth="3" /></svg>;
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
