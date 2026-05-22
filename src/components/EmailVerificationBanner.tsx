import { useEffect, useState } from "react";
import { MailWarning, MailCheck, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function EmailVerificationBanner() {
  const [email, setEmail] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(true);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const u = data.user;
      if (!u) {
        setEmail(null);
        setConfirmed(true);
        return;
      }
      setEmail(u.email ?? null);
      setConfirmed(Boolean(u.email_confirmed_at ?? u.confirmed_at));
    };
    sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => sync());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!email || confirmed || dismissed) return null;

  async function resend() {
    if (!email || busy || cooldown > 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success("Email de verificação reenviado");
      setCooldown(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reenviar");
    } finally {
      setBusy(false);
    }
  }

  async function recheck() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      const u = data.user;
      const ok = Boolean(u?.email_confirmed_at ?? u?.confirmed_at);
      setConfirmed(ok);
      if (ok) toast.success("Email confirmado");
      else toast.info("Ainda não confirmado. Verifica o teu email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[480px] px-3 pt-3">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-100">
        <div className="flex items-start gap-2">
          <MailWarning className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Confirma o teu email</p>
            <p className="text-xs opacity-80 truncate">
              Enviámos um link para <span className="font-medium">{email}</span>.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={resend}
                disabled={busy || cooldown > 0}
                className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                <RefreshCw className="size-3.5" />
                {cooldown > 0 ? `Reenviar (${cooldown}s)` : "Reenviar email"}
              </button>
              <button
                onClick={recheck}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full border border-amber-600/50 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                <MailCheck className="size-3.5" />
                Já confirmei
              </button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dispensar"
            className="size-7 grid place-items-center rounded-full hover:bg-amber-600/10"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
