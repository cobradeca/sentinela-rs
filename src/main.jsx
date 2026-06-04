import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/sentinela-ui.css";
import SentinelaRS from "./App.jsx";

function renderFatal(message) {
  const root = document.getElementById("root");
  if (!root) return;
  const safeMessage = String(message)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;color:#e2e8f0;font-family:monospace;padding:20px;">
      <div style="max-width:680px;border:1px solid #334155;border-radius:8px;padding:16px;background:#0f172a;">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Falha ao carregar o Sentinela-RS</div>
        <div style="font-size:14px;opacity:.9;line-height:1.5;">${safeMessage}</div>
        <div style="font-size:12px;opacity:.7;margin-top:12px;">Atualize a página (Ctrl+F5). Se persistir, envie este texto para diagnóstico.</div>
      </div>
    </div>
  `;
}

window.addEventListener("error", (event) => {
  renderFatal(`Erro de runtime: ${event?.message || "indefinido"}`);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason;
  const text = typeof reason === "string" ? reason : reason?.message || "promessa rejeitada sem detalhe";
  renderFatal(`Erro assíncrono: ${text}`);
});

async function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!location.pathname.startsWith("/sentinela-rs/")) return;

  try {
    await navigator.serviceWorker.register("/sentinela-rs/sw.js", {
      scope: "/sentinela-rs/",
    });
  } catch {
    // PWA registration is best-effort; the app must still open if the browser blocks it.
  }
}

registerPwaServiceWorker();

try {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <SentinelaRS />
    </StrictMode>
  );
} catch (err) {
  renderFatal(`Erro de inicialização: ${err?.message || "desconhecido"}`);
}
