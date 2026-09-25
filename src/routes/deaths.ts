import { Router } from 'express'
import { config } from '../config.js'
import { deathJson, iso, loadDeaths } from '../services/deaths.js'

export const deathsRouter = Router().get('/deaths', async (_req, res) => {
  const deaths = await loadDeaths(config.cutoffDate)
  res.json({
    character: config.characterName,
    cutoff: iso(config.cutoffDate),
    total: deaths.length,
    deaths: deaths.map(deathJson),
  })
})
