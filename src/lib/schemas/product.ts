import { z } from "zod";

const optionalText = z.string().trim().max(500).optional().transform((value) => value || null);
const optionalUrl = z.string().trim().url("Escribe una URL válida.").optional().or(z.literal(""))
  .transform((value) => value || null);

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Escribe un nombre.").max(80),
  emoji: z.string().trim().min(1, "Elige un emoji.").max(8),
  sortOrder: z.coerce.number().int().min(0, "El orden no puede ser negativo."),
  active: z.boolean(),
});

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid().nullable(),
  name: z.string().trim().min(1, "Escribe un nombre.").max(120),
  description: optionalText,
  emoji: z.string().trim().min(1, "Elige un emoji.").max(8),
  imageUrl: optionalUrl,
  price: z.coerce.number().int().min(0, "El precio no puede ser negativo."),
  cost: z.coerce.number().int().min(0, "El costo no puede ser negativo."),
  stock: z.coerce.number().int(),
  minStock: z.coerce.number().int().min(0, "El mínimo no puede ser negativo."),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0, "El orden no puede ser negativo."),
});
