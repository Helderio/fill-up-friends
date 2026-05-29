import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, Activity, ShieldAlert } from "lucide-react";
import { getErrorMonitoring } from "@/lib/monitoring.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/erros")({
  head: () => ({ meta: [{ title: "Monitorização de erros — Abastece.ao" }] }),
  component: AdminErrosPage,
});

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AdminErrosPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["error-monitoring"],
    queryFn: () => getErrorMonitoring(),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-dvh bg-background pb-16">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/perfil" className="p-1 -ml-1" aria-label="Voltar">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold">Monitorização de erros</h1>
            <p className="text-xs text-muted-foreground">Funções server · últimas 24h</p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs rounded-full bg-secondary px-3 py-1.5 font-medium"
          >
            {isFetching ? "…" : "Atualizar"}
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">A carregar…</p>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">
              {error instanceof Error ? error.message : "Erro ao carregar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Apenas administradores têm acesso a esta página.
            </p>
          </div>
        ) : data ? (
          <>
            {/* Alerts */}
            {data.alerts.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" />
                  Alertas ativos
                </h2>
                {data.alerts.map((a) => (
                  <div
                    key={a.functionName}
                    className={cn(
                      "rounded-lg border p-3 flex items-center justify-between",
                      a.severity === "critical"
                        ? "border-destructive bg-destructive/10"
                        : "border-orange-500/40 bg-orange-500/10",
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold">{a.functionName}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.count} erros na última hora
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold rounded-full px-2 py-0.5",
                        a.severity === "critical"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-orange-500 text-white",
                      )}
                    >
                      {a.severity}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {/* Stats */}
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Última hora</p>
                <p className="text-2xl font-bold">{data.lastHourTotal}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Últimas 24h</p>
                <p className="text-2xl font-bold">{data.last24hTotal}</p>
              </div>
            </section>

            {/* Per function */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Activity className="size-4" />
                Por função (última hora)
              </h2>
              {data.perFunctionLastHour.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem erros na última hora.</p>
              ) : (
                <div className="rounded-lg border divide-y bg-card">
                  {data.perFunctionLastHour.map((s) => (
                    <div
                      key={s.functionName}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-xs">{s.functionName}</span>
                      <span className="font-bold">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Top devices */}
            {data.topDevices.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="size-4" />
                  Dispositivos com mais erros
                </h2>
                <div className="rounded-lg border divide-y bg-card">
                  {data.topDevices.map((d) => (
                    <div
                      key={d.hash}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-xs text-muted-foreground">{d.hash}</span>
                      <span className="font-bold">{d.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold">Erros recentes</h2>
              {data.recent.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem registos.</p>
              ) : (
                <div className="space-y-2">
                  {data.recent.map((r) => (
                    <div key={r.id} className="rounded-lg border bg-card p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold">{r.function_name}</span>
                        <span className="text-muted-foreground">{formatTime(r.created_at)}</span>
                      </div>
                      <p className="text-foreground break-words">{r.error_message}</p>
                      {(r.error_code || r.device_id_hash) && (
                        <p className="text-muted-foreground text-[10px] font-mono">
                          {r.error_code ? `code=${r.error_code} ` : ""}
                          {r.device_id_hash ? `dev=${r.device_id_hash}` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
