import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ErrorLogRow = {
  id: string;
  function_name: string;
  error_message: string;
  error_code: string | null;
  user_id: string | null;
  device_id_hash: string | null;
  created_at: string;
};

export type FunctionStat = {
  functionName: string;
  count: number;
  lastAt: string;
};

export type ErrorMonitoring = {
  recent: ErrorLogRow[];
  lastHourTotal: number;
  last24hTotal: number;
  perFunctionLastHour: FunctionStat[];
  alerts: { functionName: string; count: number; severity: "high" | "critical" }[];
  topDevices: { hash: string; count: number }[];
};

const ALERT_THRESHOLD_HIGH = 10; // per function / hour
const ALERT_THRESHOLD_CRITICAL = 30;

export const getErrorMonitoring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ErrorMonitoring> => {
    const { userId } = context;

    // Admin gate
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      throw new Error("Sem permissão de administrador.");
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [recentRes, hourRes, dayCountRes] = await Promise.all([
      supabaseAdmin
        .from("server_error_logs")
        .select("id,function_name,error_message,error_code,user_id,device_id_hash,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("server_error_logs")
        .select("function_name,device_id_hash,created_at")
        .gte("created_at", hourAgo),
      supabaseAdmin
        .from("server_error_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", dayAgo),
    ]);

    if (recentRes.error || hourRes.error) {
      console.error("[DB] getErrorMonitoring:", recentRes.error?.message ?? hourRes.error?.message);
      throw new Error("Não foi possível carregar a monitorização. Tenta novamente.");
    }

    const perFnMap = new Map<string, { count: number; lastAt: string }>();
    const perDeviceMap = new Map<string, number>();
    for (const r of hourRes.data ?? []) {
      const prev = perFnMap.get(r.function_name) ?? { count: 0, lastAt: r.created_at as string };
      prev.count += 1;
      if ((r.created_at as string) > prev.lastAt) prev.lastAt = r.created_at as string;
      perFnMap.set(r.function_name, prev);
      if (r.device_id_hash) {
        perDeviceMap.set(r.device_id_hash, (perDeviceMap.get(r.device_id_hash) ?? 0) + 1);
      }
    }

    const perFunctionLastHour: FunctionStat[] = Array.from(perFnMap.entries())
      .map(([functionName, v]) => ({ functionName, count: v.count, lastAt: v.lastAt }))
      .sort((a, b) => b.count - a.count);

    const alerts = perFunctionLastHour
      .filter((s) => s.count >= ALERT_THRESHOLD_HIGH)
      .map((s) => ({
        functionName: s.functionName,
        count: s.count,
        severity: (s.count >= ALERT_THRESHOLD_CRITICAL ? "critical" : "high") as
          | "high"
          | "critical",
      }));

    const topDevices = Array.from(perDeviceMap.entries())
      .map(([hash, count]) => ({ hash, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      recent: (recentRes.data ?? []) as ErrorLogRow[],
      lastHourTotal: hourRes.data?.length ?? 0,
      last24hTotal: dayCountRes.count ?? 0,
      perFunctionLastHour,
      alerts,
      topDevices,
    };
  });
