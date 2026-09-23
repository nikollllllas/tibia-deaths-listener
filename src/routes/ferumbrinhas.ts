import { Router } from 'express'
import { config } from '../config.js'
import { loadDeathsSince } from '../services/deaths.js'
import { computeStats } from '../services/statistics.js'

export const ferumbrinhasRouter = Router().get('/ferumbrinhas', async (_req, res) => {
  res.type('text/plain; charset=utf-8')
  try {
    const stats = computeStats(await loadDeathsSince(config.cutoffDate), new Date())
    res.send(
      `Estamos caçando há ${stats.daysWithoutDeath ?? 0} dias sem acidentes de trabalho. ` +
        `Nosso recorde atual é de ${stats.record?.days ?? 0} dias. ` +
        `No total de ${stats.totalDeaths} mortes atualizadas pelo GuildStats.`,
    )
  } catch (err) {
    console.error('[GET /ferumbrinhas]', err)
    res.status(502).send('Não consegui consultar o GuildStats agora, tenta de novo daqui a pouco.')
  }
})
