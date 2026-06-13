import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getStoredUser } from "@/lib/auth";
import {
  listMyManagerRequests,
  listStations,
  requestManagerAccess,
} from "@/lib/stations.functions";

export const Route = createFileRoute("/gestor/pedir")({
  head: () => ({ meta: [{ title: "Pedir acesso de gestor — Abastece.ao" }] }),
  component: PedirPage,
});

function PedirPage() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    setHasSession(!!getStoredUser());
  }, []);

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: () => listStations(),
  });
  const { data: requests } = useQuery({
    queryKey: ["my-manager-requests"],
    queryFn: () => listMyManagerRequests(),
    enabled: hasSession === true,
  });

  const [stationId, setStationId] = useState("");
  const [hint, setHint] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [proof, setProof] = useState("");
  const [busy, setBusy] = useState(false);

  if (hasSession === false) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Precisas de iniciar sessão para pedir acesso de gestor.
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      return toast.error("Indica nome e telefone");
    }
    if (!stationId && !hint.trim()) {
      return toast.error("Escolhe um posto ou indica o nome");
    }
    setBusy(true);
    try {
      await requestManagerAccess({
        data: {
          stationId: stationId || null,
          stationNameHint: hint.trim() || null,
          fullName: fullName.trim(),
          phone: phone.trim(),
          proof: proof.trim() || null,
        },
      });
      toast.success("Pedido enviado. Vamos rever em breve.");
      navigate({ to: "/gestor" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link to="/gestor" className="size-9 grid place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold">Pedir acesso de gestor</h1>
      </header>

      <form onSubmit={onSubmit} className="p-4 space-y-4">
        <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          Indica o posto que geres e os teus contactos. Vamos confirmar contigo
          antes de te dar acesso para fazer atualizações oficiais.
        </p>

        <Field label="Posto (se já estiver no mapa)">
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
          >
            <option value="">— não está listado —</option>
            {stations?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.address ?? s.province}
              </option>
            ))}
          </select>
        </Field>

        {!stationId && (
          <Field label="Nome do posto">
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Ex: Pumangol Talatona"
              className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
            />
          </Field>
        )}

        <Field label="O teu nome completo">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
            maxLength={80}
          />
        </Field>

        <Field label="Telefone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+244 …"
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-mono"
            maxLength={30}
          />
        </Field>

        <Field label="Prova (opcional)">
          <textarea
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            rows={3}
            placeholder="Ex: cargo, foto/link de cartão profissional, email da empresa…"
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
            maxLength={500}
          />
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "A enviar…" : "ENVIAR PEDIDO"}
        </button>

        {requests && requests.length > 0 && (
          <section className="pt-6">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Pedidos anteriores
            </h2>
            <ul className="space-y-2">
              {requests.map((r) => {
                const st = r.stations as { name: string } | null;
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {st?.name ?? r.station_name_hint ?? "Posto"}
                    </span>
                    <StatusPill status={r.status} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </form>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-status-amber-soft text-status-amber",
    approved: "bg-status-green-soft text-status-green",
    rejected: "bg-status-red-soft text-status-red",
  };
  const label: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? ""}`}
    >
      {label[status] ?? status}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
