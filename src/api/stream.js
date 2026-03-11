import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import path from 'path'
import config from '../config.js'

const MIME = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.MP4': 'video/mp4',
  '.MOV': 'video/quicktime',
  '.MKV': 'video/x-matroska',
}

function guardPath(requestedPath, baseDir) {
  const resolved = path.resolve(baseDir, requestedPath || '')
  const rel = path.relative(baseDir, resolved)
  if (rel.startsWith('..')) throw new Error('Invalid path')
  return resolved
}

export async function handleStream(req, reply) {
  const { path: reqPath } = req.query
  if (!reqPath) return reply.status(400).send({ error: 'path required' })

  let filePath
  try {
    filePath = guardPath(reqPath, config.sourceDir)
  } catch {
    return reply.status(400).send({ error: 'Invalid path' })
  }

  let fileStat
  try {
    fileStat = await stat(filePath)
  } catch {
    return reply.status(404).send({ error: 'File not found' })
  }

  const fileSize = fileStat.size
  const mime = MIME[path.extname(filePath)] || 'video/mp4'
  const rangeHeader = req.headers.range

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1)
    const chunkSize = end - start + 1

    reply.status(206)
    reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
    reply.header('Accept-Ranges', 'bytes')
    reply.header('Content-Length', String(chunkSize))
    reply.header('Content-Type', mime)
    return reply.send(createReadStream(filePath, { start, end }))
  }

  reply.header('Content-Length', String(fileSize))
  reply.header('Accept-Ranges', 'bytes')
  reply.header('Content-Type', mime)
  return reply.send(createReadStream(filePath))
}
