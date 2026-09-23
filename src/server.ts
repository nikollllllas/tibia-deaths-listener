import { createApp } from './app.js'
import { config } from './config.js'

createApp().listen(config.port, '0.0.0.0', () => {
  console.log(`Listening on http://0.0.0.0:${config.port}`)
})
