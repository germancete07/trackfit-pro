"use client";

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";

export interface TimerState {
  duration: number;
  remaining: number;
  running: boolean;
  done: boolean;
}

interface TimerContextValue {
  timer: TimerState | null;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  dismiss: () => void;
}

const TimerCtx = createContext<TimerContextValue>({
  timer: null,
  start: () => {},
  pause: () => {},
  resume: () => {},
  dismiss: () => {},
});

export function useTimer() {
  return useContext(TimerCtx);
}

function playDone() {
  // Vibration: 3 pulses
  try { navigator.vibrate?.([200, 100, 200, 100, 200]); } catch {}

  // Sound: 3 beeps
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.35, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.28);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => ctx.close(), 2500);
  } catch {}
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTick() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  function tick() {
    setTimer((prev) => {
      if (!prev || !prev.running) return prev;
      const next = prev.remaining - 1;
      if (next <= 0) {
        clearTick();
        playDone();
        return { ...prev, remaining: 0, running: false, done: true };
      }
      return { ...prev, remaining: next };
    });
  }

  const start = useCallback((seconds: number) => {
    clearTick();
    setTimer({ duration: seconds, remaining: seconds, running: true, done: false });
    intervalRef.current = setInterval(tick, 1000);
  }, []);

  const pause = useCallback(() => {
    clearTick();
    setTimer((prev) => prev ? { ...prev, running: false } : null);
  }, []);

  const resume = useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.done) return prev;
      intervalRef.current = setInterval(tick, 1000);
      return { ...prev, running: true };
    });
  }, []);

  const dismiss = useCallback(() => {
    clearTick();
    setTimer(null);
  }, []);

  return (
    <TimerCtx.Provider value={{ timer, start, pause, resume, dismiss }}>
      {children}
    </TimerCtx.Provider>
  );
}
