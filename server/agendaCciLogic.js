/** Lógica espelhada da agenda (tolerância de fim) para o worker Node. */

export const TOLERANCIA_FIM_MIN = 10;

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function fimReservaComTolerancia(fim, tolMin = TOLERANCIA_FIM_MIN) {
  let total = toMinutes(fim) + tolMin;
  const max = 24 * 60;
  if (total > max) total = max;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * @param {string} deviceId
 * @param {Array<Record<string, unknown>>} reservas
 * @param {string} ymd
 * @param {number} minutesNow
 */
export function estaEmJanelaReservaAtiva(deviceId, reservas, ymd, minutesNow) {
  if (!Array.isArray(reservas)) return false;
  for (const r of reservas) {
    if (r.tipo !== "chromebook" || r.status !== "ativa") continue;
    if (r.data !== ymd) continue;
    const ids = r.chromebookIds;
    if (!Array.isArray(ids) || !ids.includes(deviceId)) continue;
    const ini = toMinutes(String(r.inicio || "00:00"));
    const fimT = toMinutes(fimReservaComTolerancia(String(r.fim || "00:00")));
    if (minutesNow >= ini && minutesNow < fimT) return true;
  }
  return false;
}

/**
 * @param {string} timeZone IANA, ex.: America/Sao_Paulo
 */
export function agoraLocalParts(timeZone) {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const y = get("year");
  const mo = get("month");
  const day = get("day");
  const hh = get("hour");
  const mm = get("minute");
  const ymd = `${y}-${mo}-${day}`;
  const minutes = parseInt(hh, 10) * 60 + parseInt(mm, 10);
  return { ymd, minutes };
}

export function dispositivoEstaDisabled(device) {
  const s = String(device?.status || "").toUpperCase();
  return s === "DISABLED";
}
