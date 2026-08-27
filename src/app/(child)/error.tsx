"use client";

import { RouteError } from "@/components/shared";

export default function Error({ reset }: { reset: () => void }) {
  return <RouteError reset={reset} />;
}
