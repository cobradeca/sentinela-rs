import { useEffect, useState } from "react";
import { NavIcon } from "../layout/NavIcons";
import { WeatherIcon } from "../layout/WeatherIcon";

// A URL da API do Open-Meteo agora é gerada dinamicamente com base nas coordenadas do usuário.

const WMO_DESC_PT = {
  0: "Ensolarado",
  1: "Principalmente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa fraca",
  53: "Garoa",
  55: "Garoa forte",
  56: "Garoa congelante fraca",
  57: "Garoa congelante forte",
  61: "Chuva fraca",
  63: "Chuva",
  65: "Chuva forte",
  66: "Chuva congelante fraca",
  67: "Chuva congelante forte",
  71: "Neve fraca",
  73: "Neve",
  75: "Neve intensa",
  77: "Grãos de neve",
  80: "Pancadas de chuva fraca",
  81: "Pancadas de chuva",
  82: "Pancadas de chuva forte",
  85: "Pancadas de neve fraca",
  86: "Pancadas de neve forte",
  95: "Tempestade",
  96: "Tempestade com granizo",
  99: "Tempestade forte com granizo"
};

function getWeatherDesc(code) {
  return WMO_DESC_PT[Number(code)] || "Nublado";
}

function getLongDayName(dateIso) {
  if (!dateIso) return "";
  const date = new Date(`${dateIso}T12:00:00`);
  const dayName = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  return dayName.charAt(0).toUpperCase() + dayName.slice(1);
}

function getShortDayName(dateIso, index) {
  if (index === 0) return "Hoje";
  const date = new Date(`${dateIso}T12:00:00`);
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date);
  return label.replace(".", "") + ".";
}

function normalizeHourly(data) {
  const hourly = data?.hourly || {};
  const times = hourly.time || [];
  return times.map((time, index) => ({
    time,
    temperature_2m: hourly.temperature_2m?.[index],
    precipitation: hourly.precipitation?.[index],
    precipitation_probability: hourly.precipitation_probability?.[index],
    wind_speed_10m: hourly.wind_speed_10m?.[index],
    weather_code: hourly.weather_code?.[index],
    relative_humidity_2m: hourly.relative_humidity_2m?.[index],
  }));
}

function normalizeDaily(data) {
  const daily = data?.daily || {};
  const times = daily.time || [];
  return times.map((date, index) => ({
    date,
    code: daily.weathercode?.[index],
    rain: daily.precipitation_sum?.[index],
    wind: daily.windspeed_10m_max?.[index],
    min: daily.temperature_2m_min?.[index],
    max: daily.temperature_2m_max?.[index],
  }));
}

