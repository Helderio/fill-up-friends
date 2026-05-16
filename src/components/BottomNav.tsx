import { Link, useLocation } from "@tanstack/react-router";
import { Map as MapIcon, List, Plus, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Mapa", icon: MapIcon },
  { to: "/lista", label: "Lista", icon: List },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-[480px] items-center justify-around px-2 py-2 relative">
        {items.slice(0, 2).map((it) => (
          <NavItem key={it.to} {...it} active={pathname === it.to} />
        ))}

        <Link
          to="/reportar"
          aria-label="Reportar"
          className="-mt-9 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 transition-transform ring-4 ring-background"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </Link>

        {items.slice(2).map((it) => (
          <NavItem key={it.to} {...it} active={pathname === it.to} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-14",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </Link>
  );
}
