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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        Referer: 'https://guildstats.eu/',
      },
    })
  } catch (err) {
    throw new GuildStatsError(`Request to ${url} failed: ${(err as Error).message}`)
  }
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)
    throw new GuildStatsError(`GuildStats responded ${res.status} for ${url}: ${body}`)
  }
  return res.text()
}
