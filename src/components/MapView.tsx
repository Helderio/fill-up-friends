import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "@tanstack/react-router";
import type { StationWithStatus, LatestStatus } from "@/lib/stations.functions";

const LUANDA: [number, number] = [-8.838, 13.234];

function dominant(s: StationWithStatus): "disponivel" | "pouco" | "sem_stock" | "unknown" {
  const items = [s.gasolina, s.gasoleo].filter(Boolean) as LatestStatus[];
  if (items.length === 0) return "unknown";
  if (items.some((x) => x.status === "disponivel")) return "disponivel";
  if (items.some((x) => x.status === "pouco")) return "pouco";
  return "sem_stock";
}

const COLOR_MAP = {
  disponivel: "#22C55E",
  pouco: "#F59E0B",
  sem_stock: "#EF4444",
  unknown: "#94A3B8",
};

function makeIcon(status: keyof typeof COLOR_MAP) {
  const color = COLOR_MAP[status];
  const html = `
    <span style="position:relative;display:block;width:32px;height:32px;">
      <span style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:.25;"></span>
      <span style="position:absolute;inset:6px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px white;"></span>
    </span>`;
  return L.divIcon({
    className: "abastece-pin",
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (center && !done.current) {
      map.setView(center, 13);
      done.current = true;
    }
  }, [center, map]);
  return null;
}

export function MapView({
  stations,
  userPosition,
  height = "100%",
}: {
  stations: StationWithStatus[];
  userPosition: [number, number] | null;
  height?: string;
}) {
  const center = userPosition ?? LUANDA;

  return (
    <div style={{ height, width: "100%" }} className="relative">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={userPosition} />
        {userPosition && (
          <Marker
            position={userPosition}
            icon={L.divIcon({
              className: "abastece-user",
              html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#0F172A;box-shadow:0 0 0 4px rgba(15,23,42,.2),0 0 0 6px white;"></span>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            })}
          />
        )}
        {stations.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={makeIcon(dominant(s))}>
            <Popup>
              <div className="font-sans">
                <p className="font-bold text-sm">{s.name}</p>
                {s.address && <p className="text-xs text-slate-500">{s.address}</p>}
                <Link
                  to="/postos/$stationId"
                  params={{ stationId: s.id }}
                  className="mt-2 inline-block text-xs font-semibold text-[#F97316] underline"
                >
                  Ver detalhes →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-[400] rounded-xl bg-card/95 p-3 shadow-xl backdrop-blur-sm border border-border flex flex-col gap-1.5 text-foreground">
        <Legend color="#22C55E" label="DISPONÍVEL" />
        <Legend color="#F59E0B" label="POUCO STOCK" />
        <Legend color="#EF4444" label="SEM STOCK" />
        <Legend color="#94A3B8" label="SEM DADOS" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold">
      <span style={{ background: color }} className="block size-2.5 rounded-full" />
      <span>{label}</span>
    </div>
  );
}
