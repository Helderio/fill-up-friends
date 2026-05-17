import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { listStations, submitReport } from "@/lib/stations.functions";
import { FUEL_TYPES, STATUSES, fuelLabel, statusLabel } from "@/lib/schemas";
import { getDeviceId } from "@/lib/device-id";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ stationId: z.string().uuid().optional() });

export const Route = createFileRoute("/reportar")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Reportar — Abastece.ao" }] }),
  component: ReportarPage,
});

function ReportarPage() {
  const { stationId: pre } = useSearch({ from: "/reportar" });
  const navigate = useNavigate();
  const submit = useServerFn(submitReport);

  const [stationId, setStationId] = useState<string>(pre ?? "");
  const [fuel, setFuel] = useState<(typeof FUEL_TYPES)[number]>("gasolina");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("disponivel");
  const [price, setPrice] = useState<string>("");
  const [queue, setQueue] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: () => listStations(),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stationId) {
      toast.error("Escolhe um posto");
      return;
    }
    setBusy(true);
    try {
      await submit({
        data: {
          stationId,
          fuelType: fuel,
          status,
          priceKz: price ? Number(price) : null,
          queueMinutes: queue ? Number(queue) : null,
          deviceId: getDeviceId(),
        },
      });
      toast.success("Obrigado! Reporte enviado.");
      navigate({ to: "/postos/$stationId", params: { stationId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link to="/" className="size-9 grid place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold">Reportar estado</h1>
      </header>

      <form onSubmit={onSubmit} className="p-4 space-y-6">
        <Field label="Posto">
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
          >
            <option value="">— Escolher posto —</option>
            {stations?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.address ?? s.province}
              </option>
            ))}
          </select>
          <Link
            to="/postos/novo"
            className="mt-2 inline-block text-xs font-semibold text-primary"
          >
            + Não vejo o meu posto
          </Link>
        </Field>

        <Field label="Combustível">
          <div className="grid grid-cols-2 gap-2">
            {FUEL_TYPES.map((f) => (
              <Pill key={f} active={fuel === f} onClick={() => setFuel(f)}>
                {fuelLabel[f]}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label="Estado">
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-xl border-2 px-2 py-3 text-xs font-bold uppercase tracking-tight transition",
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
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço (Kz/L)">
            <input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="160"
              className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-mono"
            />
          </Field>
          <Field label="Fila (min)">
            <input
              type="number"
              inputMode="numeric"
              value={queue}
              onChange={(e) => setQueue(e.target.value)}
              placeholder="15"
              className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-mono"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {busy ? "A enviar…" : "ENVIAR REPORTE"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Não precisas de conta para reportar. Obrigado por contribuíres!
        </p>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 px-3 py-3 text-sm font-bold transition",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
