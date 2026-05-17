import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const LUANDA: [number, number] = [-8.838, 13.234];

const pin = L.divIcon({
  className: "abastece-picker",
  html: `<span style="display:block;width:28px;height:28px;border-radius:9999px;background:#F97316;box-shadow:0 0 0 4px white,0 4px 12px rgba(0,0,0,.25);"></span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ to }: { to: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.setView(to, 15);
  }, [to, map]);
  return null;
}

export function LocationPicker({
  value,
  initial,
  onChange,
}: {
  value: [number, number] | null;
  initial?: [number, number] | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const center = value ?? initial ?? LUANDA;

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-border" style={{ height: 280 }}>
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onPick={onChange} />
          <FlyTo to={flyTarget} />
          {value && <Marker position={value} icon={pin} />}
        </MapContainer>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition((pos) => {
            const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            onChange(c[0], c[1]);
            setFlyTarget(c);
          });
        }}
        className="absolute top-2 right-2 z-[400] rounded-full bg-card/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider shadow-md border border-border"
      >
        Usar GPS
      </button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Toca no mapa para marcar a localização exata do posto.
      </p>
    </div>
  );
}
