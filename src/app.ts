import express, { type ErrorRequestHandler } from 'express'
import swaggerUi from 'swagger-ui-express'
import { config } from './config.js'
import { GuildStatsError } from './guildstats/error.js'
import { openApiSpec } from './openapi.js'
import { deathsRouter } from './routes/deaths.js'
import { healthRouter } from './routes/health.js'
import { recordRouter } from './routes/record.js'
import { statsRouter } from './routes/stats.js'

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err)
  if (err instanceof GuildStatsError) {
    res.status(502).json({ error: 'Failed to fetch GuildStats', ...(!config.isProduction && { detail: err.message }) })
    return
  }
  res.status(500).json({ error: 'Internal server error', ...(!config.isProduction && { detail: String(err) }) })
}

export function createApp() {
  return express()
    .disable('x-powered-by')
    .use((_req, res, next) => {
      res.set('Access-Control-Allow-Origin', '*')
      next()
    })
    .use(healthRouter, statsRouter, deathsRouter, recordRouter)
    .get('/openapi.json', (_req, res) => {
      res.json(openApiSpec)
    })
    .use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec))
    .use((_req, res) => {
      res.status(404).json({ error: 'Not found' })
    })
    .use(errorHandler)
}
