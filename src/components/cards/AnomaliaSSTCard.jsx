import { useState, useMemo, useCallback, useEffect, useRef } from "react";

const LAYER = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies";
const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const DAYS_BACK = 30;
const INITIAL_BOUNDS = [[-35, -170], [20, -40]];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function dateMinusDays(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

const dates = Array.from({ length: DAYS_BACK + 1 }, (_, i) =>
  isoDate(dateMinusDays(DAYS_BACK - i + 2))
);

function formatBR(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }).format(d);
}

function worldviewUrl(iso) {
  return `https://worldview.earthdata.nasa.gov/?v=-170,-35,-40,20&l=${LAYER}&t=${iso}-T00:00:00Z`;
}

// Pré-busca tiles WMS para uma data específica usando canvas oculto
function prefetchDate(iso) {
  const center = { lat: -7, lng: -110 };
  // Busca um tile representativo da região central
  const url = `${GIBS_WMS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=${LAYER}&SRS=EPSG:4326&BBOX=-170,-35,-40,20&WIDTH=256&HEIGHT=120&FORMAT=image/png&TRANSPARENT=true&TIME=${iso}`;
  const img = new Image();
  img.src = url;
}

function SSTMap({ dateIso, onLoadStart, onLoadEnd }) {
  const leafletRef = useRef(null);
  const wmsLayerRef = useRef(null);
  const containerId = "sr-sst-leaflet-map";

  useEffect(() => {
    function initMap() {
      const L = window.L;
      if (!L) return;
      if (leafletRef.current) return;

      const map = L.map(containerId, {
        center: [-7, -110],
        zoom: 3,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 8,
      }).addTo(map);

      const wmsLayer = L.tileLayer.wms(GIBS_WMS, {
        layers: LAYER,
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        TIME: dateIso,
        opacity: 0.85,
      });

      // Loading events
      wmsLayer.on("loading", () => onLoadStart?.());
      wmsLayer.on("load", () => onLoadEnd?.());

      wmsLayer.addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 8,
        pane: "shadowPane",
      }).addTo(map);

      L.rectangle([[-5, -170], [5, -120]], {
        color: "#facc15",
        weight: 2,
        fill: false,
        dashArray: "6 4",
      }).addTo(map).bindTooltip("Região Niño 3.4", { permanent: false, direction: "top" });

      map.fitBounds(INITIAL_BOUNDS);
      leafletRef.current = map;
      wmsLayerRef.current = wmsLayer;
    }

    if (window.L) {
      initMap();
    } else {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = initMap;
        document.head.appendChild(script);
      }
    }
  }, []);

  // Atualiza WMS com debounce nativo: usa ref para não recriar efeito
  const debounceRef = useRef(null);
  useEffect(() => {
    if (!wmsLayerRef.current) return;
    onLoadStart?.();
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      wmsLayerRef.current.setParams({ TIME: dateIso });
      // Preload dias vizinhos
      const idx = dates.indexOf(dateIso);
      if (idx > 0) prefetchDate(dates[idx - 1]);
      if (idx < dates.length - 1) prefetchDate(dates[idx + 1]);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [dateIso]);

  return <div id={containerId} style={{ width: "100%", height: 420, borderRadius: 12, overflow: "hidden", background: "#091522" }} />;
}

