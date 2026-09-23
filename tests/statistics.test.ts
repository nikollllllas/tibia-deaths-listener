import { describe, expect, it } from 'vitest'
import { GuildStatsError } from '../src/guildstats/error.js'
import { loadDeathsSince } from '../src/services/deaths.js'
import { computeRecord, computeStats, filterSinceCutoff } from '../src/services/statistics.js'
import type { Death } from '../src/types/death.js'
import { fullPage, table } from './html.js'

const TZ = 'America/Sao_Paulo'
const CUTOFF = new Date('2026-09-14T16:51:00-03:00')
const d = (iso: string, level = 973): Death => ({
  date: new Date(`${iso}:00-03:00`),
  level,
  killer: 'dragon',
  killers: ['dragon'],
  pvp: false,
})

const SAMPLE = [
  d('2026-09-21T12:42'),
  d('2026-09-19T16:26'),
  d('2026-09-16T16:41'),
  d('2026-09-16T13:52'),
  d('2026-09-16T05:53'),
  d('2026-09-15T16:42'),
  d('2026-09-14T16:51'),
]

describe('statistics', () => {
  it('counts only deaths at or after the cutoff (cutoff death included)', () => {
    const deaths = filterSinceCutoff([...SAMPLE, d('2026-09-14T16:50'), d('2026-09-01T01:56')], CUTOFF)
    expect(deaths).toHaveLength(7)
    expect(computeStats(deaths, new Date()).totalDeaths).toBe(7)
  })

  it('finds the last death and floors days without death', () => {
    const stats = computeStats(SAMPLE, new Date('2026-09-23T10:00:00-03:00'))
    expect(stats.lastDeath?.date).toEqual(new Date('2026-09-21T12:42:00-03:00'))
    expect(stats.daysWithoutDeath).toBe(1)
    expect(stats.timeWithoutDeath).toMatchObject({ days: 1, hours: 21, minutes: 18 })
  })

  it('computes the record as the longest gap between consecutive deaths', () => {
    expect(computeRecord(SAMPLE, new Date('2026-09-23T10:00:00-03:00'))).toEqual({
      days: 2,
      hours: 23,
      minutes: 45,
      totalMs: ((2 * 24 + 23) * 60 + 45) * 60_000,
      from: new Date('2026-09-16T16:41:00-03:00'),
      to: new Date('2026-09-19T16:26:00-03:00'),
      ongoing: false,
    })
  })

  it('uses the ongoing streak when it beats every past gap', () => {
    expect(computeRecord(SAMPLE, new Date('2026-09-25T10:00:00-03:00'))).toMatchObject({
      days: 3,
      hours: 21,
      minutes: 18,
      from: new Date('2026-09-21T12:42:00-03:00'),
      to: null,
      ongoing: true,
    })
  })

  it('keeps the past record when the ongoing streak only ties it', () => {
    const now = new Date('2026-09-24T12:27:00-03:00')
    expect(computeRecord(SAMPLE, now)).toMatchObject({ ongoing: false, to: new Date('2026-09-19T16:26:00-03:00') })
  })

  it('computes a known interval between two deaths regardless of input order', () => {
    const rec = computeRecord([d('2026-09-17T18:51'), d('2026-09-14T16:51')], new Date('2026-09-17T19:51:00-03:00'))
    expect(rec).toMatchObject({ days: 3, hours: 2, minutes: 0, totalMs: (3 * 24 + 2) * 3_600_000, ongoing: false })
  })

  it('handles a single death (record is the ongoing streak)', () => {
    const stats = computeStats([d('2026-09-21T12:42')], new Date('2026-09-21T13:42:00-03:00'))
    expect(stats).toMatchObject({
      totalDeaths: 1,
      daysWithoutDeath: 0,
      record: { days: 0, hours: 1, minutes: 0, to: null, ongoing: true },
    })
  })

  it('handles no deaths', () => {
    expect(computeStats([], new Date())).toEqual({
      totalDeaths: 0,
      lastDeath: null,
      daysWithoutDeath: null,
      timeWithoutDeath: null,
      record: null,
    })
  })
})

describe('loadDeathsSince (pagination)', () => {
  const pages: Record<number, string> = {
    1: fullPage([{ when: '21-09-2026 12:42', level: 973 }, { when: '19-09-2026 16:26', level: 975 }], 4),
    2: table([{ when: '16-09-2026 16:41', level: 976 }, { when: '15-09-2026 16:42', level: 977 }]),
    3: table([{ when: '14-09-2026 16:51', level: 978 }, { when: '01-09-2026 01:56', level: 979 }]),
    4: table([{ when: '28-08-2026 02:19', level: 980 }]),
  }

  it('walks pages until it passes the cutoff and keeps deaths >= cutoff', async () => {
    const requested: number[] = []
    const deaths = await loadDeathsSince(CUTOFF, async (p) => (requested.push(p), pages[p]!), TZ)
    expect(requested).toEqual([1, 2, 3])
    expect(deaths.map((x) => x.level)).toEqual([973, 975, 976, 977, 978])
  })

  it('does not stop early just because a page ends on an unexpected row', async () => {
    const misordered: Record<number, string> = { ...pages, 2: table([{ when: '14-09-2026 16:51', level: 978 }, { when: '16-09-2026 16:41', level: 976 }]) }
    const requested: number[] = []
    await loadDeathsSince(CUTOFF, async (p) => (requested.push(p), misordered[p]!), TZ)
    expect(requested).toEqual([1, 2, 3])
  })

  it('deduplicates rows that shift between pages', async () => {
    const shifted: Record<number, string> = { ...pages, 2: table([{ when: '19-09-2026 16:26', level: 975 }, { when: '16-09-2026 16:41', level: 976 }]) }
    const deaths = await loadDeathsSince(CUTOFF, async (p) => shifted[p]!, TZ)
    expect(deaths.filter((x) => x.level === 975)).toHaveLength(1)
  })

  it('fails instead of silently truncating when a page is empty', async () => {
    const broken: Record<number, string> = { ...pages, 2: table([]) }
    await expect(loadDeathsSince(CUTOFF, async (p) => broken[p]!, TZ)).rejects.toThrow(GuildStatsError)
  })
})
