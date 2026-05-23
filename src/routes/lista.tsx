import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listStations } from "@/lib/stations.functions";
import { StationCard } from "@/components/StationCard";
import { useGeolocation } from "@/hooks/use-geolocation";
import { distanceKm } from "@/lib/format";
import { FUEL_TYPES, fuelLabel, PROVINCES, isBrandMatch } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";

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
  const [province, setProvince] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: () => listStations(),
    refetchInterval: 60_000,
  });

  const availableProvinces = useMemo(() => {
    if (!stations) return [];
    const set = new Set(stations.map((s) => s.province));
    return Array.from(set).sort();
  }, [stations]);

  const filtered = useMemo(() => {
    if (!stations) return [];
    const origin = position ?? [-8.838, 13.234];
    return stations
      .map((s) => ({ s, d: distanceKm(origin[0], origin[1], s.lat, s.lng) }))
      .filter(({ s, d }) => {
        if (d > radius) return false;
        if (province !== "all" && s.province !== province) return false;
        if (brand !== "all" && !isBrandMatch(s.brand, brand)) return false;
        return true;
      })
      .sort((a, b) => a.d - b.d);
  }, [stations, position, fuel, radius, province, brand]);

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Postos próximos</h1>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              showFilters ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            Filtros
          </button>
        </div>

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

        {showFilters && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap gap-1.5">
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Todas as províncias</option>
                {availableProvinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {["all", "Sonangol", "Pumangol", "TotalEnergies", "independente"].map((b) => (
                <button
                  key={b}
                  onClick={() => setBrand(b)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    brand === b
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {b === "all" ? "Todos operadores" : b === "independente" ? "Independente" : b}
                </button>
              ))}
            </div>
          </div>
        )}
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
