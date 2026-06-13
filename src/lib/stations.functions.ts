import { apiFetch } from "./api";

type FuelType = "gasolina" | "gasoleo";
type StockStatus = "disponivel" | "pouco" | "sem_stock";

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

type BackendLatestStatus = LatestStatus & {
  fuelType: FuelType;
};

type BackendStation = {
  id: string;
  name: string;
  brand: string | null;
  address: string | null;
  province: string;
  lat: number;
  lng: number;
  status: "pending" | "approved" | "rejected";
  confirmationsCount: number;
  createdAt: string;
  latest?: Partial<Record<FuelType, BackendLatestStatus>>;
};

type BackendReport = {
  id: string;
  stationId: string;
  userId: string | null;
  fuelType: FuelType;
  status: StockStatus;
  priceKz: number | null;
  queueMinutes: number | null;
  note: string | null;
  source: "community" | "official";
  createdAt: string;
};

function mapLatest(latest?: BackendLatestStatus | null): LatestStatus | null {
  if (!latest) return null;
  return {
    status: latest.status,
    priceKz: latest.priceKz ?? null,
    queueMinutes: latest.queueMinutes ?? null,
    reportedAt: latest.reportedAt,
    source: latest.source,
  };
}

function mapStation(station: BackendStation): StationWithStatus {
  return {
    id: station.id,
    name: station.name,
    brand: station.brand,
    address: station.address,
    lat: station.lat,
    lng: station.lng,
    province: station.province,
    gasolina: mapLatest(station.latest?.gasolina),
    gasoleo: mapLatest(station.latest?.gasoleo),
  };
}

function mapReport(report: BackendReport) {
  return {
    id: report.id,
    station_id: report.stationId,
    user_id: report.userId,
    fuel_type: report.fuelType,
    status: report.status,
    price_kz: report.priceKz,
    queue_minutes: report.queueMinutes,
    note: report.note,
    source: report.source,
    created_at: report.createdAt,
  };
}

export async function listStations(): Promise<StationWithStatus[]> {
  const stations = await apiFetch<BackendStation[]>("/api/stations");
  return stations.map(mapStation);
}

export async function getStationDetail({ data }: { data: { stationId: string } }) {
  const detail = await apiFetch<{ station: BackendStation; reports: BackendReport[] }>(
    `/api/stations/${data.stationId}`,
  );
  return {
    station: mapStation(detail.station),
    reports: detail.reports.map(mapReport),
  };
}

export async function submitReport({ data }: { data: {
  stationId: string;
  fuelType: FuelType;
  status: StockStatus;
  priceKz?: number | null;
  queueMinutes?: number | null;
  note?: string | null;
  deviceId: string;
} }) {
  await apiFetch<BackendReport>("/api/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return { ok: true };
}

export async function submitStation({ data }: { data: {
  name: string;
  brand?: string | null;
  address?: string | null;
  province: string;
  lat: number;
  lng: number;
  deviceId: string;
} }) {
  const station = await apiFetch<BackendStation>("/api/stations", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return { id: station.id };
}

export async function listMySubmittedStations({ data }: { data: { deviceId: string } }) {
  const params = new URLSearchParams();
  if (data.deviceId) params.set("deviceId", data.deviceId);
  const stations = await apiFetch<BackendStation[]>(`/api/stations/mine?${params}`);
  return stations.map((station) => ({
    id: station.id,
    name: station.name,
    address: station.address,
    province: station.province,
    status: station.status,
    confirmations_count: station.confirmationsCount,
    created_at: station.createdAt,
  }));
}

export async function toggleProximityAlert({ data }: { data: {
  stationId: string;
  fuelType: FuelType;
  active: boolean;
} }) {
  await apiFetch<void>("/api/alerts", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return { ok: true };
}

export async function listMyAlerts() {
  return apiFetch<Array<{
    id: string;
    stationId: string;
    stationName: string;
    fuelType: FuelType;
    active: boolean;
    createdAt: string;
  }>>("/api/alerts");
}

export async function listMyManagedStations() {
  const managed = await apiFetch<Array<{
    stationId: string;
    stationName: string;
    role: "owner" | "staff";
  }>>("/api/managers/me");

  return Promise.all(
    managed.map(async (row) => {
      const detail = await getStationDetail({ data: { stationId: row.stationId } });
      return {
        role: row.role,
        station: detail.station,
        gasolina: detail.station.gasolina,
        gasoleo: detail.station.gasoleo,
      };
    }),
  );
}

export async function iAmManager() {
  try {
    const stations = await apiFetch<Array<{ stationId: string }>>("/api/managers/me");
    return { isManager: stations.length > 0 };
  } catch {
    return { isManager: false };
  }
}

export async function submitOfficialReport({ data }: { data: {
  stationId: string;
  fuelType: FuelType;
  status: StockStatus;
  priceKz?: number | null;
  queueMinutes?: number | null;
  note?: string | null;
} }) {
  await apiFetch<BackendReport>("/api/reports/official", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return { ok: true };
}

export async function requestManagerAccess({ data }: { data: {
  stationId?: string | null;
  stationNameHint?: string | null;
  fullName: string;
  phone: string;
  proof?: string | null;
} }) {
  await apiFetch("/api/manager-requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return { ok: true };
}

export async function listMyManagerRequests() {
  const requests = await apiFetch<Array<{
    id: string;
    stationId: string | null;
    stationNameHint: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
  }>>("/api/manager-requests/mine");

  return requests.map((request) => ({
    id: request.id,
    station_id: request.stationId,
    station_name_hint: request.stationNameHint,
    status: request.status,
    created_at: request.createdAt,
    stations: null,
  }));
}
