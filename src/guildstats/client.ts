import { config } from '../config.js'
import { GuildStatsError } from './error.js'

export function deathsPageUrl(page = 1): string {
  const params = new URLSearchParams({ nick: config.characterName, tab: 'deaths' })
  if (page > 1) {
    params.set('part', 'table')
    params.set('page', String(page))
  }
  return `${config.guildStatsBaseUrl}/include/character/tab.php?${params}`
}

export async function getDeathsPage(page = 1): Promise<string> {
  const url = deathsPageUrl(page)
  let res: Response
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(config.guildStatsTimeoutMs),
      headers: { 'User-Agent': 'tibia-deaths-listener/1.0', Accept: 'text/html' },
    })
  } catch (err) {
    throw new GuildStatsError(`Request to ${url} failed: ${(err as Error).message}`)
  }
  if (!res.ok) throw new GuildStatsError(`GuildStats responded ${res.status} for ${url}`)
  return res.text()
}
