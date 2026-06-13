import { apiFetch } from "./api";

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

type BackendMonitoring = {
  lastHourTotal: number;
  last24hTotal: number;
  recent: Array<{
    id: string;
    functionName: string;
    errorMessage: string;
    errorCode: string | null;
    userId: string | null;
    deviceIdHash: string | null;
    createdAt: string;
  }>;
  perFunctionLastHour: Array<{ functionName: string; total: number; level: string }>;
  topDevices: Array<{ deviceIdHash: string; total: number }>;
};

export async function getErrorMonitoring(): Promise<ErrorMonitoring> {
  const data = await apiFetch<BackendMonitoring>("/api/admin/monitoring/errors");
  const perFunctionLastHour = data.perFunctionLastHour.map((item) => ({
    functionName: item.functionName,
    count: item.total,
    lastAt: "",
  }));
  return {
    lastHourTotal: data.lastHourTotal,
    last24hTotal: data.last24hTotal,
    perFunctionLastHour,
    alerts: perFunctionLastHour
      .filter((item) => item.count >= 10)
      .map((item) => ({
        functionName: item.functionName,
        count: item.count,
        severity: item.count >= 30 ? "critical" : "high",
      })),
    topDevices: data.topDevices.map((item) => ({
      hash: item.deviceIdHash,
      count: item.total,
    })),
    recent: data.recent.map((row) => ({
      id: row.id,
      function_name: row.functionName,
      error_message: row.errorMessage,
      error_code: row.errorCode,
      user_id: row.userId,
      device_id_hash: row.deviceIdHash,
      created_at: row.createdAt,
    })),
  };
}
