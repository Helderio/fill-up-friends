import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas — Abastece.ao" }] }),
  component: AlertasPage,
});

function AlertasPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );

  useEffect(() => {
    setAuthed(!!getStoredUser());
    if (typeof Notification === "undefined") setPermission("unsupported");
    else setPermission(Notification.permission);
  }, []);

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPermission(p);
  }

  return (
    <div>
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Alertas de proximidade</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Recebe um aviso quando há combustível num posto perto de ti.
        </p>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center">
              {permission === "granted" ? <Bell className="size-5" /> : <BellOff className="size-5" />}
            </div>
            <div>
              <p className="font-semibold text-sm">Notificações do browser</p>
              <p className="text-xs text-muted-foreground">
                {permission === "granted"
                  ? "Ativas"
                  : permission === "denied"
                    ? "Bloqueadas pelo browser"
                    : permission === "unsupported"
                      ? "Não suportadas neste dispositivo"
                      : "Não ativadas"}
              </p>
            </div>
          </div>
          {permission !== "granted" && permission !== "unsupported" && (
            <button
              onClick={enableNotifications}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              Ativar
            </button>
          )}
        </div>

        {authed === false && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Cria conta para guardar alertas por posto.
            </p>
            <Link
              to="/login"
              className="inline-block rounded-full bg-foreground px-5 py-2 text-xs font-bold text-background"
            >
              Entrar / Criar conta
            </Link>
          </div>
        )}

        {authed && (
          <p className="text-center text-xs text-muted-foreground py-6">
            Abre um posto e toca em "Seguir" para criar um alerta.
          </p>
        )}
      </div>
    </div>
  );
}
