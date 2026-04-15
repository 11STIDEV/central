import { useRef, useCallback } from "react";

/**
 * Gera um chime (sino suave) sintético com Web Audio API.
 * Dois tons ascendentes curtos — sem dependência de arquivo de áudio.
 */
export function useChimeSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    const frequencies = [523.25, 659.25]; // C5 → E5
    const noteDuration = 0.15;
    const gap = 0.08;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const start = now + i * (noteDuration + gap);
      const end = start + noteDuration;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, end);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(end + 0.05);
    });
  }, []);

  return { playChime };
}
