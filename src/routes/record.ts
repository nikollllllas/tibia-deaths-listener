import { Router } from 'express'
import { config } from '../config.js'
import { loadDeaths, recordJson } from '../services/deaths.js'
import { computeRecord } from '../services/statistics.js'

const EMPTY = { days: null, hours: null, minutes: null, from: null, to: null, ongoing: false }

export const recordRouter = Router().get('/record', async (_req, res) => {
  res.json(recordJson(computeRecord(await loadDeaths(config.cutoffDate), new Date())) ?? EMPTY)
})
