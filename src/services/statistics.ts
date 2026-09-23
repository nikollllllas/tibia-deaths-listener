import type { Death } from '../types/death.js'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export interface Duration {
  days: number
  hours: number
  minutes: number
  totalMs: number
}

export interface DeathRecord extends Duration {
  from: Date
  to: Date | null
  ongoing: boolean
}

export interface Stats {
  totalDeaths: number
  lastDeath: Death | null
  daysWithoutDeath: number | null
  timeWithoutDeath: Duration | null
  record: DeathRecord | null
}

export function toDuration(ms: number): Duration {
  const totalMs = Math.max(0, ms)
  return {
    days: Math.floor(totalMs / DAY),
    hours: Math.floor((totalMs % DAY) / HOUR),
    minutes: Math.floor((totalMs % HOUR) / MINUTE),
    totalMs,
  }
}

export function filterSinceCutoff(deaths: Death[], cutoff: Date): Death[] {
  return deaths.filter((d) => d.date.getTime() >= cutoff.getTime())
}

export function computeRecord(deaths: Death[], now: Date): DeathRecord | null {
  const sorted = [...deaths].sort((a, b) => a.date.getTime() - b.date.getTime())
  let best: DeathRecord | null = null
  for (let i = 0; i < sorted.length; i++) {
    const from = sorted[i]!.date
    const to = sorted[i + 1]?.date ?? null
    const ms = (to ?? now).getTime() - from.getTime()
    if (!best || ms > best.totalMs) best = { ...toDuration(ms), from, to, ongoing: !to }
  }
  return best
}

export function computeStats(deaths: Death[], now: Date): Stats {
  const lastDeath = deaths.reduce<Death | null>(
    (latest, d) => (!latest || d.date > latest.date ? d : latest),
    null,
  )
  const timeWithoutDeath = lastDeath ? toDuration(now.getTime() - lastDeath.date.getTime()) : null
  return {
    totalDeaths: deaths.length,
    lastDeath,
    daysWithoutDeath: timeWithoutDeath?.days ?? null,
    timeWithoutDeath,
    record: computeRecord(deaths, now),
  }
}
