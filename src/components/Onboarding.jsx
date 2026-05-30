/**
 * Onboarding — modal de boas-vindas exibido na primeira visita.
 * Armazenado em localStorage: "sentinela_rs_onboarding_v1".
 */
import { useState, useEffect } from "react";

export function Onboarding({ t, dark }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("sentinela_rs_onboarding_v1")) {
      setOpen(true);
    }
  }, []);

  function close() {
    localStorage.setItem("sentinela_rs_onboarding_v1", "1");
    setOpen(false);
  }

  if (!open) return null;

  const overlay = {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(2,6,13,0.88)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16,
  };
  const box = {
    background: dark ? "#07111d" : "#f8fafc",
    border: `1px solid ${dark ? "rgba(34,211,238,0.25)" : "rgba(8,145,178,0.2)"}`,
    borderRadius: 8, padding: "24px 20px",
    maxWidth: 420, width: "100%",
    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Sobre o Sentinela·RS">
      <div style={box}>
        <div style={{ fontSize: 11, color: t.accent, letterSpacing: 2, marginBottom: 6 }}>SENTINELA·RS</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: t.text, marginBottom: 12 }}>
          Painel de monitoramento climático do RS
        </div>
        <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.7, marginBottom: 16 }}>
          Este app agrega dados de fontes oficiais — INMET, CEMADEN, ANA, Defesa Civil RS, NOAA, Copernicus — para auxiliar no acompanhamento de condições climáticas e hidrológicas no Rio Grande do Sul.
        </div>
        <div style={{ fontSize: 11, color: dark ? "#fef08a" : "#854d0e", background: dark ? "rgba(234,179,8,0.08)" : "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 5, padding: "10px 12px", marginBottom: 16, lineHeight: 1.6 }}>
          <strong>⚠ Painel informativo.</strong> Não substitui alertas oficiais.<br />
          Emergências:{" "}
          <a href="tel:199" style={{ color: dark ? "#fbbf24" : "#92400e", fontWeight: 700 }}>199 Defesa Civil</a>
          {" · "}
          <a href="tel:193" style={{ color: dark ? "#fbbf24" : "#92400e", fontWeight: 700 }}>193 Bombeiros</a>
          {" · "}
          <a href="https://www.defesacivil.rs.gov.br/" target="_blank" rel="noreferrer" style={{ color: dark ? "#fbbf24" : "#92400e", fontWeight: 700 }}>defesacivil.rs.gov.br</a>
        </div>
        <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
          <strong style={{ color: t.text }}>Fontes principais:</strong> Open-Meteo · INMET · CEMADEN · RADAR Lagoa dos Patos · HidroSens/UFPel · ANA HidroWeb · NOAA/CPC · IRI/CCSR · CPTEC/INPE · Defesa Civil RS · INPE Queimadas · Copernicus Sentinel-1/2/EMS.
        </div>
        <button
          onClick={close}
          style={{
            width: "100%", padding: "10px 0",
            background: t.accent, color: "#000",
            border: "none", borderRadius: 5,
            fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Entendi — abrir o painel
        </button>
      </div>
    </div>
  );
}
