import { useState, useCallback, useEffect, useRef } from "react";

const LAYER = "GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies";
const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const DAYS_BACK = 15;
const INITIAL_BOUNDS = [[-35, -170], [20, -40]];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatBR(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC",
  }).format(d);
}

/** Retorna a data de hoje (UTC) menos `offset` dias, como string ISO. */
function getDateOffset(offset = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offset);
  return isoDate(d);
}

// ─── SSTMap ────────────────────────────────────────────────────────────────────
// Renderiza duas camadas WMS sobrepostas com um divisor vertical arrastável.
// Camada de BAIXO = data atual (direita do divisor)
// Camada de CIMA  = data antiga  (esquerda do divisor) — cortada por clip-path
function SSTMap({ currentIso, compareIso, dividerPos, onDividerChange, mapRef }) {
  const leafletRef = useRef(null);
  const currentLayerRef = useRef(null);   // camada "hoje"
  const compareLayerRef = useRef(null);   // camada "15 dias atrás"
  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const containerId = "sr-sst-leaflet-map";

  // ── Inicializa o mapa uma única vez ──────────────────────────────────────
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

      // Base escura
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 8 }
      ).addTo(map);

      // Camada ATUAL (fica por baixo — visível à DIREITA do divisor)
      const currentLayer = L.tileLayer.wms(GIBS_WMS, {
        layers: LAYER,
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        TIME: currentIso,
        opacity: 0.85,
      }).addTo(map);

      // Pane isolado para a camada de comparação (permite clip independente)
      map.createPane("comparePane");
      map.getPane("comparePane").style.zIndex = 250;

      // Camada COMPARAÇÃO (fica por cima — visível à ESQUERDA do divisor)
      const compareLayer = L.tileLayer.wms(GIBS_WMS, {
        layers: LAYER,
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        TIME: compareIso,
        opacity: 0.85,
        pane: "comparePane",
      }).addTo(map);

      // Labels por cima de tudo
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 8, pane: "shadowPane" }
      ).addTo(map);

      // Retângulo Niño 3.4
      L.rectangle([[-5, -170], [5, -120]], {
        color: "#facc15",
        weight: 2,
        fill: false,
        dashArray: "6 4",
      }).addTo(map);

      map.fitBounds(INITIAL_BOUNDS);

      leafletRef.current = map;
      if (mapRef) mapRef.current = map;
      currentLayerRef.current = currentLayer;
      compareLayerRef.current = compareLayer;
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

  // ── Atualiza datas se mudarem ────────────────────────────────────────────
  useEffect(() => {
    if (currentLayerRef.current) currentLayerRef.current.setParams({ TIME: currentIso });
  }, [currentIso]);

  useEffect(() => {
    if (compareLayerRef.current) compareLayerRef.current.setParams({ TIME: compareIso });
  }, [compareIso]);

  // ── Clip: cortar o pane da comparação em pixels (funciona com pan/zoom) ──
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    const pane = map.getPane("comparePane");
    if (!pane) return;

    const updateClip = () => {
      const size = map.getSize();
      const nw = map.containerPointToLayerPoint([0, 0]);
      const se = map.containerPointToLayerPoint(size);
      const clipX = nw.x + (dividerPos / 100) * (se.x - nw.x);
      pane.style.clip = `rect(${nw.y}px, ${clipX}px, ${se.y}px, ${nw.x}px)`;
    };

    updateClip();
    map.on("move zoom resize", updateClip);
    return () => map.off("move zoom resize", updateClip);
  }, [dividerPos]);

  // ── Drag handlers (refs para evitar closures stale) ─────────────────────
  const dividerPosRef = useRef(dividerPos);
  useEffect(() => { dividerPosRef.current = dividerPos; }, [dividerPos]);

  const calcPos = useCallback((clientX) => {
    if (!containerRef.current) return dividerPosRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      onDividerChange(calcPos(x));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  }, [calcPos, onDividerChange]);

  const startDrag = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: 380 }}>
      <div
        id={containerId}
        style={{
          width: "100%", height: "100%",
          borderRadius: 0, overflow: "hidden", background: "#091522",
        }}
      />

      {/* ── Divisor vertical ──────────────────────────────────────────── */}
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        style={{
          position: "absolute", top: 0,
          left: `calc(${dividerPos}% - 16px)`,
          width: 32, height: "100%",
          zIndex: 997, cursor: "col-resize",
          display: "flex", alignItems: "center", justifyContent: "center",
          touchAction: "none",
        }}
      >
        {/* Linha do divisor */}
        <div style={{
          width: 2, height: "100%",
          background: "linear-gradient(180deg, transparent, #fbbf24 10%, #fbbf24 90%, transparent)",
          boxShadow: "0 0 8px rgba(251,191,36,0.4)",
        }} />
        {/* Handle central */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 28, height: 44,
          background: "rgba(0,0,0,0.75)", border: "2px solid #fbbf24",
          borderRadius: 8,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 3,
          backdropFilter: "blur(4px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
        }}>
          <span style={{ fontSize: 10, color: "#fbbf24", lineHeight: 1 }}>◂</span>
          <div style={{
            width: 3, height: 3, borderRadius: "50%",
            background: "#fbbf24", opacity: 0.6,
          }} />
          <span style={{ fontSize: 10, color: "#fbbf24", lineHeight: 1 }}>▸</span>
        </div>
      </div>
    </div>
  );
}

