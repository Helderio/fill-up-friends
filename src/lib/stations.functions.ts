import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  alertInputSchema,
  reportInputSchema,
  stationIdSchema,
} from "./schemas";

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

export type LatestStatus = {
  status: "disponivel" | "pouco" | "sem_stock";
  priceKz: number | null;
  queueMinutes: number | null;
  reportedAt: string;
};

export const listStations = createServerFn({ method: "GET" }).handler(
  async (): Promise<StationWithStatus[]> => {
    const [stationsRes, statusRes] = await Promise.all([
      supabaseAdmin
        .from("stations")
        .select("id,name,brand,address,province,lat,lng")
        .order("name"),
      supabaseAdmin
        .from("station_status_latest")
        .select("station_id,fuel_type,status,price_kz,queue_minutes,reported_at"),
    ]);

    if (stationsRes.error) throw new Error(stationsRes.error.message);
    if (statusRes.error) throw new Error(statusRes.error.message);

    const byStation = new Map<string, { gasolina?: LatestStatus; gasoleo?: LatestStatus }>();
    for (const s of statusRes.data ?? []) {
      const entry = byStation.get(s.station_id) ?? {};
      const payload: LatestStatus = {
        status: s.status as LatestStatus["status"],
        priceKz: s.price_kz,
        queueMinutes: s.queue_minutes,
        reportedAt: s.reported_at as unknown as string,
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
      .select("*")
      .eq("id", data.stationId)
      .maybeSingle();
    if (stationRes.error) throw new Error(stationRes.error.message);
    if (!stationRes.data) throw new Error("Posto não encontrado");

    const reportsRes = await supabaseAdmin
      .from("reports")
      .select("id,fuel_type,status,price_kz,queue_minutes,note,created_at,user_id")
      .eq("station_id", data.stationId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (reportsRes.error) throw new Error(reportsRes.error.message);

    return {
      station: stationRes.data,
      reports: reportsRes.data ?? [],
    };
  });

// Simple in-memory rate limit (best-effort per worker isolate)
const lastReportByDevice = new Map<string, number[]>();
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

    // Optional user from auth header
    let userId: string | null = null;
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const auth = req?.headers.get("authorization");
      if (auth?.startsWith("Bearer ")) {
        const token = auth.slice(7);
        const { data: claimsData } = await supabaseAdmin.auth.getClaims(token);
        if (claimsData?.claims?.sub) userId = claimsData.claims.sub;
      }
    } catch {
      // ignore
    }

    const insertRes = await supabaseAdmin.from("reports").insert({
      station_id: data.stationId,
      fuel_type: data.fuelType,
      status: data.status,
      price_kz: data.priceKz ?? null,
      queue_minutes: data.queueMinutes ?? null,
      note: data.note ?? null,
      user_id: userId,
      device_id: userId ? null : data.deviceId,
    });
    if (insertRes.error) throw new Error(insertRes.error.message);

    if (userId) {
      await supabaseAdmin.rpc; // noop placeholder
      await supabaseAdmin
        .from("profiles")
        .update({ points: 1 })
        .eq("id", userId);
    }

    return { ok: true };
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
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("proximity_alerts")
        .delete()
        .eq("user_id", userId)
        .eq("station_id", data.stationId)
        .eq("fuel_type", data.fuelType);
      if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
    return data ?? [];
  });
