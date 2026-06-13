import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, LogOut, User } from "lucide-react";
import { authApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { listMySubmittedStations } from "@/lib/stations.functions";
import { getDeviceId } from "@/lib/device-id";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Abastece.ao" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
    const stored = getStoredUser();
    setEmail(stored?.email ?? null);
    setLoading(false);
  }, []);

  const { data: submitted } = useQuery({
    queryKey: ["my-submitted-stations", deviceId, email],
    queryFn: () => listMySubmittedStations({ data: { deviceId: deviceId ?? "" } }),
    enabled: !!deviceId,
  });

  if (loading)
    return <p className="p-8 text-center text-sm text-muted-foreground">A carregar…</p>;

  if (!email) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="mx-auto size-16 rounded-full bg-muted grid place-items-center">
          <User className="size-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold">Sem sessão</h1>
        <p className="text-sm text-muted-foreground">
          Cria conta para acumular pontos e seguir postos.
        </p>
        <Link
          to="/login"
          className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Entrar / Criar conta
        </Link>

        {submitted && submitted.length > 0 && (
          <SubmittedSection items={submitted} />
        )}
      </div>
    );
  }

  return (
    <div>
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Perfil</h1>
      </header>
      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Email
          </p>
          <p className="font-mono text-sm mt-1">{email}</p>
        </div>

        <Link
          to="/gestor/pedir"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/10 grid place-items-center">
              <Building2 className="size-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">Sou responsável por um posto</p>
              <p className="text-[11px] text-muted-foreground">
                Atualiza stock como reporte oficial
              </p>
            </div>
          </div>
          <span className="text-muted-foreground">›</span>
        </Link>

        {submitted && submitted.length > 0 && <SubmittedSection items={submitted} />}

        <button
          onClick={async () => {
            await authApi.logout();
            window.location.href = "/";
          }}
          className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <LogOut className="size-4" />
          Terminar sessão
        </button>
      </div>
    </div>
  );
}

function SubmittedSection({
  items,
}: {
  items: { id: string; name: string; status: string; confirmations_count: number }[];
}) {
  const label: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
  };
  const cls: Record<string, string> = {
    pending: "bg-status-amber-soft text-status-amber",
    approved: "bg-status-green-soft text-status-green",
    rejected: "bg-status-red-soft text-status-red",
  };
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Os meus postos submetidos
      </h2>
      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{s.name}</p>
              {s.status === "pending" && (
                <p className="text-[10px] text-muted-foreground">
                  Confirmações: {s.confirmations_count}/3
                </p>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls[s.status] ?? ""}`}
            >
              {label[s.status] ?? s.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