export function AnomaliaSSTCard({ className = "" }) {
  const [offset, setOffset] = useState(DAYS_BACK);
  const [playing, setPlaying] = useState(false);
  const [tileLoading, setTileLoading] = useState(false);
  const intervalRef = useRef(null);

  const currentIso = dates[offset] || dates[dates.length - 1];

  const handleSlider = useCallback((e) => setOffset(Number(e.target.value)), []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setOffset((prev) => {
          if (prev >= DAYS_BACK) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, 800);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing]);

  return (
    <section className={`sr-mod-card ${className}`} style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="sr-mod-title"><span>🌡</span> Anomalia de TSM <span>• Pacífico + América do Sul</span></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="sr-mod-badge">NASA GIBS</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sr-text-muted)" }}>{currentIso}</span>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <SSTMap
          dateIso={currentIso}
          onLoadStart={() => setTileLoading(true)}
          onLoadEnd={() => setTileLoading(false)}
        />

        {/* Spinner de carregamento */}
        {tileLoading && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 1000,
            display: "grid", placeItems: "center",
            background: "rgba(9,21,34,0.45)", backdropFilter: "blur(2px)",
            borderRadius: 12, pointerEvents: "none",
          }}>
            <div style={{
              width: 36, height: 36, border: "3px solid rgba(56,189,248,0.25)",
              borderTop: "3px solid #38bdf8", borderRadius: "50%",
              animation: "sr-spin 0.7s linear infinite",
            }} />
          </div>
        )}

        <div style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 999,
          background: "rgba(0,0,0,0.72)", borderRadius: 8, padding: "8px 12px",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4, fontWeight: 700, letterSpacing: "0.05em" }}>ANOMALIA TSM (°C)</div>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {[["#3b0764","< -3"],["#1d4ed8","-2"],["#60a5fa","-1"],["#e5e7eb","0"],["#f97316","+1"],["#dc2626","+2"],["#7f1d1d","> +3"]].map(([bg, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ width: 24, height: 12, background: bg, borderRadius: 2 }} />
                <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 999,
          background: "rgba(0,0,0,0.72)", borderRadius: 8, padding: "6px 10px",
          backdropFilter: "blur(4px)", fontSize: 11, color: "#facc15", fontWeight: 700,
        }}>
          ⬛ Niño 3.4
        </div>
      </div>

      <div style={{ padding: "10px 18px 4px", background: "var(--sr-card-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={() => setOffset(0)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sr-text-muted)", fontSize: 14, padding: "4px 6px" }} title="Início">⏮</button>
          <button
            type="button"
            onClick={togglePlay}
            style={{ background: playing ? "#38bdf8" : "var(--sr-border)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: playing ? "#000" : "var(--sr-text)", fontSize: 14, display: "grid", placeItems: "center" }}
          >{playing ? "⏸" : "▶"}</button>
          <button type="button" onClick={() => setOffset(DAYS_BACK)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sr-text-muted)", fontSize: 14, padding: "4px 6px" }} title="Mais recente">⏭</button>
          <input type="range" min={0} max={DAYS_BACK} step={1} value={offset} onChange={handleSlider} style={{ flex: 1, accentColor: "#38bdf8", cursor: "pointer" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: tileLoading ? "#38bdf8" : "var(--sr-text-muted)", whiteSpace: "nowrap", minWidth: 52, transition: "color 0.2s" }}>
            {tileLoading ? "..." : formatBR(currentIso)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--sr-text-muted)", padding: "2px 48px 0" }}>
          <span>{formatBR(dates[0])}</span>
          <span>{formatBR(dates[DAYS_BACK])}</span>
        </div>
      </div>

      <div style={{ padding: "8px 18px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 11, color: "var(--sr-text-muted)", lineHeight: 1.5, maxWidth: "70%" }}>
          Laranja/vermelho = água mais quente que a média (El Niño). Azul = mais fria (La Niña). Retângulo amarelo = região Niño 3.4.
        </p>
        <a href={worldviewUrl(currentIso)} target="_blank" rel="noreferrer" className="sr-btn-link">NASA Worldview ↗</a>
      </div>
    </section>
  );
}

export default AnomaliaSSTCard;

const LAYER = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies";
const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const DAYS_BACK = 30;

// View inicial: Pacífico equatorial + América do Sul
const INITIAL_BOUNDS = [[-35, -170], [20, -40]];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function dateMinusDays(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

const dates = Array.from({ length: DAYS_BACK + 1 }, (_, i) =>
  isoDate(dateMinusDays(DAYS_BACK - i + 2))
);

function formatBR(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }).format(d);
}

function worldviewUrl(iso) {
  return `https://worldview.earthdata.nasa.gov/?v=-170,-35,-40,20&l=${LAYER}&t=${iso}-T00:00:00Z`;
}

// Componente de mapa Leaflet carregado dinamicamente
function SSTMap({ dateIso }) {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const wmsLayerRef = useRef(null);
  const containerId = "sr-sst-leaflet-map";

  useEffect(() => {
    // Carrega Leaflet do CDN se ainda não carregou
    function initMap() {
      const L = window.L;
      if (!L) return;
      if (leafletRef.current) {
        // Já existe — só atualiza a camada
        if (wmsLayerRef.current) {
          wmsLayerRef.current.setParams({ TIME: dateIso });
        }
        return;
      }

      const map = L.map(containerId, {
        center: [-7, -110],
        zoom: 3,
        zoomControl: true,
        attributionControl: false,
      });

      // Base layer escura (CartoDB Dark)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 8,
      }).addTo(map);

      // Camada SST Anomaly do GIBS via WMS
      const wmsLayer = L.tileLayer.wms(GIBS_WMS, {
        layers: LAYER,
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        TIME: dateIso,
        opacity: 0.85,
        attribution: "NASA GIBS",
      });
      wmsLayer.addTo(map);

      // Labels/bordas dos países
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 8,
        pane: "shadowPane",
      }).addTo(map);

      // Retângulo da região Niño 3.4
      L.rectangle([[-5, -170], [5, -120]], {
        color: "#facc15",
        weight: 2,
        fill: false,
        dashArray: "6 4",
      }).addTo(map).bindTooltip("Região Niño 3.4", { permanent: false, direction: "top" });

      map.fitBounds(INITIAL_BOUNDS);

      leafletRef.current = map;
      wmsLayerRef.current = wmsLayer;
    }

    if (window.L) {
      initMap();
    } else {
      // Inject Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      // Inject Leaflet JS
      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = initMap;
        document.head.appendChild(script);
      }
    }
  }, []);

  // Atualiza a camada WMS quando a data muda
  useEffect(() => {
    if (wmsLayerRef.current) {
      wmsLayerRef.current.setParams({ TIME: dateIso });
    }
  }, [dateIso]);

  return <div id={containerId} ref={mapRef} style={{ width: "100%", height: 420, borderRadius: 12, overflow: "hidden", background: "#091522" }} />;
}

