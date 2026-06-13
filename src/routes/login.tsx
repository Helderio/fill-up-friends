import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { authApi } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Abastece.ao" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        await authApi.login(email, password);
        toast.success("Sessão iniciada");
      } else {
        await authApi.register(email, password);
        toast.success("Conta criada");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="size-9 grid place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold">{mode === "signin" ? "Entrar" : "Criar conta"}</h1>
      </header>

      <form onSubmit={onSubmit} className="p-4 space-y-4">
        <label className="block">
          <span className="block mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="block mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Palavra-passe
          </span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "A processar…" : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="block w-full text-center text-xs text-muted-foreground underline"
        >
          {mode === "signin" ? "Ainda não tens conta? Criar uma" : "Já tens conta? Entrar"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Podes usar o app sem conta. Login é opcional.
        </p>
      </form>
    </div>
  );
}
