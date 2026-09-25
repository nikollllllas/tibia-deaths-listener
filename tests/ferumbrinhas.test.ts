import { describe, expect, it } from 'vitest'
import { parseGuildStatsDate } from '../src/guildstats/parser.js'
import { lastDeathSentence } from '../src/routes/ferumbrinhas.js'
import { mergeDeaths } from '../src/services/deaths.js'

describe('lastDeathSentence', () => {
  it('converts GuildStats CEST time to Brasília and joins killers', () => {
    // tibia.com: 2026-09-18T15:47Z; GuildStats shows 18-09-2026 17:47 (CEST)
    const date = parseGuildStatsDate('18-09-2026 17:47', 'Europe/Berlin')!
    expect(date.toISOString()).toBe('2026-09-18T15:47:00.000Z')
    const death = { date, level: 975, killer: '', killers: ['Chubiirou Marea', 'Ichgahal'], pvp: true }
    expect(lastDeathSentence(death, 'America/Sao_Paulo')).toBe(
      'A última morte foi em 18/09, às 12:47, para Chubiirou Marea e Ichgahal. ',
    )
  })
})

describe('mergeDeaths', () => {
  it('adds tibia.com deaths missing from GuildStats, deduping by minute + level', () => {
    const d = (iso: string, level: number, killer: string) => ({ date: new Date(iso), level, killer, killers: [killer], pvp: false })
    const guildStats = [d('2026-09-24T14:43:00Z', 976, 'radiant paragon')]
    const tibia = [d('2026-09-25T14:16:39Z', 975, 'trap'), d('2026-09-24T14:43:00Z', 976, 'radiant paragon')]
    expect(mergeDeaths(guildStats, tibia).map((x) => x.killer)).toEqual(['trap', 'radiant paragon'])
  })
})
