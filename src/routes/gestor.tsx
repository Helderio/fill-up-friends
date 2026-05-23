import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyManagedStations,
  submitOfficialReport,
} from "@/lib/stations.functions";
import { FUEL_TYPES, STATUSES, fuelLabel, statusLabel, DEFAULT_FUEL_PRICES } from "@/lib/schemas";
import { formatKz, formatQueue, formatRelativePt } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gestor")({
  head: () => ({ meta: [{ title: "Gestor — Abastece.ao" }] }),
  component: GestorPage,
});

function GestorPage() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["my-managed-stations"],
    queryFn: () => listMyManagedStations(),
    enabled: hasSession === true,
  });

  if (hasSession === null) {
    return <p className="p-8 text-center text-sm text-muted-foreground">A carregar…</p>;
  }

  if (hasSession === false) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="mx-auto size-16 rounded-full bg-muted grid place-items-center">
          <Building2 className="size-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold">Área do gestor</h1>
        <p className="text-sm text-muted-foreground">
          Para gerir um posto precisas de iniciar sessão.
        </p>
        <Link
          to="/login"
          className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold inline-flex items-center gap-2">
          <Building2 className="size-5 text-primary" /> Os meus postos
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">A carregar…</p>
        )}

        {data && data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Ainda não tens postos atribuídos.
            </p>
            <button
              onClick={() => navigate({ to: "/gestor/pedir" })}
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
            >
              Pedir acesso a um posto
            </button>
          </div>
        )}

        {data?.map((row) =>
          row.station ? (
            <ManagedStationCard
              key={row.station.id}
              row={row as ManagedRow}
            />
          ) : null,
        )}

        {data && data.length > 0 && (
          <Link
            to="/gestor/pedir"
            className="block text-center text-xs font-semibold text-primary py-2"
          >
            + Pedir acesso a outro posto
          </Link>
        )}
      </div>
    </div>
  );
}

type ManagedRow = {
  role: "owner" | "staff";
  station: { id: string; name: string; address: string | null; province: string };
  gasolina: { status: string; priceKz: number | null; queueMinutes: number | null; reportedAt: string; source: string } | null;
  gasoleo: { status: string; priceKz: number | null; queueMinutes: number | null; reportedAt: string; source: string } | null;
};

function ManagedStationCard({ row }: { row: ManagedRow }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitOfficialReport);

  const [fuel, setFuel] = useState<(typeof FUEL_TYPES)[number]>("gasolina");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("disponivel");
  const [price, setPrice] = useState("");
  const [queue, setQueue] = useState("");
  const [busy, setBusy] = useState(false);

  const current = fuel === "gasolina" ? row.gasolina : row.gasoleo;

  async function send(forceStatus?: (typeof STATUSES)[number]) {
    setBusy(true);
    try {
      await submit({
        data: {
          stationId: row.station.id,
          fuelType: fuel,
          status: forceStatus ?? status,
          priceKz: price ? Number(price) : null,
          queueMinutes: queue ? Number(queue) : null,
        },
      });
      toast.success("Atualização oficial enviada");
      setPrice("");
      setQueue("");
      qc.invalidateQueries({ queryKey: ["my-managed-stations"] });
      qc.invalidateQueries({ queryKey: ["stations"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{row.station.name}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
            <ShieldCheck className="size-3" />
            {row.role === "owner" ? "Proprietário" : "Funcionário"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {row.station.address ?? row.station.province}
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {FUEL_TYPES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFuel(f)}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-sm font-bold transition",
                fuel === f
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {fuelLabel[f]}
            </button>
          ))}
        </div>

        {current && (
          <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Atual:{" "}
            <span className="font-mono font-bold">
              {statusLabel[current.status as keyof typeof statusLabel]}
            </span>
            {" · "}
            {formatKz(current.priceKz)} · {formatQueue(current.queueMinutes)} ·{" "}
            {formatRelativePt(current.reportedAt)}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-xl border-2 px-2 py-3 text-xs font-bold uppercase tracking-tight",
                status === s
                  ? s === "disponivel"
                    ? "border-status-green bg-status-green-soft text-status-green"
                    : s === "pouco"
                      ? "border-status-amber bg-status-amber-soft text-status-amber"
                      : "border-status-red bg-status-red-soft text-status-red"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Preço (Kz/L)"
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-mono"
          />
          <input
            type="number"
            inputMode="numeric"
            value={queue}
            onChange={(e) => setQueue(e.target.value)}
            placeholder="Fila (min)"
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-mono"
          />
        </div>

        <button
          onClick={() => send()}
          disabled={busy}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "A enviar…" : "ATUALIZAR STOCK"}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => send("sem_stock")}
            disabled={busy}
            className="rounded-xl border-2 border-status-red bg-status-red-soft py-2.5 text-xs font-bold uppercase tracking-tight text-status-red disabled:opacity-50"
          >
            Marcar esgotado
          </button>
          <button
            onClick={() => send("disponivel")}
            disabled={busy}
            className="rounded-xl border-2 border-status-green bg-status-green-soft py-2.5 text-xs font-bold uppercase tracking-tight text-status-green disabled:opacity-50"
          >
            Marcar reposto
          </button>
        </div>

        <Link
          to="/postos/$stationId"
          params={{ stationId: row.station.id }}
          className="block text-center text-xs font-semibold text-primary"
        >
          Ver histórico do posto →
        </Link>
      </div>
    </div>
  );
}

// re-export so __root nav doesn't have to import ArrowLeft separately
export { ArrowLeft };
