import "server-only";

import { createHmac } from "node:crypto";

const PIN_PATTERN = /^\d{4}$/;

export function isValidPin(pin: string) {
  return PIN_PATTERN.test(pin);
}

export function derivePinPassword(profileId: string, pin: string) {
  if (!isValidPin(pin)) {
    throw new Error("El PIN debe tener exactamente 4 dígitos.");
  }

  const pepper = process.env.CHILD_PIN_PEPPER;
  if (!pepper || pepper.startsWith("<")) {
    throw new Error("Falta configurar CHILD_PIN_PEPPER.");
  }

  return createHmac("sha256", pepper).update(`${profileId}:${pin}`).digest("hex");
}
