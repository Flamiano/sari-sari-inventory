// app/utils/useIdleTimeout.ts
"use client";

import { useEffect, useRef, useCallback } from "react";

const IDLE_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "touchmove",
  "wheel",
  "scroll",
  "click",
];

interface UseIdleTimeoutOptions {
  /** Idle duration in milliseconds before onIdle fires. Default: 5 minutes */
  timeoutMs?: number;
  /** Called once the user has been idle for `timeoutMs` */
  onIdle: () => void;
  /** Pass true to pause the timer (e.g. while auth is still loading) */
  disabled?: boolean;
}

export function useIdleTimeout({
  timeoutMs = 5 * 60 * 1000,
  onIdle,
  disabled = false,
}: UseIdleTimeoutOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep onIdle ref current so we never need to re-run the main effect
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  // Resets (or starts) the countdown
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onIdleRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (disabled) {
      // Pause: clear any running timer
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Start immediately when enabled
    resetTimer();

    // Each activity event restarts the countdown from zero
    const handleActivity = () => resetTimer();

    IDLE_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [disabled, resetTimer]);
}
