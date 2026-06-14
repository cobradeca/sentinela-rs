import { CondicoesVoo } from "../components/cards";

export function VooTab({ ctx }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ padding: "10px 14px", background: "rgba(8,145,178,0.05)", border: "1px solid rgba(8,145,178,0.25)", borderRadius: 8, color: "var(--sr-text-muted)", fontSize: 11, lineHeight: 1.6 }}>
        Leitura operacional do AWC/NOAA para aeródromos do corredor. Use como apoio tático e confirme em caso de operação crítica.
      </div>
      <CondicoesVoo compact={false} />
    </div>
  );
}