export function PrevisaoRioGrande({ className = "", onNavigate, userCity }) {
  const [state, setState] = useState({ loading: true, error: null, current: null, hourly: [], daily: [], updatedAt: null });
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState("temperature"); // "temperature", "precipitation", "wind"
  const [tempUnit, setTempUnit] = useState("C"); // "C" or "F"
  const [selectedHourIndex, setSelectedHourIndex] = useState(4); // 14:00 default
  const [hoveredHourIndex, setHoveredHourIndex] = useState(null);
  const [hoveredDayIndex, setHoveredDayIndex] = useState(null);

  const lat = userCity?.lat ?? -32.035;
  const lon = userCity?.lon ?? -52.099;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation,precipitation_probability,relative_humidity_2m,wind_speed_10m,weather_code&daily=weathercode,precipitation_sum,windspeed_10m_max,temperature_2m_min,temperature_2m_max&timezone=America/Sao_Paulo&forecast_days=8`;

  const load = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
      const data = await response.json();
      setState({
        loading: false,
        error: null,
        current: data.current,
        hourly: normalizeHourly(data),
        daily: normalizeDaily(data),
        updatedAt: new Date()
      });
    } catch (error) {
      setState({
        loading: false,
        error: error?.message || "Falha ao carregar previsão",
        current: null,
        hourly: [],
        daily: [],
        updatedAt: null
      });
    }
  };

  useEffect(() => {
    load();
  }, [userCity]);

  if (state.loading) {
    return (
      <section className={`sr-mod-card ${className}`} style={{ background: "#ffffff", border: "1px solid #dadce0", borderRadius: 16, padding: 20 }}>
        <div className="sr-mod-skeleton h-5 w-1-2" style={{ backgroundColor: "#e2e8f0" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 20, overflowX: "auto" }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="sr-mod-skeleton h-36" style={{ flex: "1 0 70px", backgroundColor: "#e2e8f0", borderRadius: 8 }} />
          ))}
        </div>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className={`sr-mod-card ${className}`} style={{ background: "#ffffff", border: "1px solid #dadce0", borderRadius: 16, padding: 20 }}>
        <div className="sr-mod-error" style={{ color: "#721c24", backgroundColor: "#f8d7da", borderColor: "#f5c6cb" }}>
          <span>{state.error}</span>
          <button type="button" onClick={load} style={{ border: "1px solid #f5c6cb", borderRadius: 8, padding: "6px 12px", background: "#fff", cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  const activeDay = state.daily[selectedDayIndex] || {};
  const dayHoursIndices = [2, 5, 8, 11, 14, 17, 20, 23];
  
  const points = dayHoursIndices.map((hIndex) => {
    const hourlyIndex = selectedDayIndex * 24 + hIndex;
    const hourData = state.hourly[hourlyIndex] || {};
    const timeStr = hourData.time ? hourData.time.split("T")[1] : `${String(hIndex).padStart(2, "0")}:00`;
    return {
      timeLabel: timeStr,
      temp: hourData.temperature_2m ?? 0,
      precipitation: hourData.precipitation ?? 0,
      rainProb: hourData.precipitation_probability ?? 0,
      wind: hourData.wind_speed_10m ?? 0,
      humidity: hourData.relative_humidity_2m ?? 0,
      code: hourData.weather_code ?? 0,
    };
  });

  const activeHourIdx = hoveredHourIndex !== null ? hoveredHourIndex : selectedHourIndex;
  const activeHourData = points[activeHourIdx] || {};
  const isToday = selectedDayIndex === 0;
  const isHourlyActive = hoveredHourIndex !== null;

  // Header display logic
  const tempVal = (isToday && !isHourlyActive && state.current) ? state.current.temperature_2m : activeHourData.temp;
  const humidityVal = (isToday && !isHourlyActive && state.current) ? state.current.relative_humidity_2m : activeHourData.humidity;
  const windVal = (isToday && !isHourlyActive && state.current) ? state.current.wind_speed_10m : activeHourData.wind;
  const codeVal = (isToday && !isHourlyActive && state.current) ? state.current.weather_code : activeHourData.code;
  const rainProbVal = activeHourData.rainProb ?? 0;

  const dayName = getLongDayName(activeDay.date);
  const headerTimeLabel = (isToday && !isHourlyActive && state.updatedAt)
    ? `${dayName}, ${state.updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : `${dayName}, ${activeHourData.timeLabel}`;

  const formatTemp = (valCelsius) => {
    if (valCelsius === undefined || valCelsius === null) return "--";
    const val = tempUnit === "F" ? (valCelsius * 9/5) + 32 : valCelsius;
    return `${Math.round(val)}`;
  };

  // Graph values selection
  let graphValues = [];
  let graphColor = "#eab308";
  let labelSuffix = "";
  let gradientId = "temp-gradient";

  if (selectedTab === "temperature") {
    graphValues = points.map(p => tempUnit === "F" ? (p.temp * 9/5) + 32 : p.temp);
    graphColor = "#eab308";
    labelSuffix = "°";
    gradientId = "temp-gradient";
  } else if (selectedTab === "precipitation") {
    graphValues = points.map(p => p.rainProb);
    graphColor = "#1a73e8";
    labelSuffix = "%";
    gradientId = "rain-gradient";
  } else {
    graphValues = points.map(p => p.wind);
    graphColor = "#70757a";
    labelSuffix = " km/h";
    gradientId = "wind-gradient";
  }

  const minVal = Math.min(...graphValues);
  const maxVal = Math.max(...graphValues);
  const range = maxVal - minVal;
  const yCoords = graphValues.map(val => {
    if (range === 0) return 55;
    return 80 - ((val - minVal) / range) * 50; // Map values to Y range [30, 80]
  });

  const xCoords = [40, 114, 188, 262, 337, 411, 485, 560];
  const pathPoints = xCoords.map((x, idx) => `${x},${yCoords[idx]}`);
  const pathD = `M ${pathPoints.join(" L ")}`;
  const fillD = `M 40,105 L ${pathPoints.join(" L ")} L 560,105 Z`;

  const colWidth = 520 / 7;

  return (
    <section className={`sr-mod-card ${className}`} style={{
      background: "#ffffff",
      color: "#202124",
      border: "1px solid #dadce0",
      borderRadius: 16,
      padding: "20px 24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      fontFamily: "var(--sr-font)",
      minHeight: 480
    }}>
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <WeatherIcon code={codeVal} size={54} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <span style={{ fontSize: 52, fontWeight: 400, lineHeight: 1, color: "#202124" }}>
              {formatTemp(tempVal)}
            </span>
            <div style={{ display: "flex", gap: 3, fontSize: 16, color: "#70757a", marginTop: 4, marginLeft: 2 }}>
              <button
                type="button"
                onClick={() => setTempUnit("C")}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  color: tempUnit === "C" ? "#212121" : "#70757a",
                  fontWeight: tempUnit === "C" ? 600 : 400,
                  fontSize: 16
                }}
              >
                °C
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => setTempUnit("F")}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  color: tempUnit === "F" ? "#212121" : "#70757a",
                  fontWeight: tempUnit === "F" ? 600 : 400,
                  fontSize: 16
                }}
              >
                °F
              </button>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", fontSize: 13, color: "#70757a", marginLeft: 16, lineHeight: 1.45 }}>
            <div>Chuva: {rainProbVal}%</div>
            <div>Umidade: {Math.round(humidityVal)}%</div>
            <div>Vento: {Math.round(windVal)} km/h</div>
          </div>
        </div>

        <div style={{ textAlign: "right", minWidth: 120 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#202124" }}>
            {typeof userCity === "string" ? userCity : (userCity?.name || "Rio Grande")}
          </div>
          <div style={{ fontSize: 13, color: "#70757a", marginTop: 2 }}>
            {headerTimeLabel}
          </div>
          <div style={{ fontSize: 13, color: "#70757a", marginTop: 2, fontWeight: 500 }}>
            {getWeatherDesc(codeVal)}
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid #dadce0",
        gap: 20,
        paddingBottom: 0,
        marginTop: 4
      }}>
        {[
          { id: "temperature", label: "Temperatura" },
          { id: "precipitation", label: "Chuva" },
          { id: "wind", label: "Vento" }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTab(tab.id)}
            style={{
              background: "none",
              border: "none",
              padding: "8px 0 10px 0",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: selectedTab === tab.id ? "#202124" : "#70757a",
              position: "relative"
            }}
          >
            {tab.label}
            {selectedTab === tab.id && (
              <div style={{
                position: "absolute",
                bottom: -1,
                left: 0,
                right: 0,
                height: 3,
                background: "#eab308",
                borderRadius: "3px 3px 0 0"
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Hourly chart container */}
      <div style={{ position: "relative", height: 135, marginTop: 8 }}>
        <svg viewBox="0 0 600 135" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="temp-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#eab308" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="rain-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a73e8" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#1a73e8" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="wind-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#70757a" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#70757a" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Fill under path */}
          <path d={fillD} fill={`url(#${gradientId})`} />

          {/* Stroke path */}
          <path d={pathD} fill="none" stroke={graphColor} strokeWidth={2.5} />

          {/* Value labels and circles */}
          {xCoords.map((x, idx) => {
            const isHovered = hoveredHourIndex === idx;
            const isSelected = selectedHourIndex === idx && hoveredHourIndex === null;
            const isActive = isHovered || isSelected;

            return (
              <g key={idx}>
                {/* Value text above the point */}
                <text
                  x={x}
                  y={yCoords[idx] - 12}
                  textAnchor="middle"
                  fill="#202124"
                  fontSize={11}
                  fontWeight={600}
                >
                  {Math.round(graphValues[idx])}{labelSuffix}
                </text>

                {/* Main point circle */}
                <circle
                  cx={x}
                  cy={yCoords[idx]}
                  r={4}
                  fill={graphColor}
                />

                {/* Highlight ring for active point */}
                {isActive && (
                  <circle
                    cx={x}
                    cy={yCoords[idx]}
                    r={8}
                    fill={graphColor}
                    opacity={0.3}
                  />
                )}

                {/* Hour label at the bottom */}
                <text
                  x={x}
                  y={122}
                  textAnchor="middle"
                  fill="#70757a"
                  fontSize={11}
                  fontWeight={isActive ? 600 : 400}
                >
                  {points[idx].timeLabel}
                </text>
              </g>
            );
          })}

          {/* Hover interaction overlay columns */}
          {xCoords.map((x, idx) => {
            const startX = idx === 0 ? 15 : x - colWidth / 2;
            const width = idx === 0 ? (xCoords[1] - 40) / 2 + 25 : (idx === 7 ? 40 : colWidth);
            return (
              <rect
                key={idx}
                x={startX}
                y={0}
                width={width}
                height={135}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredHourIndex(idx)}
                onMouseLeave={() => setHoveredHourIndex(null)}
                onClick={() => setSelectedHourIndex(idx)}
              />
            );
          })}
        </svg>
      </div>

      {/* Daily forecast horizontal row */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 4,
        marginTop: 8,
        scrollbarWidth: "thin"
      }}>
        {state.daily.map((day, index) => {
          const isSelected = selectedDayIndex === index;
          const isHovered = hoveredDayIndex === index;
          return (
            <div
              key={day.date}
              onClick={() => {
                setSelectedDayIndex(index);
                setSelectedHourIndex(4);
              }}
              onMouseEnter={() => setHoveredDayIndex(index)}
              onMouseLeave={() => setHoveredDayIndex(null)}
              style={{
                flex: "1 0 65px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "10px 4px",
                borderRadius: 12,
                cursor: "pointer",
                background: isSelected ? "#f1f3f4" : (isHovered ? "#f8f9fa" : "transparent"),
                border: isSelected ? "1px solid #dadce0" : "1px solid transparent",
                transition: "background 0.2s, border 0.2s",
                boxSizing: "border-box"
              }}
              className="sr-forecast-day-item"
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: "#202124", textTransform: "capitalize" }}>
                {getShortDayName(day.date, index)}
              </span>
              <div style={{ margin: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <WeatherIcon code={day.code} size={28} />
              </div>
              <div style={{ display: "flex", gap: 4, fontSize: 11, justifyContent: "center", width: "100%" }}>
                <span style={{ fontWeight: 600, color: "#202124" }}>{formatTemp(day.max)}°</span>
                <span style={{ color: "#70757a" }}>{formatTemp(day.min)}°</span>
              </div>
            </div>
          );
        })}
      </div>

      {onNavigate && (
        <footer style={{
          display: "flex",
          justifyContent: "flex-end",
          borderTop: "1px solid #dadce0",
          paddingTop: 10,
          marginTop: "auto"
        }}>
          <button
            type="button"
            className="sr-btn-link"
            onClick={() => onNavigate("previsao")}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              color: "#1a73e8", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4
            }}
          >
            Ver detalhes <NavIcon name="chevron" size={13} />
          </button>
        </footer>
      )}
    </section>
  );
}

export default PrevisaoRioGrande;
