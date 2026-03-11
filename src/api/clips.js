import { randomUUID } from 'crypto'
import path from 'path'
import config from '../config.js'
import { getQueue, addJob, removeJob } from '../services/queue.js'
import { triggerWorker } from '../services/worker.js'

function guardSourcePath(reqPath) {
  const resolved = path.resolve(config.sourceDir, reqPath || '')
  const rel = path.relative(config.sourceDir, resolved)
  if (rel.startsWith('..')) throw new Error('Invalid source path')
  return resolved
}

export async function handleListClips(req, reply) {
  reply.send(getQueue())
}

export async function handleAddClip(req, reply) {
  const { sourcePath, startTime, endTime, presetId, label, album } = req.body || {}

  if (!sourcePath || startTime == null || endTime == null || !presetId) {
    return reply.status(400).send({ error: 'sourcePath, startTime, endTime, presetId required' })
  }
  if (typeof startTime !== 'number' || typeof endTime !== 'number') {
    return reply.status(400).send({ error: 'startTime and endTime must be numbers' })
  }
  if (endTime <= startTime) {
    return reply.status(400).send({ error: 'endTime must be greater than startTime' })
  }

  let absoluteSourcePath
  try {
    absoluteSourcePath = guardSourcePath(sourcePath)
  } catch {
    return reply.status(400).send({ error: 'Invalid source path' })
  }

  const job = {
    id: randomUUID(),
    sourcePath: absoluteSourcePath,
    startTime,
    endTime,
    presetId,
    label: label || '',
    album: album || '',
    status: 'pending',
    error: null,
    createdAt: new Date().toISOString(),
  }

  addJob(job)
  triggerWorker()
  reply.status(201).send(job)
}

export async function handleDeleteClip(req, reply) {
  const { id } = req.params
  const queue = getQueue()
  const job = queue.find(j => j.id === id)

  if (!job) return reply.status(404).send({ error: 'Job not found' })
  if (job.status === 'processing') return reply.status(409).send({ error: 'Cannot cancel in-progress job' })

  removeJob(id)
  reply.send({ ok: true })
}
