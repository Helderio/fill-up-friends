import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { ArrowLeft, Fuel } from "lucide-react";
import { toast } from "sonner";
import { listStations, submitReport } from "@/lib/stations.functions";
import { FUEL_TYPES, STATUSES, fuelLabel, statusLabel, DEFAULT_FUEL_PRICES } from "@/lib/schemas";
import { getDeviceId } from "@/lib/device-id";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ stationId: z.string().uuid().optional() });

export const Route = createFileRoute("/reportar")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Reportar — Abastece.ao" }] }),
  component: ReportarPage,
});

type FuelKey = (typeof FUEL_TYPES)[number];

type FuelEntry = {
  enabled: boolean;
  status: (typeof STATUSES)[number];
  price: string;
  queue: string;
};

const emptyEntry: FuelEntry = {
  enabled: false,
  status: "disponivel",
  price: "",
  queue: "",
};

function ReportarPage() {
  const { stationId: pre } = useSearch({ from: "/reportar" });
  const navigate = useNavigate();

  const [stationId, setStationId] = useState<string>(pre ?? "");
  const [entries, setEntries] = useState<Record<FuelKey, FuelEntry>>({
    gasolina: { ...emptyEntry, enabled: true },
    gasoleo: { ...emptyEntry },
  });
  const [busy, setBusy] = useState(false);

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: () => listStations(),
  });

  function update(fuel: FuelKey, patch: Partial<FuelEntry>) {
    setEntries((prev) => ({ ...prev, [fuel]: { ...prev[fuel], ...patch } }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stationId) {
      toast.error("Escolhe um posto");
      return;
    }
    const selected = FUEL_TYPES.filter((f) => entries[f].enabled);
    if (selected.length === 0) {
      toast.error("Seleciona pelo menos um combustível");
      return;
    }

    setBusy(true);
    try {
      const deviceId = getDeviceId();
      const results = await Promise.allSettled(
        selected.map((f) => {
          const entry = entries[f];
          return submitReport({
            data: {
              stationId,
              fuelType: f,
              status: entry.status,
              priceKz: entry.price ? Number(entry.price) : null,
              queueMinutes: entry.queue ? Number(entry.queue) : null,
              deviceId,
            },
          });
        }),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === selected.length) {
        const first = failed[0] as PromiseRejectedResult;
        throw first.reason instanceof Error ? first.reason : new Error("Erro ao enviar");
      }
      if (failed.length > 0) {
        toast.warning(`Enviado ${selected.length - failed.length}/${selected.length} reportes.`);
      } else {
        toast.success(
          selected.length === 2
            ? "Obrigado! Reportes de gasolina e gasóleo enviados."
            : "Obrigado! Reporte enviado.",
        );
      }
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

        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Combustíveis a reportar
          </p>
          {FUEL_TYPES.map((f) => (
            <FuelSection
              key={f}
              fuel={f}
              entry={entries[f]}
              onToggle={(enabled) => update(f, { enabled })}
              onChange={(patch) => update(f, patch)}
            />
          ))}
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

function FuelSection({
  fuel,
  entry,
  onToggle,
  onChange,
}: {
  fuel: FuelKey;
  entry: FuelEntry;
  onToggle: (enabled: boolean) => void;
  onChange: (patch: Partial<FuelEntry>) => void;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border-2 transition",
        entry.enabled ? "border-primary/40 bg-card" : "border-border bg-muted/30",
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(!entry.enabled)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          <Fuel className="size-4" />
          {fuelLabel[fuel]}
        </span>
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
            entry.enabled
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {entry.enabled ? "Incluído" : "Tocar para incluir"}
        </span>
      </button>

      {entry.enabled && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <span className="block mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Estado
            </span>
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ status: s })}
                  className={cn(
                    "rounded-xl border-2 px-2 py-3 text-xs font-bold uppercase tracking-tight transition",
                    entry.status === s
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Preço (Kz/L) · ref. ${DEFAULT_FUEL_PRICES[fuel]}`}>
              <input
                type="number"
                inputMode="numeric"
                value={entry.price}
                onChange={(e) => onChange({ price: e.target.value })}
                placeholder={String(DEFAULT_FUEL_PRICES[fuel])}
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-mono"
              />
            </Field>
            <Field label="Fila (min)">
              <input
                type="number"
                inputMode="numeric"
                value={entry.queue}
                onChange={(e) => onChange({ queue: e.target.value })}
                placeholder="15"
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-mono"
              />
            </Field>
          </div>
        </div>
      )}
    </section>
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
