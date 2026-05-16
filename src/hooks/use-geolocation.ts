import { useEffect, useState } from "react";

const LUANDA: [number, number] = [-8.838, 13.234];

export function useGeolocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!cancelled) setPosition([p.coords.latitude, p.coords.longitude]);
      },
      () => {
        if (!cancelled) setDenied(true);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { position, denied, fallback: LUANDA };
}
