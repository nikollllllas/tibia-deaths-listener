import { config } from '../config.js'
import { getDeathsPage } from '../guildstats/client.js'
import { GuildStatsError } from '../guildstats/error.js'
import { parseDeathsPage } from '../guildstats/parser.js'
import { getRecentDeaths } from '../tibiadata/client.js'
import { formatInZone } from '../time.js'
import type { Death } from '../types/death.js'
import { filterSinceCutoff, type DeathRecord, type Duration } from './statistics.js'

export async function loadDeathsSince(
  cutoff: Date,
  getPage: (page: number) => Promise<string> = getDeathsPage,
  timeZone: string = config.guildStatsTimeZone,
): Promise<Death[]> {
  const first = parseDeathsPage(await getPage(1), timeZone)
  const all = [...first.deaths]
  let current = first.deaths

  for (let page = 2; page <= first.totalPages; page++) {
    if (current.some((d) => d.date < cutoff)) break
    current = parseDeathsPage(await getPage(page), timeZone).deaths
    if (!current.length) {
      throw new GuildStatsError(`Page ${page} of ${first.totalPages} has no deaths`)
    }
    all.push(...current)
  }

  const unique = new Map(all.map((d) => [`${d.date.getTime()}|${d.level}|${d.killer}`, d]))
  return filterSinceCutoff([...unique.values()], cutoff).sort((a, b) => b.date.getTime() - a.date.getTime())
}

// GuildStats has minute precision; tibia.com has seconds.
const deathKey = (d: Death) => `${Math.floor(d.date.getTime() / 60_000)}|${d.level}`

export function mergeDeaths(base: Death[], recent: Death[]): Death[] {
  const seen = new Set(base.map(deathKey))
  return [...base, ...recent.filter((d) => !seen.has(deathKey(d)))].sort((a, b) => b.date.getTime() - a.date.getTime())
}

// GuildStats has the full history but refreshes once a day; tibia.com fills in the deaths since then.
export async function loadDeaths(cutoff: Date): Promise<Death[]> {
  const [base, recent] = await Promise.all([
    loadDeathsSince(cutoff),
    getRecentDeaths().catch((err) => {
      console.error('[TibiaData] falling back to GuildStats only:', err)
      return []
    }),
  ])
  return filterSinceCutoff(mergeDeaths(base, recent), cutoff)
}

export const iso = (date: Date) => formatInZone(date, config.timeZone)

export const deathJson = (d: Death) => ({
  date: iso(d.date),
  level: d.level,
  killer: d.killer,
  killers: d.killers,
  pvp: d.pvp,
})

export const durationJson = ({ days, hours, minutes }: Duration) => ({ days, hours, minutes })

export const recordJson = (r: DeathRecord | null) =>
  r && { ...durationJson(r), from: iso(r.from), to: r.to && iso(r.to), ongoing: r.ongoing }
