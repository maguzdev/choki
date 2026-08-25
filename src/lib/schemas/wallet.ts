import { z } from "zod";

const childId = z.string().uuid();
const amount = z.coerce.number().int().positive("El valor debe ser mayor que cero.").max(1_000_000_000);

export const savingSettingsSchema = z.object({
  childId,
  enabled: z.boolean(),
  percent: z.coerce.number().int().min(0).max(100, "El porcentaje debe estar entre 0 % y 100 %."),
});

export const savingMovementSchema = z.object({
  childId,
  direction: z.enum(["IN", "OUT"]),
  amount,
});

export const withdrawalSchema = z.object({
  childId,
  amount,
  description: z.string().trim().max(120).optional().transform((value) => value || "Usé mi dinero"),
});

export const goalSchema = z.object({
  id: z.string().uuid().optional(),
  childId,
  name: z.string().trim().min(2, "Escribe un nombre para la meta.").max(80),
  emoji: z.string().trim().min(1).max(16),
  description: z.string().trim().max(300).optional().transform((value) => value || null),
  targetAmount: amount,
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida.").optional().or(z.literal("")).transform((value) => value || null),
  priority: z.coerce.number().int().min(1).max(3),
  isPrimary: z.boolean(),
});

export const goalContributionSchema = z.object({
  childId,
  goalId: z.string().uuid(),
  amount,
  source: z.enum(["AVAILABLE", "SAVINGS"]),
});

export const goalExitSchema = z.object({
  childId,
  goalId: z.string().uuid(),
  amount: amount.optional(),
  action: z.enum(["TO_AVAILABLE", "TO_SAVINGS", "SPEND"]),
});

export const goalStatusSchema = z.object({
  childId,
  goalId: z.string().uuid(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]),
});