export function AnomaliaSSTCard({ className = "" }) {
  const [offset, setOffset] = useState(DAYS_BACK);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  const currentIso = dates[offset] || dates[dates.length - 1];

  const handleSlider = useCallback((e) => setOffset(Number(e.target.value)), []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setOffset((prev) => {
          if (prev >= DAYS_BACK) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, 600);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing]);

  return (
    <section className={`sr-mod-card ${className}`} style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="sr-mod-title"><span>🌡</span> Anomalia de TSM <span>• Pacífico + América do Sul</span></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="sr-mod-badge">NASA GIBS</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sr-text-muted)" }}>{currentIso}</span>
        </div>
      </div>

      {/* Mapa interativo */}
      <div style={{ position: "relative" }}>
        <SSTMap dateIso={currentIso} />

        {/* Legenda sobreposta estilo Windy */}
        <div style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 999,
          background: "rgba(0,0,0,0.72)", borderRadius: 8, padding: "8px 12px",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4, fontWeight: 700, letterSpacing: "0.05em" }}>
            ANOMALIA TSM (°C)
          </div>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {[["#3b0764","< -3"], ["#1d4ed8","-2"], ["#60a5fa","-1"], ["#e5e7eb","0"], ["#f97316","+1"], ["#dc2626","+2"], ["#7f1d1d","> +3"]].map(([bg, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ width: 24, height: 12, background: bg, borderRadius: 2 }} />
                <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Niño 3.4 label sobreposto */}
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 999,
          background: "rgba(0,0,0,0.72)", borderRadius: 8, padding: "6px 10px",
          backdropFilter: "blur(4px)", fontSize: 11, color: "#facc15", fontWeight: 700,
        }}>
          ⬛ Niño 3.4 (retângulo)
        </div>
      </div>

      {/* Controles temporais estilo Windy */}
      <div style={{ padding: "10px 18px 4px", background: "var(--sr-card-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => setOffset(0)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sr-text-muted)", fontSize: 14, padding: "4px 6px" }}
            title="Início"
          >⏮</button>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              background: playing ? "#38bdf8" : "var(--sr-border)",
              border: "none", borderRadius: "50%", width: 32, height: 32,
              cursor: "pointer", color: playing ? "#000" : "var(--sr-text)",
              fontSize: 14, display: "grid", placeItems: "center",
            }}
            title={playing ? "Pausar" : "Reproduzir"}
          >{playing ? "⏸" : "▶"}</button>
          <button
            type="button"
            onClick={() => setOffset(DAYS_BACK)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sr-text-muted)", fontSize: 14, padding: "4px 6px" }}
            title="Mais recente"
          >⏭</button>
          <input
            type="range"
            min={0}
            max={DAYS_BACK}
            step={1}
            value={offset}
            onChange={handleSlider}
            className="sr-sst-slider"
            style={{ flex: 1, accentColor: "#38bdf8" }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sr-text-muted)", whiteSpace: "nowrap", minWidth: 52 }}>
            {formatBR(currentIso)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--sr-text-muted)", padding: "2px 48px 0" }}>
          <span>{formatBR(dates[0])}</span>
          <span>{formatBR(dates[DAYS_BACK])}</span>
        </div>
      </div>

      <div style={{ padding: "8px 18px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 11, color: "var(--sr-text-muted)", lineHeight: 1.5, maxWidth: "70%" }}>
          Laranja/vermelho = água mais quente que a média (El Niño). Azul = mais fria (La Niña). Retângulo amarelo = região Niño 3.4.
        </p>
        <a href={worldviewUrl(currentIso)} target="_blank" rel="noreferrer" className="sr-btn-link">
          NASA Worldview ↗
        </a>
      </div>
    </section>
  );
}

export default AnomaliaSSTCard;
