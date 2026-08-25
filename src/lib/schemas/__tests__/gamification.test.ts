import { describe, expect, it } from "vitest";

import { protectorMaxSchema, rewardSchema } from "@/lib/schemas/gamification";

const reward = {
  name: "Tiempo de pantalla",
  description: "Premio de prueba",
  icon: "🎁",
  imageUrl: "",
  costPoints: "100",
  type: "NORMAL",
  active: true,
  sortOrder: "0",
};

describe("rewardSchema", () => {
  it("conserva el stock vacío como disponibilidad ilimitada", () => {
    expect(rewardSchema.parse({ ...reward, stock: "" }).stock).toBeNull();
  });

  it("distingue el stock cero de la disponibilidad ilimitada", () => {
    expect(rewardSchema.parse({ ...reward, stock: "0" }).stock).toBe(0);
  });

  it("impide configurar una capacidad superior a tres protectores", () => {
    expect(protectorMaxSchema.safeParse("4").success).toBe(false);
  });
});
