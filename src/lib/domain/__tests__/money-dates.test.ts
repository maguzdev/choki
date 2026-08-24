import { describe, expect, it } from "vitest";
import { addDays, diffDays, monthGrid, toLocalDate, weekDays } from "../dates";
import { distribute, formatCOP, round } from "../money";

describe("money", () => {
  it("1. redondea mitades hacia arriba", () => expect(round(10.5)).toBe(11));
  it("2. reparte 7000 por mitades", () => expect(distribute(7000, [50, 50])).toEqual([3500, 3500]));
  it("3. asigna el residuo al índice menor", () => expect(distribute(7001, [50, 50])).toEqual([3501, 3500]));
  it("4. conserva exactamente el total con porcentajes decimales", () => {
    const result = distribute(100, [33.33, 33.33, 33.34]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(result).toEqual([33, 33, 34]);
  });
  it("5. formatea pesos colombianos sin decimales", () => expect(formatCOP(20000)).toMatch(/20[.\s]000/));
});

describe("dates", () => {
  it("6. obtiene la fecha de Bogotá sin depender de la zona del proceso", () => {
    expect(toLocalDate(new Date("2026-01-01T02:30:00Z"), "America/Bogota")).toBe("2025-12-31");
  });
  it("7. suma y resta días de calendario a través de cambios de mes", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(diffDays("2025-12-31", "2026-01-02")).toBe(2);
  });
  it("8. construye semanas y grillas desde lunes", () => {
    expect(weekDays("2026-08-23")).toEqual([
      "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23",
    ]);
    const grid = monthGrid("2026-08-23");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-07-27");
    expect(grid).toContain("2026-08-31");
  });
});
