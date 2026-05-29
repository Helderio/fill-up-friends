import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logServerError } from "./error-logger.server";
import {
  alertInputSchema,
  managerRequestSchema,
  officialReportInputSchema,
  reportInputSchema,
  stationIdSchema,
  submitStationSchema,
} from "./schemas";

export type LatestStatus = {
  status: "disponivel" | "pouco" | "sem_stock";
  priceKz: number | null;
  queueMinutes: number | null;
  reportedAt: string;
  source: "community" | "official";
};

export type StationWithStatus = {
  id: string;
  name: string;
  brand: string | null;
  address: string | null;
  lat: number;
  lng: number;
  province: string;
  gasolina: LatestStatus | null;
  gasoleo: LatestStatus | null;
};

async function getUserIdFromRequest(): Promise<string | null> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const auth = req?.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7);
      const { data } = await supabaseAdmin.auth.getClaims(token);
      return data?.claims?.sub ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const listStations = createServerFn({ method: "GET" }).handler(
  async (): Promise<StationWithStatus[]> => {
    const [stationsRes, statusRes] = await Promise.all([
      supabaseAdmin
        .from("stations")
        .select("id,name,brand,address,province,lat,lng")
        .eq("status", "approved")
        .order("name"),
      supabaseAdmin
        .from("station_status_latest")
        .select("station_id,fuel_type,status,price_kz,queue_minutes,reported_at,source"),
    ]);

    if (stationsRes.error) {
      console.error("[DB] listStations stations:", stationsRes.error.message);
      await logServerError({
        functionName: "listStations",
        error: stationsRes.error.message,
        errorCode: stationsRes.error.code,
        context: { step: "stations" },
      });
      throw new Error("Não foi possível carregar os postos. Tenta novamente.");
    }
    if (statusRes.error) {
      console.error("[DB] listStations status:", statusRes.error.message);
      await logServerError({
        functionName: "listStations",
        error: statusRes.error.message,
        errorCode: statusRes.error.code,
        context: { step: "status" },
      });
      throw new Error("Não foi possível carregar os postos. Tenta novamente.");
    }

    const byStation = new Map<string, { gasolina?: LatestStatus; gasoleo?: LatestStatus }>();
    for (const s of statusRes.data ?? []) {
      if (!s.station_id || !s.fuel_type || !s.status || !s.reported_at) continue;
      const entry = byStation.get(s.station_id) ?? {};
      const payload: LatestStatus = {
        status: s.status as LatestStatus["status"],
        priceKz: s.price_kz,
        queueMinutes: s.queue_minutes,
        reportedAt: s.reported_at as unknown as string,
        source: (s.source as "community" | "official") ?? "community",
      };
      if (s.fuel_type === "gasolina") entry.gasolina = payload;
      else if (s.fuel_type === "gasoleo") entry.gasoleo = payload;
      byStation.set(s.station_id, entry);
    }

    return (stationsRes.data ?? []).map((s) => {
      const e = byStation.get(s.id) ?? {};
      return {
        id: s.id,
        name: s.name,
        brand: s.brand,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        province: s.province,
        gasolina: e.gasolina ?? null,
        gasoleo: e.gasoleo ?? null,
      };
    });
  },
);

