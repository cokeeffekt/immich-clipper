import { readdir } from 'fs/promises'
import path from 'path'
import config from '../config.js'
import { getVideoMeta } from '../services/ffprobe.js'

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.MP4', '.MOV', '.MKV'])

function guardPath(requestedPath, baseDir) {
  const resolved = path.resolve(baseDir, requestedPath || '')
  const rel = path.relative(baseDir, resolved)
  if (rel.startsWith('..')) throw new Error('Invalid path')
  return resolved
}

export async function handleBrowseApi(req, reply) {
  const subPath = req.params['*'] || ''

  let dirPath
  try {
    dirPath = guardPath(subPath, config.sourceDir)
  } catch {
    return reply.status(400).send({ error: 'Invalid path' })
  }

  let entries
  try {
    entries = await readdir(dirPath, { withFileTypes: true })
  } catch {
    return reply.status(404).send({ error: 'Directory not found' })
  }

  const results = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const entryPath = subPath ? `${subPath}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      results.push({ name: entry.name, type: 'dir', path: entryPath })
    } else if (entry.isFile() && VIDEO_EXTS.has(path.extname(entry.name))) {
      results.push({ name: entry.name, type: 'file', path: entryPath })
    }
  }

  results.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  reply.send(results)
}

export async function handleMetaApi(req, reply) {
  const { path: reqPath } = req.query
  if (!reqPath) return reply.status(400).send({ error: 'path required' })

  let filePath
  try {
    filePath = guardPath(reqPath, config.sourceDir)
  } catch {
    return reply.status(400).send({ error: 'Invalid path' })
  }

  try {
    const meta = await getVideoMeta(filePath)
    reply.send(meta)
  } catch (err) {
    reply.status(500).send({ error: err.message })
  }
}
