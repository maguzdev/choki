import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string().uuid("El producto no es válido."),
  quantity: z.number().int().positive("La cantidad debe ser mayor que cero.").max(999, "La cantidad es demasiado alta."),
});

export const registerSaleSchema = z.object({
  saleId: z.string().uuid("El identificador de la venta no es válido."),
  sellerId: z.string().uuid("El vendedor no es válido."),
  sellerType: z.enum(["CHILD", "PARENT"]),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  cashReceived: z.number().int().nonnegative().nullable().optional(),
  changeGiven: z.number().int().nonnegative().nullable().optional(),
  transferTip: z.number().int().nonnegative().default(0),
  items: z.array(saleItemSchema).min(1, "Agrega al menos un producto.").max(100),
}).superRefine((value, context) => {
  if (new Set(value.items.map((item) => item.productId)).size !== value.items.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "El carrito contiene productos repetidos." });
  }
  if (value.paymentMethod === "CASH" && value.cashReceived == null) {
    context.addIssue({ code: "custom", path: ["cashReceived"], message: "Indica cuánto dinero recibiste." });
  }
});

export type RegisterSaleInput = z.infer<typeof registerSaleSchema>;
