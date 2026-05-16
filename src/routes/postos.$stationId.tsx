import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import { getStationDetail } from "@/lib/stations.functions";
import { StatusBar, StatusLabel } from "@/components/StatusBadge";
import { formatKz, formatQueue, formatRelativePt } from "@/lib/format";
import { fuelLabel, statusLabel } from "@/lib/schemas";

export const Route = createFileRoute("/postos/$stationId")({
  head: ({ params }) => ({
    meta: [{ title: `Posto — Abastece.ao` }],
  }),
  component: StationDetailPage,
});

function StationDetailPage() {
  const { stationId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["station", stationId],
    queryFn: () => getStationDetail({ data: { stationId } }),
  });

  if (isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">A carregar…</p>;
  }
  if (error || !data) {
    return <p className="p-8 text-center text-sm text-destructive">Posto não encontrado.</p>;
  }

  const { station, reports } = data;
  const latestStatus = (() => {
    const latest = reports[0];
    if (!latest) return "unknown" as const;
    return latest.status as "disponivel" | "pouco" | "sem_stock";
  })();

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link to="/" className="size-9 grid place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-base font-bold truncate">{station.name}</h1>
      </header>

      <section className="relative overflow-hidden bg-card border-b border-border">
        <StatusBar status={latestStatus} className="absolute top-0 inset-x-0" />
        <div className="p-4 pt-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3" />
                {station.address ?? station.province}
              </p>
              {station.brand && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {station.brand}
                </p>
              )}
            </div>
            <StatusLabel status={latestStatus} />
          </div>
          <Link
            to="/reportar"
            search={{ stationId }}
            className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-bold text-primary-foreground"
          >
            Reportar este posto
          </Link>
        </div>
      </section>

      <section className="p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Histórico de reportes
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem reportes nas últimas horas. Sê o primeiro a reportar!
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {fuelLabel[r.fuel_type as "gasolina" | "gasoleo"]} ·{" "}
                    <span className="font-mono">{statusLabel[r.status as "disponivel" | "pouco" | "sem_stock"]}</span>
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatKz(r.price_kz)} · fila {formatQueue(r.queue_minutes)}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                  {formatRelativePt(r.created_at as unknown as string)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
