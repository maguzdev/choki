import { z } from "zod";

const optionalText = z.string().trim().max(500).optional().transform((value) => value || null);
const optionalUrl = z.string().trim().url("Escribe una URL válida.").optional().or(z.literal(""))
  .transform((value) => value || null);
const id = z.string().uuid();
const rewardAmount = z.coerce.number().int().min(0, "El valor no puede ser negativo.").max(1_000_000);

export const gamificationRuleSchema = z.object({
  event: z.enum(["SALE_COMPLETED", "UNIT_SOLD"]),
  xpAmount: rewardAmount,
  pointsAmount: rewardAmount,
  active: z.boolean(),
});

export const levelSchema = z.object({
  id: id.optional(),
  number: z.coerce.number().int().positive("El número de nivel debe ser mayor que cero."),
  name: z.string().trim().min(2, "Escribe el nombre del nivel.").max(80),
  xpRequired: rewardAmount,
  icon: z.string().trim().min(1, "Elige un icono.").max(16),
  description: optionalText,
  benefit: optionalText,
  active: z.boolean(),
});

export const achievementConditionSchema = z.enum([
  "TOTAL_SALES", "TOTAL_UNITS", "TOTAL_PROFIT", "STREAK_DAYS", "PRODUCT_UNITS", "GOALS_COMPLETED",
]);

export const achievementSchema = z.object({
  id: id.optional(),
  code: z.string().trim().min(2, "Escribe un código.").max(50)
    .regex(/^[A-Z0-9_]+$/, "Usa mayúsculas, números y guion bajo en el código."),
  name: z.string().trim().min(2, "Escribe el nombre del logro.").max(100),
  description: optionalText,
  icon: z.string().trim().min(1, "Elige un icono.").max(16),
  conditionType: achievementConditionSchema,
  targetValue: z.coerce.number().positive("La meta debe ser mayor que cero."),
  productId: id.nullable(),
  xpReward: rewardAmount,
  pointsReward: rewardAmount,
  hidden: z.boolean(),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
}).superRefine((data, context) => {
  if (data.conditionType === "PRODUCT_UNITS" && !data.productId) {
    context.addIssue({ code: "custom", path: ["productId"], message: "Elige el producto del logro." });
  }
});

export const challengeConditionSchema = z.enum([
  "SALES_COUNT", "UNITS_SOLD", "PROFIT_AMOUNT", "ACTIVE_DAYS", "PRODUCT_UNITS",
]);

export const challengeSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(2, "Escribe el nombre del reto.").max(100),
  description: optionalText,
  icon: z.string().trim().min(1, "Elige un icono.").max(16),
  startsOn: z.string().date("La fecha inicial no es válida."),
  endsOn: z.string().date("La fecha final no es válida."),
  conditionType: challengeConditionSchema,
  targetValue: z.coerce.number().positive("La meta debe ser mayor que cero."),
  productId: id.nullable(),
  xpReward: rewardAmount,
  pointsReward: rewardAmount,
  status: z.enum(["DRAFT", "ACTIVE", "FINISHED"]),
}).superRefine((data, context) => {
  if (data.endsOn < data.startsOn) {
    context.addIssue({ code: "custom", path: ["endsOn"], message: "La fecha final debe ser igual o posterior a la inicial." });
  }
  if (data.conditionType === "PRODUCT_UNITS" && !data.productId) {
    context.addIssue({ code: "custom", path: ["productId"], message: "Elige el producto del reto." });
  }
});

export const rewardSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(2, "Escribe el nombre del premio.").max(100),
  description: optionalText,
  icon: z.string().trim().min(1, "Elige un icono.").max(16),
  imageUrl: optionalUrl,
  costPoints: rewardAmount,
  type: z.enum(["NORMAL", "STREAK_PROTECTOR"]),
  stock: z.preprocess(
    (value) => value === "" || value == null ? null : value,
    z.union([z.null(), z.coerce.number().int().min(0)]),
  ),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

export const protectorMaxSchema = z.coerce.number().int().min(0).max(3, "El límite máximo permitido es 3.");
export const redeemRewardSchema = z.object({ childId: id, rewardId: id });
export const redemptionStatusSchema = z.object({
  redemptionId: id,
  status: z.enum(["DELIVERED", "CANCELLED"]),
  note: z.string().trim().max(300).optional().transform((value) => value || null),
});
