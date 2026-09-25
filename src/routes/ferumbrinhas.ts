import { Router } from 'express'
import { config } from '../config.js'
import { loadDeaths } from '../services/deaths.js'
import { computeStats } from '../services/statistics.js'
import type { Death } from '../types/death.js'

export function lastDeathSentence(d: Death, timeZone: string): string {
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: '2-digit' }).format(d.date)
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(d.date)
  const killers = new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(d.killers)
  return `A última morte foi em ${date}, às ${time}, para ${killers}. `
}

export const ferumbrinhasRouter = Router().get('/ferumbrinhas', async (_req, res) => {
  res.type('text/plain; charset=utf-8')
  try {
    const stats = computeStats(await loadDeaths(config.cutoffDate), new Date())
    res.send(
      `Estamos caçando há ${stats.daysWithoutDeath ?? 0} dias sem acidentes de trabalho. ` +
        (stats.lastDeath ? lastDeathSentence(stats.lastDeath, config.timeZone) : '') +
        `Nosso recorde atual é de ${stats.record?.days ?? 0} dias. ` +
        `No total de ${stats.totalDeaths} mortes atualizadas pelo GuildStats.`,
    )
  } catch (err) {
    console.error('[GET /ferumbrinhas]', err)
    res.status(502).send('Não consegui consultar o GuildStats agora, tenta de novo daqui a pouco.')
  }
})
