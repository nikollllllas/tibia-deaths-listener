import { httpServerHandler } from 'cloudflare:node'
import { createApp } from './app.js'

createApp().listen(8080)

export default httpServerHandler({ port: 8080 })
