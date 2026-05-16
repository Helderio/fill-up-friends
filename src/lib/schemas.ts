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

export const stationIdSchema = z.object({ stationId: z.string().uuid() });

export const alertInputSchema = z.object({
  stationId: z.string().uuid(),
  fuelType: fuelTypeSchema,
  active: z.boolean(),
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
