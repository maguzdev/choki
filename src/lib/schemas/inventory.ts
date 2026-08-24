import { z } from "zod";

export const purchaseSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que cero."),
  totalCost: z.coerce.number().int().min(0, "El costo no puede ser negativo."),
  note: z.string().trim().max(500).optional().transform((value) => value || null),
});

export const adjustmentReasonSchema = z.enum(["MERMA", "CONSUMO", "DANO", "CORRECCION", "OTRO"]);

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  quantityDelta: z.coerce.number().int().refine((value) => value !== 0, "Indica un ajuste diferente de cero."),
  reason: adjustmentReasonSchema,
  note: z.string().trim().min(1, "Explica brevemente el ajuste.").max(500),
});
