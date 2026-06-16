import { useState, useCallback, useEffect, useRef } from "react";

const LAYER = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies";
const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const INITIAL_BOUNDS = [[-35, -170], [20, -40]];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function getToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return isoDate(d);
}

function getTenDaysAgo() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 10);
  return isoDate(d);
}

function SSTMap({ todayIso, tenDaysAgoIso, dividerPos, onDividerChange }) {
  const leafletRef = useRef(null);
  const wmsMainRef = useRef(null);
  const wmsCompareRef = useRef(null);
  const containerId = "sr-sst-leaflet-map";
  const containerRef = useRef(null);

  useEffect(() => {
    function initMap() {
      const L = window.L;
      if (!L || leafletRef.current) return;

      const map = L.map(containerId, {
        center: [-7, -110],
        zoom: 3,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 8,
      }).addTo(map);

      const wmsMain = L.tileLayer.wms(GIBS_WMS, {
        layers: LAYER,
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        TIME: todayIso,
        opacity: 0.85,
      }).addTo(map);

      const wmsCompare = L.tileLayer.wms(GIBS_WMS, {
        layers: LAYER,
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        TIME: tenDaysAgoIso,
        opacity: 0.85,
      }).addTo(map);

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
      }).addTo(map);

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

  useEffect(() => {
    if (wmsMainRef.current) wmsMainRef.current.setParams({ TIME: todayIso });
    if (wmsCompareRef.current) wmsCompareRef.current.setParams({ TIME: tenDaysAgoIso });
  }, [todayIso, tenDaysAgoIso]);

  useEffect(() => {
    if (!wmsCompareRef.current) return;
    const comparePane = wmsCompareRef.current.getPane();
    if (comparePane) comparePane.style.clipPath = `inset(0 0 0 ${dividerPos}%)`;
  }, [dividerPos]);

  const handleMouseDown = () => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newPos = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
    onDividerChange(newPos);
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: 360 }}>
      <div id={containerId} style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden", background: "#091522" }} />
      <div onMouseDown={handleMouseDown} style={{ position: "absolute", top: 0, left: `calc(${dividerPos}% - 6px)`, width: 12, height: "100%", zIndex: 997, cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 2, height: "100%", background: "#fbbf24" }} />
      </div>
    </div>
  );
}

export function AnomaliaSSTCard({ className = "" }) {
  const [dividerPos, setDividerPos] = useState(50);
  
  const todayIso = getToday();
  const tenDaysAgoIso = getTenDaysAgo();

  return (
    <section className={`sr-mod-card ${className}`} style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="sr-mod-title"><span>🌡</span> Anomalia de TSM</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="sr-mod-badge">NASA GIBS</span>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <SSTMap
          todayIso={todayIso}
          tenDaysAgoIso={tenDaysAgoIso}
          dividerPos={dividerPos}
          onDividerChange={setDividerPos}
        />

        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 999, background: "rgba(0,0,0,0.72)", borderRadius: 6, padding: "6px 10px", backdropFilter: "blur(4px)", fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
          ANOMALIA TSM (°C)
        </div>
        <div style={{ position: "absolute", top: 32, left: 12, zIndex: 999, display: "flex", gap: 2 }}>
          {[["#3b0764","< -3"],["#1d4ed8","-2"],["#60a5fa","-1"],["#e5e7eb","0"],["#f97316","+1"],["#dc2626","+2"],["#7f1d1d","> +3"]].map(([bg, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ width: 16, height: 8, background: bg, borderRadius: 1 }} />
              <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 999, background: "rgba(0,0,0,0.72)", borderRadius: 6, padding: "4px 8px", backdropFilter: "blur(4px)", fontSize: 9, color: "#facc15", fontWeight: 700 }}>
          ⬛ Niño 3.4
        </div>

        <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 999, background: "rgba(0,0,0,0.72)", borderRadius: 6, padding: "6px 8px", backdropFilter: "blur(4px)", fontSize: 11, color: "#e2e8f0", fontWeight: 500 }}>
          ← {tenDaysAgoIso}
        </div>

        <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 999, background: "rgba(0,0,0,0.72)", borderRadius: 6, padding: "6px 8px", backdropFilter: "blur(4px)", fontSize: 11, color: "#e2e8f0", fontWeight: 500 }}>
          {todayIso} →
        </div>
      </div>

      <div style={{ padding: "10px 16px", fontSize: 11, color: "var(--sr-text-muted)", lineHeight: 1.4 }}>
        <strong style={{ color: "var(--sr-text)" }}>Laranja/Vermelho</strong> = mais quente (El Niño) • <strong style={{ color: "var(--sr-text)" }}>Azul</strong> = mais frio (La Niña) • Arraste o divisor para comparar
      </div>
    </section>
  );
}

export default AnomaliaSSTCard;
