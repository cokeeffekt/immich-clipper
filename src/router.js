import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import { browsePage } from './views/browser.js'
import { editorPage } from './views/editor.js'
import { handleBrowseApi, handleMetaApi } from './api/browse.js'
import { handleStream } from './api/stream.js'
import { handleListClips, handleAddClip, handleDeleteClip } from './api/clips.js'
import { handleListPresets, handleCreatePreset, handleDeletePreset } from './api/presets.js'
import { handleListAlbums } from './api/albums.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '../public')

export function registerRoutes(app) {
  // Pages
  app.get('/', (req, reply) => reply.redirect('/browse'))
  app.get('/browse', (req, reply) => reply.type('text/html').send(browsePage()))
  app.get('/browse/*', (req, reply) => reply.type('text/html').send(browsePage()))
  app.get('/editor', (req, reply) => reply.type('text/html').send(editorPage()))

  // Static public assets (JS files)
  app.get('/js/:file', async (req, reply) => {
    const filename = req.params.file
    if (!/^[a-z0-9_-]+\.js$/.test(filename)) return reply.status(404).send()
    try {
      const content = await readFile(path.join(PUBLIC_DIR, 'js', filename), 'utf8')
      reply.type('application/javascript').send(content)
    } catch {
      reply.status(404).send()
    }
  })

  // Browse API
  app.get('/api/browse', handleBrowseApi)
  app.get('/api/browse/*', handleBrowseApi)
  app.get('/api/meta', handleMetaApi)

  // Video stream
  app.get('/api/stream', handleStream)

  // Presets
  app.get('/api/presets', handleListPresets)
  app.post('/api/presets', handleCreatePreset)
  app.delete('/api/presets/:id', handleDeletePreset)

  // Albums (proxied from Immich)
  app.get('/api/albums', handleListAlbums)

  // Clip queue
  app.get('/api/clips', handleListClips)
  app.post('/api/clips', handleAddClip)
  app.delete('/api/clips/:id', handleDeleteClip)
}
