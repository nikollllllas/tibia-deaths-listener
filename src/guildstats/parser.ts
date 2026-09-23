import * as cheerio from 'cheerio'
import type { Death } from '../types/death.js'
import { zonedTimeToDate } from '../time.js'
import { GuildStatsError } from './error.js'

export interface DeathsPage {
  deaths: Death[]
  totalPages: number
}

const DATE_RE = /(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/

const COLUMNS = {
  date: /^(when|quando)\b/i,
  killer: /^(killed by|morto por)\b/i,
  level: /^(lvl|level|nível|nivel)\b/i,
}

export function parseGuildStatsDate(text: string, timeZone: string): Date | null {
  const m = text.match(DATE_RE)
  if (!m) return null
  const [, dd, mm, yyyy, hh, min] = m.map(Number) as [number, number, number, number, number, number]
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || hh > 23 || min > 59) return null
  return zonedTimeToDate(yyyy, mm, dd, hh, min, timeZone)
}

export function parseDeathsPage(html: string, timeZone: string): DeathsPage {
  const $ = cheerio.load(html)
  const table = $('#death-table-wrapper table').first().length
    ? $('#death-table-wrapper table').first()
    : $('table').first()
  if (!table.length) throw new GuildStatsError('Deaths table not found in GuildStats HTML')

  const headers = table.find('thead th').map((_, th) => $(th).text().replace(/\s+/g, ' ').trim()).get()
  const col = (re: RegExp) => headers.findIndex((h) => re.test(h))
  const dateIdx = col(COLUMNS.date)
  const killerIdx = col(COLUMNS.killer)
  const levelIdx = col(COLUMNS.level)
  if (dateIdx < 0 || killerIdx < 0 || levelIdx < 0) {
    throw new GuildStatsError(`Unexpected deaths table headers: ${JSON.stringify(headers)}`)
  }

  const deaths: Death[] = []
  table.find('tbody > tr').each((_, tr) => {
    const cells = $(tr).children('td')
    const date = parseGuildStatsDate(cells.eq(dateIdx).text(), timeZone)
    const level = Number.parseInt(cells.eq(levelIdx).text().trim(), 10)
    if (!date || !Number.isFinite(level)) return

    const killerCell = cells.eq(killerIdx)
    let killers = killerCell
      .find('a, span.text-gray-300')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean)
    if (!killers.length) {
      const clone = killerCell.clone()
      clone.find('[x-show]').remove()
      const text = clone.text().replace(/\s+/g, ' ').trim()
      killers = text ? [text] : []
    }

    deaths.push({
      date,
      level,
      killer: killers.join(', '),
      killers,
      pvp: killerCell.find('.fa-user, a[href^="/character/"]').length > 0,
    })
  })

  const pagination = html.match(/deathPagination\(\s*(\d+)\s*,/)
  const totalPages = pagination ? Math.max(1, Number(pagination[1])) : 1
  return { deaths, totalPages }
}
