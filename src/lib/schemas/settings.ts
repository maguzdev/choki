import { z } from "zod";

const uuid = z.string().uuid("El identificador no es válido.");
const percentage = z.coerce.number().min(0, "El porcentaje no puede ser negativo.").max(100, "El porcentaje no puede superar 100.");

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("es-CO", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const globalSettingsSchema = z.object({
  familyName: z.string().trim().min(2, "Escribe el nombre de la familia.").max(80),
  timezone: z.string().trim().refine(isValidTimeZone, "La zona horaria no es válida."),
  protectorMax: z.coerce.number().int().min(0).max(3, "El máximo permitido es 3."),
  lowStockAlerts: z.boolean(),
  celebrations: z.boolean(),
});

export const splitRuleSchema = z.object({ childId: uuid, percent: percentage });

export const profileSchema = z.object({
  id: uuid.optional(),
  type: z.enum(["CHILD", "PARENT"]),
  name: z.string().trim().min(2, "Escribe el nombre del perfil.").max(80),
  email: z.string().trim().email("Escribe un correo válido.").or(z.literal("")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128).or(z.literal("")),
  pin: z.string().regex(/^\d{4}$/, "El PIN debe tener exactamente 4 dígitos.").or(z.literal("")),
  avatarEmoji: z.string().trim().min(1, "Elige un emoji.").max(16),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "El color no es válido."),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: z.boolean(),
}).superRefine((profile, context) => {
  if (!profile.id && profile.type === "CHILD" && !profile.pin) {
    context.addIssue({ code: "custom", path: ["pin"], message: "Define el PIN inicial del niño." });
  }
  if (!profile.id && profile.type === "PARENT" && !profile.email) {
    context.addIssue({ code: "custom", path: ["email"], message: "Escribe el correo del padre." });
  }
  if (!profile.id && profile.type === "PARENT" && !profile.password) {
    context.addIssue({ code: "custom", path: ["password"], message: "Define una contraseña inicial." });
  }
});

export const voidSaleSchema = z.object({
  saleId: uuid,
  reason: z.string().trim().min(3, "Explica brevemente por qué se anula la venta.").max(300, "El motivo no puede superar 300 caracteres."),
});
