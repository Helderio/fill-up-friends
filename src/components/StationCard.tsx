import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { StationWithStatus, LatestStatus } from "@/lib/stations.functions";
import { StatusBar, StatusLabel } from "./StatusBadge";
import { formatKz, formatQueue, formatRelativePt } from "@/lib/format";
import { cn } from "@/lib/utils";

function dominantStatus(s: StationWithStatus): "disponivel" | "pouco" | "sem_stock" | "unknown" {
  const items = [s.gasolina, s.gasoleo].filter(Boolean) as LatestStatus[];
  if (items.length === 0) return "unknown";
  if (items.some((x) => x.status === "disponivel")) return "disponivel";
  if (items.some((x) => x.status === "pouco")) return "pouco";
  return "sem_stock";
}

export function StationCard({
  station,
  distanceKm,
}: {
  station: StationWithStatus;
  distanceKm?: number | null;
}) {
  const status = dominantStatus(station);
  const muted = status === "sem_stock" || status === "unknown";
  const best = station.gasolina ?? station.gasoleo;

  return (
    <Link
      to="/postos/$stationId"
      params={{ stationId: station.id }}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md",
        muted && "opacity-90",
      )}
    >
      <StatusBar status={status} className="absolute top-0 inset-x-0" />
      <div className="p-4 pt-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-bold text-foreground truncate">{station.name}</h4>
            <p className="text-xs text-muted-foreground truncate">
              {station.address ?? station.province}
              {distanceKm != null && (
                <span className="ml-1 font-mono">· {distanceKm.toFixed(1)} km</span>
              )}
            </p>
          </div>
          <StatusLabel status={status} />
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-3">
          <Field label="Preço" value={formatKz(best?.priceKz ?? null)} />
          <Field label="Fila est." value={formatQueue(best?.queueMinutes ?? null)} />
          <Field
            label="Atualizado"
            value={best ? formatRelativePt(best.reportedAt) : "—"}
          />
        </div>
      </div>
    </Link>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-bold text-foreground truncate">{value}</p>
    </div>
  );
}