// ─── AnomaliaSSTCard ───────────────────────────────────────────────────────────
export function AnomaliaSSTCard({ className = "" }) {
  const [dividerPos, setDividerPos] = useState(50);
  const mapRef = useRef(null);

  const resetView = useCallback(() => {
    if (mapRef.current) mapRef.current.fitBounds(INITIAL_BOUNDS);
  }, []);

  // Datas calculadas automaticamente: hoje e 15 dias atrás (atualiza todo dia)
  const currentIso = getDateOffset(2);       // -2 para margem de disponibilidade GIBS
  const compareIso = getDateOffset(2 + DAYS_BACK);

  return (
    <section className={`sr-mod-card ${className}`} style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <div className="sr-mod-title">
          <span>🌡</span> Anomalia de TSM
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="sr-mod-badge">NASA GIBS</span>
          <span style={{ fontSize: 10, color: "var(--sr-text-muted)", fontWeight: 600 }}>
            Δ {DAYS_BACK} dias
          </span>
        </div>
      </div>

      {/* Mapa com divisor */}
      <div style={{ position: "relative" }}>
        <SSTMap
          currentIso={currentIso}
          compareIso={compareIso}
          dividerPos={dividerPos}
          onDividerChange={setDividerPos}
          mapRef={mapRef}
        />

        {/* Legenda de cores — canto superior esquerdo */}
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 999,
          background: "rgba(0,0,0,0.75)", borderRadius: 6,
          padding: "6px 10px", backdropFilter: "blur(4px)",
        }}>
          <div style={{
            fontSize: 9, color: "#94a3b8", marginBottom: 3,
            fontWeight: 700, letterSpacing: "0.04em",
          }}>
            ANOMALIA TSM (°C)
          </div>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {[
              ["#3b0764", "< -3"], ["#1d4ed8", "-2"], ["#60a5fa", "-1"],
              ["#e5e7eb", "0"], ["#f97316", "+1"], ["#dc2626", "+2"], ["#7f1d1d", "> +3"],
            ].map(([bg, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ width: 18, height: 8, background: bg, borderRadius: 1 }} />
                <div style={{ fontSize: 7, color: "#94a3b8", marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Niño 3.4 badge */}
        {/* Botão reset view */}
        <button
          type="button"
          onClick={resetView}
          title="Voltar à visualização inicial"
          style={{
            position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
            zIndex: 999, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 6, padding: "5px 10px", backdropFilter: "blur(4px)",
            fontSize: 10, color: "#fbbf24", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          ⌂ Reset
        </button>

        <div style={{
          position: "absolute", top: 10, right: 10, zIndex: 999,
          background: "rgba(0,0,0,0.75)", borderRadius: 6,
          padding: "4px 8px", backdropFilter: "blur(4px)",
          fontSize: 9, color: "#facc15", fontWeight: 700,
        }}>
          ⬛ Niño 3.4
        </div>

        {/* Label esquerda (data antiga — comparação) */}
        <div style={{
          position: "absolute", bottom: 10, left: 10, zIndex: 999,
          background: "rgba(0,0,0,0.75)", borderRadius: 6,
          padding: "5px 9px", backdropFilter: "blur(4px)",
          fontSize: 11, color: "#38bdf8", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ fontSize: 13 }}>◂</span>
          <span>{formatBR(compareIso)}</span>
        </div>

        {/* Label direita (data atual) */}
        <div style={{
          position: "absolute", bottom: 10, right: 10, zIndex: 999,
          background: "rgba(0,0,0,0.75)", borderRadius: 6,
          padding: "5px 9px", backdropFilter: "blur(4px)",
          fontSize: 11, color: "#4ade80", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span>{formatBR(currentIso)}</span>
          <span style={{ fontSize: 13 }}>▸</span>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        padding: "10px 16px", fontSize: 11,
        color: "var(--sr-text-muted)", lineHeight: 1.5,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>
          <strong style={{ color: "#f97316" }}>Laranja</strong> = El Niño •{" "}
          <strong style={{ color: "#60a5fa" }}>Azul</strong> = La Niña •{" "}
          Arraste o divisor para comparar
        </span>
        <a
          href={`https://worldview.earthdata.nasa.gov/?v=-170,-35,-40,20&l=${LAYER}&t=${currentIso}-T00:00:00Z`}
          target="_blank"
          rel="noreferrer"
          className="sr-btn-link"
          style={{ whiteSpace: "nowrap" }}
        >
          Worldview ↗
        </a>
      </div>
    </section>
  );
}

export default AnomaliaSSTCard;
