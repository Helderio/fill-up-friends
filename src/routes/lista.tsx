import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listStations } from "@/lib/stations.functions";
import { StationCard } from "@/components/StationCard";
import { useGeolocation } from "@/hooks/use-geolocation";
import { distanceKm } from "@/lib/format";
import { FUEL_TYPES, fuelLabel } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lista")({
  head: () => ({
    meta: [
      { title: "Lista de postos — Abastece.ao" },
      { name: "description", content: "Lista completa de postos próximos com filtros." },
    ],
  }),
  component: ListaPage,
});

function ListaPage() {
  const { position } = useGeolocation();
  const [fuel, setFuel] = useState<"gasolina" | "gasoleo" | "all">("all");
  const [radius, setRadius] = useState<number>(25);

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: () => listStations(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    if (!stations) return [];
    const origin = position ?? [-8.838, 13.234];
    return stations
      .map((s) => ({ s, d: distanceKm(origin[0], origin[1], s.lat, s.lng) }))
      .filter(({ s, d }) => {
        if (d > radius) return false;
        if (fuel !== "all" && !(fuel === "gasolina" ? s.gasolina : s.gasoleo)) {
          // include even if no data — but if user filters by fuel they want availability info
        }
        return true;
      })
      .sort((a, b) => a.d - b.d);
  }, [stations, position, fuel, radius]);

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md px-4 py-3">
        <h1 className="text-lg font-bold">Postos próximos</h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["all", ...FUEL_TYPES] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFuel(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                fuel === f
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {f === "all" ? "Todos" : fuelLabel[f]}
            </button>
          ))}
          <div className="ml-auto flex gap-1.5">
            {[5, 10, 25, 100].map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  radius === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {r === 100 ? "Tudo" : `${r}km`}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="space-y-3 p-4">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Nenhum posto encontrado nestes filtros.
          </p>
        ) : (
          filtered.map(({ s, d }) => <StationCard key={s.id} station={s} distanceKm={d} />)
        )}
      </div>
    </div>
  );
}
