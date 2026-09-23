import express, { type ErrorRequestHandler } from 'express'
import { config } from './config.js'
import { GuildStatsError } from './guildstats/error.js'
import { openApiSpec } from './openapi.js'
import { deathsRouter } from './routes/deaths.js'
import { ferumbrinhasRouter } from './routes/ferumbrinhas.js'
import { healthRouter } from './routes/health.js'
import { recordRouter } from './routes/record.js'
import { statsRouter } from './routes/stats.js'

const docsHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>tibia-deaths-listener</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
<div id="docs"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#docs' })</script>
</body>
</html>`

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
    .use(healthRouter, statsRouter, deathsRouter, recordRouter, ferumbrinhasRouter)
    .get('/openapi.json', (_req, res) => {
      res.json(openApiSpec)
    })
    .get('/docs', (_req, res) => {
      res.type('html').send(docsHtml)
    })
    .use((_req, res) => {
      res.status(404).json({ error: 'Not found' })
    })
    .use(errorHandler)
}
