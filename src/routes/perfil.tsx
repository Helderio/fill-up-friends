import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Abastece.ao" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="p-8 text-center text-sm text-muted-foreground">A carregar…</p>;

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
        <button
          onClick={async () => {
            await supabase.auth.signOut();
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
