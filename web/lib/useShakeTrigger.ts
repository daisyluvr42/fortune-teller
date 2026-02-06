"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PermissionState = "unknown" | "granted" | "denied" | "not-required";

interface ShakeOptions {
  onTrigger: () => void;
  threshold?: number; // acceleration magnitude threshold
  cooldownMs?: number; // minimum interval between triggers
}

interface ShakeControls {
  isSupported: boolean;
  isListening: boolean;
  permissionState: PermissionState;
  requestPermission: () => Promise<PermissionState>;
  start: () => void;
  stop: () => void;
}

export function useShakeTrigger(options: ShakeOptions): ShakeControls {
  const { onTrigger, threshold = 18, cooldownMs = 2000 } = options;
  const [isListening, setIsListening] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const lastTriggerRef = useRef(0);
  const handlerRef = useRef<((event: DeviceMotionEvent) => void) | undefined>(undefined);

  const isSupported =
    typeof window !== "undefined" &&
    typeof window.DeviceMotionEvent !== "undefined";

  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isSupported) {
      setPermissionState("denied");
      return "denied";
    }

    const anyDeviceMotion = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (typeof anyDeviceMotion.requestPermission !== "function") {
      setPermissionState("not-required");
      return "not-required";
    }

    try {
      const result = await anyDeviceMotion.requestPermission();
      const state: PermissionState = result === "granted" ? "granted" : "denied";
      setPermissionState(state);
      return state;
    } catch {
      setPermissionState("denied");
      return "denied";
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!handlerRef.current || !isListening) return;
    window.removeEventListener("devicemotion", handlerRef.current);
    setIsListening(false);
  }, [isListening]);

  const start = useCallback(() => {
    if (!isSupported || isListening) return;
    if (permissionState === "denied") return;

    handlerRef.current = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      const now = Date.now();
      if (magnitude >= threshold && now - lastTriggerRef.current >= cooldownMs) {
        lastTriggerRef.current = now;
        onTrigger();
      }
    };

    window.addEventListener("devicemotion", handlerRef.current, { passive: true });
    setIsListening(true);
  }, [cooldownMs, isListening, isSupported, onTrigger, permissionState, threshold]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    isSupported,
    isListening,
    permissionState,
    requestPermission,
    start,
    stop,
  };
}
