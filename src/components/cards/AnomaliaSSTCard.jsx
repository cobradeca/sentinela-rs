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

function SSTMap({ dateIso, compareIso, dividerPos, onLoadStart, onLoadEnd, onCompareLoadEnd }) {
  const leafletRef = useRef(null);
  const wmsMainRef = useRef(null);
  const wmsCompareRef = useRef(null);
  const containerId = "sr-sst-leaflet-map";

  // Inicialização do mapa
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

      // Camada principal (lado esquerdo ou full)
      const wmsMain = L.tileLayer.wms(GIBS_WMS, {
        layers: LAYER,
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        TIME: dateIso,
        opacity: 0.85,
      });

      wmsMain.on("loading", () => onLoadStart?.());
      wmsMain.on("load", () => onLoadEnd?.());
      wmsMain.addTo(map);

      // Camada de comparação (lado direito, inicialmente hidden)
      const wmsCompare = L.tileLayer.wms(GIBS_WMS, {
        layers: LAYER,
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        TIME: compareIso,
        opacity: 0.85,
      });

      wmsCompare.on("load", () => {
        onCompareLoadEnd?.();
      });
      
      if (compareIso) {
        wmsCompare.addTo(map);
      }

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
      wmsMainRef.current = wmsMain;
      wmsCompareRef.current = wmsCompare;
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

  // Atualiza camada principal quando dateIso muda
  useEffect(() => {
    if (!wmsMainRef.current) return;
    wmsMainRef.current.setParams({ TIME: dateIso });
  }, [dateIso]);

  // Atualiza camada de comparação quando compareIso muda
  useEffect(() => {
    if (!wmsCompareRef.current) return;
    if (compareIso) {
      wmsCompareRef.current.setParams({ TIME: compareIso });
      if (!wmsCompareRef.current._map) {
        leafletRef.current?.addLayer(wmsCompareRef.current);
      }
    } else {
      if (wmsCompareRef.current._map) {
        leafletRef.current?.removeLayer(wmsCompareRef.current);
      }
    }
  }, [compareIso]);

  // Aplica máscara CSS para split-view
  useEffect(() => {
    if (!wmsCompareRef.current || !wmsMainRef.current) return;
    const map = leafletRef.current;
    if (!map) return;

    const dividerPercent = dividerPos;

    // Aplica clip-path à camada de comparação para mostrar apenas lado direito do divisor
    const comparePane = wmsCompareRef.current.getPane();
    if (comparePane) {
      comparePane.style.clipPath = `inset(0 0 0 ${dividerPercent}%)`;
    }

    // Renderiza linha vertical do divisor
    const existingDivider = document.querySelector(".sr-sst-divider");
    if (existingDivider) {
      existingDivider.style.left = `${dividerPercent}%`;
    }
  }, [dividerPos]);

  return (
    <div style={{ position: "relative", width: "100%", height: 420 }}>
      <div
        id={containerId}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: "#091522",
        }}
      />
      {/* Divisor visual para split-view */}
      <div
        className="sr-sst-divider"
        style={{
          position: "absolute",
          top: 0,
          left: `${dividerPos}%`,
          width: 2,
          height: "100%",
          background: "#fbbf24",
          zIndex: 998,
          pointerEvents: "none",
          transition: "left 0.05s linear",
        }}
      />
    </div>
  );
}

