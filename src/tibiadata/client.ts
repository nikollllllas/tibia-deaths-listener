import { config } from '../config.js'
import type { Death } from '../types/death.js'

interface TibiaDataDeath {
  time: string
  level: number
  killers: { name: string; player: boolean }[]
}

// Deaths from tibia.com (via TibiaData, cached 5 min) show up immediately; GuildStats only refreshes once a day.
export async function getRecentDeaths(): Promise<Death[]> {
  const url = `https://api.tibiadata.com/v4/character/${encodeURIComponent(config.characterName)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(config.guildStatsTimeoutMs) })
  if (!res.ok) throw new Error(`TibiaData responded ${res.status} for ${url}`)
  const body = (await res.json()) as { character?: { deaths?: TibiaDataDeath[] } }
  return (body.character?.deaths ?? []).map((d) => {
    const killers = d.killers.map((k) => k.name)
    return { date: new Date(d.time), level: d.level, killer: killers.join(', '), killers, pvp: d.killers.some((k) => k.player) }
  })
}