export const getStationDetail = createServerFn({ method: "POST" })
  .inputValidator((input) => stationIdSchema.parse(input))
  .handler(async ({ data }) => {
    const stationRes = await supabaseAdmin
      .from("stations")
      .select("id,name,brand,address,province,lat,lng,status,confirmations_count,created_at")
      .eq("id", data.stationId)
      .maybeSingle();
    if (stationRes.error) {
      console.error("[DB] getStationDetail station:", stationRes.error.message);
      await logServerError({
        functionName: "getStationDetail",
        error: stationRes.error.message,
        errorCode: stationRes.error.code,
        context: { stationId: data.stationId, step: "station" },
      });
      throw new Error("Não foi possível carregar o posto. Tenta novamente.");
    }
    if (!stationRes.data) {
      await logServerError({
        functionName: "getStationDetail",
        error: "station_not_found",
        context: { stationId: data.stationId },
      });
      throw new Error("Posto não encontrado");
    }

    const reportsRes = await supabaseAdmin
      .from("reports")
      .select("id,fuel_type,status,price_kz,queue_minutes,note,created_at,user_id,source")
      .eq("station_id", data.stationId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (reportsRes.error) {
      console.error("[DB] getStationDetail reports:", reportsRes.error.message);
      await logServerError({
        functionName: "getStationDetail",
        error: reportsRes.error.message,
        errorCode: reportsRes.error.code,
        context: { stationId: data.stationId, step: "reports" },
      });
      throw new Error("Não foi possível carregar o histórico. Tenta novamente.");
    }

    return {
      station: stationRes.data,
      reports: reportsRes.data ?? [],
    };
  });

// Best-effort per-worker rate limit
const lastReportByDevice = new Map<string, number[]>();
const lastStationByDevice = new Map<string, number[]>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

export const submitReport = createServerFn({ method: "POST" })
  .inputValidator((input) => reportInputSchema.parse(input))
  .handler(async ({ data }) => {
    const now = Date.now();
    const stamps = (lastReportByDevice.get(data.deviceId) ?? []).filter(
      (t) => now - t < RATE_WINDOW_MS,
    );
    if (stamps.length >= RATE_MAX) {
      throw new Error("Limite de reportes atingido. Tenta novamente mais tarde.");
    }
    stamps.push(now);
    lastReportByDevice.set(data.deviceId, stamps);

    const userId = await getUserIdFromRequest();

    const insertRes = await supabaseAdmin.from("reports").insert({
      station_id: data.stationId,
      fuel_type: data.fuelType,
      status: data.status,
      price_kz: data.priceKz ?? null,
      queue_minutes: data.queueMinutes ?? null,
      note: data.note ?? null,
      user_id: userId,
      device_id: userId ? null : data.deviceId,
      source: "community",
    });
    if (insertRes.error) { console.error("[DB]", insertRes.error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }

    // Auto-confirm pending station when 3 distinct devices/users report
    const { data: station } = await supabaseAdmin
      .from("stations")
      .select("status,confirmations_count")
      .eq("id", data.stationId)
      .maybeSingle();
    if (station?.status === "pending") {
      const newCount = (station.confirmations_count ?? 0) + 1;
      await supabaseAdmin
        .from("stations")
        .update({
          confirmations_count: newCount,
          status: newCount >= 3 ? "approved" : "pending",
        })
        .eq("id", data.stationId);
    }

    return { ok: true };
  });

export const submitStation = createServerFn({ method: "POST" })
  .inputValidator((input) => submitStationSchema.parse(input))
  .handler(async ({ data }) => {
    const now = Date.now();
    const stamps = (lastStationByDevice.get(data.deviceId) ?? []).filter(
      (t) => now - t < 60 * 60 * 1000,
    );
    if (stamps.length >= 1) {
      throw new Error("Já submeteste um posto recentemente. Tenta dentro de 1 hora.");
    }
    stamps.push(now);
    lastStationByDevice.set(data.deviceId, stamps);

    const userId = await getUserIdFromRequest();

    const { data: created, error } = await supabaseAdmin
      .from("stations")
      .insert({
        name: data.name,
        brand: data.brand ?? null,
        address: data.address ?? null,
        province: data.province,
        lat: data.lat,
        lng: data.lng,
        status: "pending",
        submitted_by_user_id: userId,
        submitted_by_device_id: userId ? null : data.deviceId,
        confirmations_count: 0,
      })
      .select("id")
      .single();

    if (error) { console.error("[DB]", error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }
    return { id: created.id };
  });

export const listMySubmittedStations = createServerFn({ method: "POST" })
  .inputValidator((input: { deviceId: string }) => input)
  .handler(async ({ data }) => {
    const userId = await getUserIdFromRequest();
    let query = supabaseAdmin
      .from("stations")
      .select("id,name,address,province,status,confirmations_count,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (userId) {
      query = query.eq("submitted_by_user_id", userId);
    } else {
      query = query.eq("submitted_by_device_id", data.deviceId);
    }
    const { data: rows, error } = await query;
    if (error) { console.error("[DB]", error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }
    return rows ?? [];
  });

export const toggleProximityAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => alertInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.active) {
      const { error } = await supabase
        .from("proximity_alerts")
        .upsert(
          {
            user_id: userId,
            station_id: data.stationId,
            fuel_type: data.fuelType,
            active: true,
          },
          { onConflict: "user_id,station_id,fuel_type" },
        );
      if (error) { console.error("[DB]", error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }
    } else {
      const { error } = await supabase
        .from("proximity_alerts")
        .delete()
        .eq("user_id", userId)
        .eq("station_id", data.stationId)
        .eq("fuel_type", data.fuelType);
      if (error) { console.error("[DB]", error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }
    }
    return { ok: true };
  });

export const listMyAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("proximity_alerts")
      .select("id,station_id,fuel_type,active,created_at,stations(name,address)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) { console.error("[DB]", error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }
    return data ?? [];
  });

// ---- Gestor (station manager) ----

export const listMyManagedStations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: mgrs, error } = await supabaseAdmin
      .from("station_managers")
      .select("role,station_id,stations(id,name,address,province,brand,lat,lng)")
      .eq("user_id", userId);
    if (error) { console.error("[DB]", error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }

    const stationIds = (mgrs ?? []).map((m) => m.station_id);
    if (stationIds.length === 0) return [];

    const { data: statuses } = await supabaseAdmin
      .from("station_status_latest")
      .select("station_id,fuel_type,status,price_kz,queue_minutes,reported_at,source")
      .in("station_id", stationIds);

    const byId = new Map<string, { gasolina?: LatestStatus; gasoleo?: LatestStatus }>();
    for (const s of statuses ?? []) {
      if (!s.station_id || !s.fuel_type) continue;
      const entry = byId.get(s.station_id) ?? {};
      const payload: LatestStatus = {
        status: s.status as LatestStatus["status"],
        priceKz: s.price_kz,
        queueMinutes: s.queue_minutes,
        reportedAt: s.reported_at as unknown as string,
        source: (s.source as "community" | "official") ?? "community",
      };
      if (s.fuel_type === "gasolina") entry.gasolina = payload;
      else entry.gasoleo = payload;
      byId.set(s.station_id, entry);
    }

    return (mgrs ?? []).map((m) => {
      const st = m.stations as {
        id: string;
        name: string;
        address: string | null;
        province: string;
        brand: string | null;
      } | null;
      const e = byId.get(m.station_id) ?? {};
      return {
        role: m.role as "owner" | "staff",
        station: st,
        gasolina: e.gasolina ?? null,
        gasoleo: e.gasoleo ?? null,
      };
    });
  });

