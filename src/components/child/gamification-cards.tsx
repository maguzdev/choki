"use client";

import { Check, History, LockKeyhole, Trophy, Zap } from "lucide-react";

import { MonthlyHistory } from "@/components/shared/monthly-history";
import type { ChildGamificationData } from "@/lib/data/gamification";

function ProgressBar({ value, tone = "bg-xp-500" }: { value: number; tone?: string }) {
  return <div className="h-3 overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><div className={`h-full rounded-full transition-[width] ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function CurrentLevelCard({ data }: { data: ChildGamificationData }) {
  const full = data.levels.find((level) => level.id === data.level.current.id)!;
  return <section className="rounded-card bg-choco-800 p-5 text-cream-50 shadow-soft">
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-cream-200">Nivel {full.number}</p><h2 className="font-display text-3xl font-bold">{full.icon} {full.name}</h2></div><span className="rounded-full bg-xp-500/20 px-3 py-1 font-bold text-violet-200"><Zap className="mr-1 inline size-4" />{data.xp} XP</span></div>
    <div className="mt-4"><ProgressBar value={data.level.percent} /></div>
    <p className="mt-2 text-sm text-cream-200">{data.level.next ? `Te faltan ${Math.max(0, data.level.next.xpRequired - data.xp)} XP para ${data.level.next.name}.` : "Alcanzaste el nivel más alto configurado."}</p>
    {full.benefit ? <p className="mt-2 text-sm font-semibold text-caramel-400">Beneficio: {full.benefit}</p> : null}
  </section>;
}

export function LevelsList({ levels, xp }: { levels: ChildGamificationData["levels"]; xp: number }) {
  return <section><h2 className="font-display text-2xl font-bold text-choco-800">Camino de niveles</h2><div className="mt-3 space-y-2">{levels.map((level) => {
    const reached = xp >= level.xpRequired;
    return <article key={level.id} className={`flex items-center gap-3 rounded-xl border p-3 ${reached ? "border-xp-500/30 bg-xp-500/5" : "border-cream-200 bg-cream-50"}`}><span className="flex size-11 items-center justify-center rounded-full bg-white text-2xl">{level.icon}</span><div className="min-w-0 flex-1"><p className="font-bold text-choco-800">Nivel {level.number} · {level.name}</p><p className="text-xs text-choco-600">Desde {level.xpRequired} XP{level.description ? ` · ${level.description}` : ""}</p></div>{reached ? <Check aria-label="Alcanzado" className="size-5 text-success-500" /> : <LockKeyhole aria-label="Pendiente" className="size-5 text-choco-400" />}</article>;
  })}</div></section>;
}

export function AchievementsGrid({ achievements }: { achievements: ChildGamificationData["achievements"] }) {
  return <section><h2 className="font-display text-2xl font-bold text-choco-800">Logros</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{achievements.map((achievement) => {
    const lockedHidden = achievement.hidden && !achievement.unlockedAt;
    return <article key={achievement.id} className={`rounded-card border p-4 text-center shadow-soft ${achievement.unlockedAt ? "border-points-500/40 bg-points-500/10" : "border-cream-200 bg-cream-50"}`}><span className="text-4xl" aria-hidden="true">{lockedHidden ? "❔" : achievement.icon}</span><h3 className="mt-2 font-display text-lg font-bold text-choco-800">{lockedHidden ? "Logro secreto" : achievement.name}</h3><p className="mt-1 text-xs leading-5 text-choco-600">{lockedHidden ? "Sigue avanzando para descubrirlo." : achievement.description}</p><p className="mt-2 text-xs font-bold text-xp-500">+{achievement.xpReward} XP · +{achievement.pointsReward} pts</p>{achievement.unlockedAt ? <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-success-500"><Trophy className="size-3.5" /> Desbloqueado</span> : null}</article>;
  })}</div></section>;
}

export function ChallengesList({ challenges }: { challenges: ChildGamificationData["challenges"] }) {
  return <section><h2 className="font-display text-2xl font-bold text-choco-800">Retos activos</h2><div className="mt-3 space-y-3">{challenges.map((challenge) => {
    const percent = challenge.targetValue ? challenge.currentValue * 100 / challenge.targetValue : 0;
    return <article key={challenge.id} className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><div className="flex gap-3"><span className="text-3xl">{challenge.icon}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h3 className="font-display text-xl font-bold">{challenge.name}</h3><span className="shrink-0 text-sm font-bold text-goal-500">{Math.min(challenge.currentValue, challenge.targetValue)}/{challenge.targetValue}</span></div><p className="text-sm text-choco-600">{challenge.description}</p></div></div><div className="mt-3"><ProgressBar value={percent} tone="bg-goal-500" /></div><p className="mt-2 text-xs text-choco-600">Hasta {challenge.endsOn} · recompensa +{challenge.xpReward} XP y +{challenge.pointsReward} puntos</p>{challenge.completed ? <p className="mt-1 font-bold text-success-500">✓ Reto completado</p> : null}</article>;
  })}{challenges.length === 0 ? <p className="rounded-card border border-cream-200 bg-cream-50 p-5 text-sm text-choco-600">No hay retos activos hoy.</p> : null}</div></section>;
}

export function RankingList({ ranking, childId }: { ranking: ChildGamificationData["ranking"]; childId: string }) {
  return <section><h2 className="font-display text-2xl font-bold text-choco-800">Ranking familiar</h2><p className="text-sm text-choco-600">Una referencia amistosa entre hermanos.</p><ol className="mt-3 space-y-2">{ranking.map((profile, index) => <li key={profile.id} className={`flex items-center gap-3 rounded-xl border p-3 ${profile.id === childId ? "border-caramel-400 bg-caramel-400/10" : "border-cream-200 bg-cream-50"}`}><span className="w-6 text-center font-display text-xl font-bold">{index + 1}</span><span className="flex size-10 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: `${profile.color}22` }}>{profile.avatarEmoji}</span><span className="flex-1 font-bold">{profile.name}{profile.id === childId ? " · Tú" : ""}</span><span className="font-bold text-xp-500">{profile.xp} XP</span></li>)}</ol></section>;
}

export function ScoreHistory({ movements, today }: { movements: ChildGamificationData["history"]; today: string }) {
  return <section><div className="flex items-center gap-2"><History aria-hidden="true" className="size-5 text-caramel-600" /><h2 className="font-display text-2xl font-bold text-choco-800">Historial de progreso</h2></div><p className="mt-1 text-sm text-choco-600">Revisa cómo ganaste o usaste tu XP y tus puntos.</p><MonthlyHistory idPrefix="score" items={movements} today={today} emptyMessage="No hay movimientos de progreso" getKey={(movement) => `${movement.kind}-${movement.id}`} renderItem={(movement) => <article className="flex items-center justify-between gap-3 rounded-xl border border-cream-200 bg-white p-3"><div><p className="font-semibold text-choco-800">{movement.description === "1 productos vendidos" ? "1 producto vendido" : movement.description}{movement.referenceId && movement.reason === "SALE" ? ` · #${movement.referenceId.slice(0, 4).toUpperCase()}` : ""}</p><p className="text-xs text-choco-600">{movement.kind === "XP" ? "Experiencia" : "Puntos"}</p></div><span className={`shrink-0 font-bold ${movement.kind === "XP" ? "text-xp-500" : "text-caramel-600"}`}>{movement.amount > 0 ? "+" : ""}{movement.amount} {movement.kind === "XP" ? "XP" : "pts"}</span></article>} /></section>;
}
