import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { Fuel, MapPin } from "lucide-react";
import { listStations } from "@/lib/stations.functions";
import { StationCard } from "@/components/StationCard";
import { useGeolocation } from "@/hooks/use-geolocation";
import { distanceKm } from "@/lib/format";
import { fuelLabel, FUEL_TYPES } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const MapView = lazy(() =>
  import("@/components/MapView").then((m) => ({ default: m.MapView })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapa — Abastece.ao" },
      {
        name: "description",
        content: "Mapa em tempo real de postos com gasolina e gasóleo em Luanda.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { position } = useGeolocation();
  const [fuel, setFuel] = useState<"gasolina" | "gasoleo">("gasolina");

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: () => listStations(),
    refetchInterval: 60_000,
  });

  const sorted = useMemo(() => {
    if (!stations) return [];
    const origin = position ?? [-8.838, 13.234];
    return [...stations]
      .map((s) => ({ s, d: distanceKm(origin[0], origin[1], s.lat, s.lng) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);
  }, [stations, position]);

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary grid place-items-center text-primary-foreground font-extrabold">
              A
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight uppercase leading-none">
                Abastece.ao
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Luanda · ao vivo
              </p>
            </div>
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            Entrar
          </Link>
        </div>

        <div className="flex gap-1.5 px-4 pb-3">
          {FUEL_TYPES.map((f) => (
            <button
              key={f}
              onClick={() => setFuel(f)}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                fuel === f
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              <Fuel className="size-3.5" />
              {fuelLabel[f]}
            </button>
          ))}
        </div>
      </header>

      <section className="relative h-[55vh] min-h-[320px]">
        <Suspense
          fallback={
            <div className="grid h-full place-items-center text-xs text-muted-foreground">
              A carregar mapa…
            </div>
          }
        >
          <MapView stations={stations ?? []} userPosition={position} />
        </Suspense>
      </section>

      <section className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Postos próximos
          </h2>
          <Link to="/lista" className="text-xs font-semibold text-primary">
            Ver tudo →
          </Link>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <MapPin className="mx-auto mb-2 size-5" />
            A carregar postos…
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(({ s, d }) => (
              <StationCard key={s.id} station={s} distanceKm={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
