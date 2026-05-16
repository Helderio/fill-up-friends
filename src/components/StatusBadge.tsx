import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/schemas";

type Status = "disponivel" | "pouco" | "sem_stock" | "unknown";

const COLORS: Record<Status, string> = {
  disponivel: "bg-status-green",
  pouco: "bg-status-amber",
  sem_stock: "bg-status-red",
  unknown: "bg-muted-foreground/40",
};

const TEXT: Record<Status, string> = {
  disponivel: "text-status-green",
  pouco: "text-status-amber",
  sem_stock: "text-status-red",
  unknown: "text-muted-foreground",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return <span className={cn("inline-block size-2.5 rounded-full", COLORS[status], className)} />;
}

export function StatusBar({ status, className }: { status: Status; className?: string }) {
  return <span className={cn("block h-1 w-full", COLORS[status], className)} />;
}

export function StatusLabel({ status }: { status: Status }) {
  if (status === "unknown") {
    return (
      <span className="font-mono text-xs font-bold uppercase tracking-tighter italic text-muted-foreground">
        Sem dados
      </span>
    );
  }
  return (
    <span className={cn("font-mono text-xs font-bold uppercase tracking-tighter italic", TEXT[status])}>
      {statusLabel[status]}
    </span>
  );
}