export const iAmManager = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("station_managers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    return { isManager: (count ?? 0) > 0 };
  });

export const submitOfficialReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => officialReportInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: mgr, error: mgrErr } = await supabaseAdmin
      .from("station_managers")
      .select("id")
      .eq("user_id", userId)
      .eq("station_id", data.stationId)
      .maybeSingle();
    if (mgrErr) { console.error("[DB]", mgrErr.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }
    if (!mgr) throw new Error("Não tens permissão para reportar como oficial neste posto.");

    const { error } = await supabaseAdmin.from("reports").insert({
      station_id: data.stationId,
      fuel_type: data.fuelType,
      status: data.status,
      price_kz: data.priceKz ?? null,
      queue_minutes: data.queueMinutes ?? null,
      note: data.note ?? null,
      user_id: userId,
      device_id: null,
      source: "official",
    });
    if (error) { console.error("[DB]", error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }
    return { ok: true };
  });

export const requestManagerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => managerRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin.from("station_manager_requests").insert({
      user_id: userId,
      station_id: data.stationId ?? null,
      station_name_hint: data.stationNameHint ?? null,
      full_name: data.fullName,
      phone: data.phone,
      proof: data.proof ?? null,
      status: "pending",
    });
    if (error) { console.error("[DB]", error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }
    return { ok: true };
  });

export const listMyManagerRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("station_manager_requests")
      .select("id,station_id,station_name_hint,status,created_at,stations(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) { console.error("[DB]", error.message); throw new Error("Não foi possível completar a operação. Tenta novamente."); }
    return data ?? [];
  });
