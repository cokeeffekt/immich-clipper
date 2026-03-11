import { mkdirSync } from 'fs'
import Fastify from 'fastify'
import config from './config.js'
import { loadQueue } from './services/queue.js'
import { triggerWorker } from './services/worker.js'
import { registerRoutes } from './router.js'

// Ensure work directory exists before anything else
mkdirSync(config.workDir, { recursive: true })

const app = Fastify({ logger: { level: 'info' } })

registerRoutes(app)

// Restore queue from disk and kick off the worker
loadQueue()
triggerWorker()

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  console.log(`Immich Clipper running on http://0.0.0.0:${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
