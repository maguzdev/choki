"use client";

import { History } from "lucide-react";

import { MonthlyHistory } from "@/components/shared/monthly-history";
import type { WalletMovement } from "@/lib/data/wallet";
import { formatCOP } from "@/lib/domain/money";

const movementLabels: Record<string, string> = {
  EARNING: "Ganancia",
  EARNING_REVERSAL: "Anulación de ganancia",
  SAVING_IN: "Entrada a ahorro",
  SAVING_OUT: "Salida de ahorro",
  GOAL_IN: "Aporte a meta",
  GOAL_OUT: "Salida de meta",
  GOAL_SPEND: "Compra de meta",
  WITHDRAWAL: "Dinero utilizado",
  ADJUSTMENT: "Ajuste",
};

function Delta({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold tabular-nums ${value > 0 ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"}`}>
      {label} {value > 0 ? "+" : ""}{formatCOP(value)}
    </span>
  );
}

function MovementRow({ movement }: { movement: WalletMovement }) {
  return (
    <article className="rounded-xl border border-cream-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-choco-800">{movement.description}</p>
          <p className="mt-0.5 text-xs text-choco-600">{movementLabels[movement.type] ?? movement.type}</p>
        </div>
        {movement.earningAmount !== 0 ? (
          <strong className={`shrink-0 tabular-nums ${movement.earningAmount > 0 ? "text-success-500" : "text-danger-500"}`}>
            {movement.earningAmount > 0 ? "+" : ""}{formatCOP(movement.earningAmount)}
          </strong>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Delta label="Disponible" value={movement.availableDelta} />
        <Delta label="Ahorro" value={movement.savingsDelta} />
        <Delta label="Meta" value={movement.goalDelta} />
      </div>
    </article>
  );
}

export function WalletHistory({ movements, today }: { movements: WalletMovement[]; today: string }) {
  return (
    <section className="mt-6">
      <div className="flex items-center gap-2">
        <History aria-hidden="true" className="size-5 text-caramel-600" />
        <h2 className="font-display text-2xl font-bold">Mi extracto</h2>
      </div>
      <p className="mt-1 text-sm text-choco-600">Cada movimiento explica de dónde entró o salió tu dinero.</p>
      <MonthlyHistory idPrefix="wallet" items={movements} today={today} emptyMessage="No hay movimientos" getKey={(movement) => movement.id} renderItem={(movement) => <MovementRow movement={movement} />} />
    </section>
  );
}
