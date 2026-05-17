import { z } from "zod";

export const FUEL_TYPES = ["gasolina", "gasoleo"] as const;
export const STATUSES = ["disponivel", "pouco", "sem_stock"] as const;

export const fuelTypeSchema = z.enum(FUEL_TYPES);
export const statusSchema = z.enum(STATUSES);

export const reportInputSchema = z.object({
  stationId: z.string().uuid(),
  fuelType: fuelTypeSchema,
  status: statusSchema,
  priceKz: z.number().int().min(0).max(100000).nullable().optional(),
  queueMinutes: z.number().int().min(0).max(600).nullable().optional(),
  note: z.string().trim().max(280).nullable().optional(),
  deviceId: z.string().min(6).max(80),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export const officialReportInputSchema = z.object({
  stationId: z.string().uuid(),
  fuelType: fuelTypeSchema,
  status: statusSchema,
  priceKz: z.number().int().min(0).max(100000).nullable().optional(),
  queueMinutes: z.number().int().min(0).max(600).nullable().optional(),
  note: z.string().trim().max(280).nullable().optional(),
});

export const stationIdSchema = z.object({ stationId: z.string().uuid() });

export const alertInputSchema = z.object({
  stationId: z.string().uuid(),
  fuelType: fuelTypeSchema,
  active: z.boolean(),
});

// Angola bounding box
const isAngolaLat = (n: number) => n >= -18.5 && n <= -4;
const isAngolaLng = (n: number) => n >= 11 && n <= 24.5;

export const submitStationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  brand: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(160).nullable().optional(),
  province: z.string().trim().min(2).max(40),
  lat: z.number().refine(isAngolaLat, "Latitude fora de Angola"),
  lng: z.number().refine(isAngolaLng, "Longitude fora de Angola"),
  deviceId: z.string().min(6).max(80),
});

export const managerRequestSchema = z.object({
  stationId: z.string().uuid().nullable().optional(),
  stationNameHint: z.string().trim().max(120).nullable().optional(),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  proof: z.string().trim().max(500).nullable().optional(),
});

export const statusLabel: Record<(typeof STATUSES)[number], string> = {
  disponivel: "Disponível",
  pouco: "Pouco stock",
  sem_stock: "Sem stock",
};
export const fuelLabel: Record<(typeof FUEL_TYPES)[number], string> = {
  gasolina: "Gasolina",
  gasoleo: "Gasóleo",
};