export function AnomaliaSSTCard({ className = "" }) {
  const [offset, setOffset] = useState(DAYS_BACK);
  const [playing, setPlaying] = useState(false);
  const [mainLoading, setMainLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [dividerPos, setDividerPos] = useState(50); // Posição do divisor em %
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);

  const currentIso = dates[offset] || dates[dates.length - 1];
  
  // Modo split-view: mostra a data anterior como comparação
  const compareIso = offset > 0 ? dates[offset - 1] : null;

  const handleSlider = useCallback((e) => {
    setOffset(Number(e.target.value));
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const handleDividerMouseDown = useCallback(() => {
    setIsDraggingDivider(true);
  }, []);

  const handleDividerMouseUp = useCallback(() => {
    setIsDraggingDivider(false);
  }, []);

  const handleDividerMouseMove = useCallback((e) => {
    if (!isDraggingDivider || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPos = (x / rect.width) * 100;
    
    // Clamp entre 20% e 80%
    const clampedPos = Math.max(20, Math.min(80, newPos));
    setDividerPos(clampedPos);
  }, [isDraggingDivider]);

  // Attach/detach divider mouse events
  useEffect(() => {
    if (isDraggingDivider) {
      document.addEventListener("mousemove", handleDividerMouseMove);
      document.addEventListener("mouseup", handleDividerMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleDividerMouseMove);
        document.removeEventListener("mouseup", handleDividerMouseUp);
      };
    }
  }, [isDraggingDivider, handleDividerMouseMove, handleDividerMouseUp]);

  // Reprodução de timeline
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setOffset((prev) => {
          if (prev >= DAYS_BACK) {
            setPlaying(false);
            return prev;
          }
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

      <div
        ref={containerRef}
        style={{
          position: "relative",
          userSelect: isDraggingDivider ? "none" : "auto",
          cursor: isDraggingDivider ? "col-resize" : "default",
        }}
      >
        <SSTMap
          dateIso={currentIso}
          compareIso={compareIso}
          dividerPos={dividerPos}
          onLoadStart={() => setMainLoading(true)}
          onLoadEnd={() => setMainLoading(false)}
          onCompareLoadEnd={() => setCompareLoading(false)}
        />

        {/* Indicador de carregamento sutil (apenas em canto, não cobre tudo) */}
        {mainLoading && (
          <div style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(0,0,0,0.72)",
            borderRadius: 8,
            padding: "6px 10px",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{
              width: 16,
              height: 16,
              border: "2px solid rgba(56,189,248,0.25)",
              borderTop: "2px solid #38bdf8",
              borderRadius: "50%",
              animation: "sr-spin 0.7s linear infinite",
            }} />
            <span style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>Carregando...</span>
          </div>
        )}

        {compareLoading && compareIso && (
          <div style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(0,0,0,0.72)",
            borderRadius: 8,
            padding: "6px 10px",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{
              width: 16,
              height: 16,
              border: "2px solid rgba(56,189,248,0.25)",
              borderTop: "2px solid #38bdf8",
              borderRadius: "50%",
              animation: "sr-spin 0.7s linear infinite",
            }} />
            <span style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>Comparando...</span>
          </div>
        )}

        {/* Legenda de cores */}
        <div style={{
          position: "absolute", top: 12, left: 12, zIndex: 999,
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

        {/* Etiqueta Niño 3.4 */}
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 999,
          background: "rgba(0,0,0,0.72)", borderRadius: 8, padding: "6px 10px",
          backdropFilter: "blur(4px)", fontSize: 11, color: "#facc15", fontWeight: 700,
        }}>
          ⬛ Niño 3.4
        </div>

        {/* Etiqueta de data comparada (quando em split-view) */}
        {compareIso && (
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 999,
            background: "rgba(0,0,0,0.72)", borderRadius: 8, padding: "4px 8px",
            backdropFilter: "blur(4px)", fontSize: 10, color: "#fbbf24", fontWeight: 700,
          }}>
            Comparando: {formatBR(compareIso)}
          </div>
        )}

        {/* Handle arrastável do divisor */}
        <div
          onMouseDown={handleDividerMouseDown}
          style={{
            position: "absolute",
            top: 0,
            left: `calc(${dividerPos}% - 8px)`,
            width: 16,
            height: "100%",
            zIndex: 997,
            cursor: "col-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: isDraggingDivider ? "auto" : "auto",
          }}
        >
          <div style={{
            width: 4,
            height: "100%",
            background: "#fbbf24",
            borderRadius: 2,
            opacity: isDraggingDivider ? 1 : 0.5,
            transition: "opacity 0.2s",
          }} />
        </div>
      </div>

      {/* Controles de reprodução e slider */}
      <div style={{ padding: "10px 18px 4px", background: "var(--sr-card-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => setOffset(0)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--sr-text-muted)",
              fontSize: 14,
              padding: "4px 6px",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.color = "var(--sr-text)")}
            onMouseLeave={(e) => (e.target.style.color = "var(--sr-text-muted)")}
            title="Voltar ao início"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              background: playing ? "#38bdf8" : "var(--sr-border)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              color: playing ? "#000" : "var(--sr-text)",
              fontSize: 14,
              display: "grid",
              placeItems: "center",
              transition: "all 0.2s",
              fontWeight: 700,
            }}
            title={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            onClick={() => setOffset(DAYS_BACK)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--sr-text-muted)",
              fontSize: 14,
              padding: "4px 6px",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.color = "var(--sr-text)")}
            onMouseLeave={(e) => (e.target.style.color = "var(--sr-text-muted)")}
            title="Ir para a data mais recente"
          >
            ⏭
          </button>
          <input
            type="range"
            min={0}
            max={DAYS_BACK}
            step={1}
            value={offset}
            onChange={handleSlider}
            style={{ flex: 1, accentColor: "#38bdf8", cursor: "pointer" }}
            title="Deslizar pela timeline"
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: mainLoading ? "#38bdf8" : "var(--sr-text-muted)",
              whiteSpace: "nowrap",
              minWidth: 52,
              transition: "color 0.2s",
            }}
          >
            {mainLoading ? "..." : formatBR(currentIso)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--sr-text-muted)", padding: "2px 48px 0" }}>
          <span>{formatBR(dates[0])}</span>
          <span>{formatBR(dates[DAYS_BACK])}</span>
        </div>
      </div>

      {/* Rodapé com descrição e link */}
      <div style={{ padding: "8px 18px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 11, color: "var(--sr-text-muted)", lineHeight: 1.5, flex: "1 1 auto", minWidth: 200 }}>
          <strong style={{ color: "var(--sr-text)" }}>Laranja/Vermelho</strong> = água mais quente (El Niño) • <strong style={{ color: "var(--sr-text)" }}>Azul</strong> = mais fria (La Niña) • <strong style={{ color: "#fbbf24" }}>Amarelo</strong> = Niño 3.4
        </p>
        <a href={worldviewUrl(currentIso)} target="_blank" rel="noreferrer" className="sr-btn-link" style={{ whiteSpace: "nowrap" }}>
          NASA Worldview ↗
        </a>
      </div>
    </section>
  );
}

export default AnomaliaSSTCard;
