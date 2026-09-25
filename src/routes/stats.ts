import { Router } from 'express'
import { config } from '../config.js'
import { deathJson, durationJson, iso, loadDeaths, recordJson } from '../services/deaths.js'
import { computeStats } from '../services/statistics.js'

export const statsRouter = Router().get('/stats', async (_req, res) => {
  const stats = computeStats(await loadDeaths(config.cutoffDate), new Date())
  res.json({
    character: config.characterName,
    cutoff: iso(config.cutoffDate),
    totalDeaths: stats.totalDeaths,
    lastDeath: stats.lastDeath && deathJson(stats.lastDeath),
    daysWithoutDeath: stats.daysWithoutDeath,
    timeWithoutDeath: stats.timeWithoutDeath && durationJson(stats.timeWithoutDeath),
    record: recordJson(stats.record),
  })
})
