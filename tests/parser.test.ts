import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GuildStatsError } from '../src/guildstats/error.js'
import { parseDeathsPage, parseGuildStatsDate } from '../src/guildstats/parser.js'
import { fullPage, monster, pvp, table } from './html.js'

const TZ = 'America/Sao_Paulo'
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parseGuildStatsDate', () => {
  it('interprets DD-MM-YYYY HH:mm as Brasília time', () => {
    expect(parseGuildStatsDate('21-09-2026 12:42', TZ)?.toISOString()).toBe('2026-09-21T15:42:00.000Z')
    expect(parseGuildStatsDate('14-09-2026 16:51', TZ)?.getTime()).toBe(
      new Date('2026-09-14T16:51:00-03:00').getTime(),
    )
  })

  it('rejects garbage', () => {
    expect(parseGuildStatsDate('no date here', TZ)).toBeNull()
    expect(parseGuildStatsDate('40-13-2026 25:00', TZ)).toBeNull()
  })
})

describe('parseDeathsPage', () => {
  it('parses a normal death', () => {
    const { deaths } = parseDeathsPage(table([{ when: '21-09-2026 12:42', level: 973, killerHtml: monster('dreadful harvester') }]), TZ)
    expect(deaths).toEqual([
      {
        date: new Date('2026-09-21T12:42:00-03:00'),
        level: 973,
        killer: 'dreadful harvester',
        killers: ['dreadful harvester'],
        pvp: false,
      },
    ])
  })

  it('parses a PvP death with several killers, ignoring tooltip and level text', () => {
    const { deaths } = parseDeathsPage(
      table([{ when: '18-09-2026 17:47', level: 975, killerHtml: pvp('Some Player', 975, 'Ichgahal') }]),
      TZ,
    )
    expect(deaths[0]).toMatchObject({ killer: 'Some Player, Ichgahal', killers: ['Some Player', 'Ichgahal'], pvp: true })
  })

  it('parses multiple deaths in page order and reads the total page count', () => {
    const html = fullPage(
      [
        { when: '21-09-2026 12:42', level: 973 },
        { when: '20-09-2026 04:46', level: 974 },
        { when: '19-09-2026 16:26', level: 975 },
      ],
      5,
    )
    const { deaths, totalPages } = parseDeathsPage(html, TZ)
    expect(totalPages).toBe(5)
    expect(deaths.map((d) => d.level)).toEqual([973, 974, 975])
  })

  it('returns no deaths for an empty table and defaults to 1 page', () => {
    expect(parseDeathsPage(table([]), TZ)).toEqual({ deaths: [], totalPages: 1 })
  })

  it('skips rows that are not deaths', () => {
    const html = table([{ when: '21-09-2026 12:42', level: 973 }]).replace(
      '<tbody>',
      '<tbody><tr><td colspan="5">No deaths</td></tr>',
    )
    expect(parseDeathsPage(html, TZ).deaths).toHaveLength(1)
  })

  it('throws GuildStatsError on HTML without the deaths table', () => {
    expect(() => parseDeathsPage('<html><body>Character not found</body></html>', TZ)).toThrow(GuildStatsError)
    expect(() => parseDeathsPage('<table><thead><tr><th>Foo</th></tr></thead></table>', TZ)).toThrow(GuildStatsError)
  })

  it('parses the real GuildStats first page (snapshot 2026-09-23)', () => {
    const { deaths, totalPages } = parseDeathsPage(fixture('deaths-page1.html'), TZ)
    expect(totalPages).toBe(5)
    expect(deaths).toHaveLength(20)
    expect(deaths[0]).toMatchObject({ level: 973, killer: 'dreadful harvester', pvp: false })
    expect(deaths[0]!.date.toISOString()).toBe('2026-09-21T15:42:00.000Z')
    expect(deaths[3]).toMatchObject({ level: 975, killers: ['Chubiirou Marea', 'Ichgahal'], pvp: true })
  })

  it('parses a real `part=table` page fragment', () => {
    const { deaths, totalPages } = parseDeathsPage(fixture('deaths-page2.html'), TZ)
    expect(totalPages).toBe(5)
    expect(deaths.length).toBeGreaterThan(0)
    expect(deaths[0]!.date.toISOString()).toBe('2026-07-31T00:49:00.000Z')
  })
})
