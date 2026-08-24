import { describe, expect, it } from "vitest";
import { replayStreak } from "../streak";

describe("streak replay", () => {
  it("34. tres días consecutivos producen racha y mejor de tres", () => expect(replayStreak({ saleDays: [{ date: "2026-08-22", count: 1 }, { date: "2026-08-23", count: 1 }, { date: "2026-08-24", count: 1 }], protectorGrants: [], today: "2026-08-24", maxProtectors: 3 })).toMatchObject({ currentStreak: 3, bestStreak: 3 }));
  it("35. un hueco sin protector registra MISSED y rompe", () => expect(replayStreak({ saleDays: [{ date: "2026-08-22", count: 1 }], protectorGrants: [], today: "2026-08-24", maxProtectors: 3 })).toMatchObject({ currentStreak: 0, days: [expect.anything(), { date: "2026-08-23", status: "MISSED", salesCount: 0 }] }));
  it("36. un hueco con protector conserva la racha y lo consume", () => expect(replayStreak({ saleDays: [{ date: "2026-08-22", count: 1 }], protectorGrants: [{ date: "2026-08-22", quantity: 1 }], today: "2026-08-24", maxProtectors: 3 })).toMatchObject({ currentStreak: 1, protectorsAvailable: 0, days: [expect.anything(), { date: "2026-08-23", status: "PROTECTED", salesCount: 0 }] }));
  it("37. el día actual no consume protector ni rompe", () => expect(replayStreak({ saleDays: [{ date: "2026-08-23", count: 1 }], protectorGrants: [{ date: "2026-08-23", quantity: 1 }], today: "2026-08-24", maxProtectors: 3 })).toMatchObject({ currentStreak: 1, protectorsAvailable: 1, days: [{ date: "2026-08-23", status: "SOLD", salesCount: 1 }] }));
  it("38. un protector comprado ese día lo protege al cerrarse", () => expect(replayStreak({ saleDays: [{ date: "2026-08-21", count: 1 }], protectorGrants: [{ date: "2026-08-22", quantity: 1 }], today: "2026-08-23", maxProtectors: 3 }).days.at(1)?.status).toBe("PROTECTED"));
  it("39. dos huecos con un protector rompen en el segundo", () => expect(replayStreak({ saleDays: [{ date: "2026-08-20", count: 1 }], protectorGrants: [{ date: "2026-08-20", quantity: 1 }], today: "2026-08-23", maxProtectors: 3 }).days.map((day) => day.status)).toEqual(["SOLD", "PROTECTED", "MISSED"]));
  it("40. conserva la mejor racha después de romper la actual", () => expect(replayStreak({ saleDays: [{ date: "2026-08-20", count: 1 }, { date: "2026-08-21", count: 1 }], protectorGrants: [], today: "2026-08-23", maxProtectors: 3 })).toMatchObject({ currentStreak: 0, bestStreak: 2 }));
  it("41. reconstruye la racha al desaparecer una venta", () => {
    const before = replayStreak({ saleDays: [{ date: "2026-08-22", count: 1 }, { date: "2026-08-23", count: 1 }], protectorGrants: [], today: "2026-08-24", maxProtectors: 3 });
    const after = replayStreak({ saleDays: [{ date: "2026-08-22", count: 1 }], protectorGrants: [], today: "2026-08-24", maxProtectors: 3 });
    expect(before.currentStreak).toBe(2);
    expect(after.currentStreak).toBe(0);
  });
  it("42. no acumula más protectores que el máximo", () => expect(replayStreak({ saleDays: [], protectorGrants: [{ date: "2026-08-20", quantity: 8 }], today: "2026-08-24", maxProtectors: 3 }).protectorsAvailable).toBe(3));
});
