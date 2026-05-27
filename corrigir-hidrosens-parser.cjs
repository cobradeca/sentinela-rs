const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "supabase", "functions", "hidrosens-laranjal", "index.ts");

if (!fs.existsSync(filePath)) {
  console.error("ERRO: não encontrei supabase/functions/hidrosens-laranjal/index.ts");
  process.exit(1);
}

let src = fs.readFileSync(filePath, "utf8");
const backup = path.join(process.cwd(), "supabase", "functions", "hidrosens-laranjal", "index.ts.backup-parser-robusto");
if (!fs.existsSync(backup)) fs.writeFileSync(backup, src, "utf8");

const oldFn = `function extractDistanceMeters(payloadValue: unknown): number | null {
  let text = "";

  try {
    if (typeof payloadValue === "string") {
      try {
        const parsed = JSON.parse(payloadValue);
        text = typeof parsed?.text === "string" ? parsed.text : payloadValue;
      } catch {
        text = payloadValue;
      }
    } else if (typeof payloadValue === "object" && payloadValue !== null) {
      text = JSON.stringify(payloadValue);
    } else {
      text = String(payloadValue ?? "");
    }
  } catch {
    return null;
  }

  const match = text.match(/Distance[^\\d]*([\\d.]+)/i);
  if (!match?.[1]) return null;

  const distance = Number(match[1]);
  return Number.isFinite(distance) ? distance : null;
}`;

const newFn = `function numberFromValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const match = normalized.match(/-?\\d+(?:\\.\\d+)?/);
    if (!match?.[0]) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function extractDistanceMeters(payloadValue: unknown): number | null {
  const seen = new Set<unknown>();

  function walk(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    if (typeof value === "object") {
      if (seen.has(value)) return null;
      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = walk(item);
          if (found !== null) return found;
        }
        return null;
      }

      const obj = value as Record<string, unknown>;

      // Campos estruturados possíveis do ThingsBoard/sensor.
      for (const key of [
        "distance_m",
        "distance",
        "Distance",
        "distancia",
        "distância",
        "Distancia",
        "Distância",
        "dist",
      ]) {
        if (key in obj) {
          const n = numberFromValue(obj[key]);
          if (n !== null) return n;
        }
      }

      // Alguns payloads vêm como JSON string dentro de text/value/payload.
      for (const key of ["text", "value", "payload", "data", "message"]) {
        if (typeof obj[key] === "string") {
          const found = walk(obj[key]);
          if (found !== null) return found;
        }
      }

      return null;
    }

    let text = String(value ?? "");

    // Se for JSON serializado, tenta parsear primeiro.
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        const found = walk(parsed);
        if (found !== null) return found;
      } catch {
        // segue como texto livre
      }
    }

    text = text.replace(",", ".");

    // Formatos esperados:
    // "WL-001: Distance 4.43 m"
    // "Distance: 4,43 m"
    // "Distancia 4.43m"
    // "Distância = 4,43 m"
    const distanceMatch = text.match(/(?:distance|dist[aâ]ncia|distancia|distância|dist)\\s*[:=\\-]?\\s*([0-9]+(?:\\.[0-9]+)?)/i);
    if (distanceMatch?.[1]) {
      const n = Number(distanceMatch[1]);
      if (Number.isFinite(n)) return n;
    }

    // Fallback textual seguro: se houver "m" e só um valor plausível depois de remover WL-001.
    const cleaned = text.replace(/WL-?\\d+/gi, "");
    const meterMatch = cleaned.match(/([0-9]+(?:\\.[0-9]+)?)\\s*m\\b/i);
    if (meterMatch?.[1]) {
      const n = Number(meterMatch[1]);
      if (Number.isFinite(n)) return n;
    }

    return null;
  }

  return walk(payloadValue);
}`;

if (!src.includes(oldFn)) {
  console.error("ERRO: função extractDistanceMeters original não encontrada. Nenhuma alteração feita.");
  process.exit(1);
}

src = src.replace(oldFn, newFn);
fs.writeFileSync(filePath, src, "utf8");

console.log("Parser HidroSens robusto aplicado.");
console.log("Backup:", path.relative(process.cwd(), backup));
console.log("");
console.log("Agora rode:");
console.log("supabase functions deploy hidrosens-laranjal --no-verify-jwt");
console.log("node scripts\\auditar-sitrep-hardcoded-fontes.cjs");
