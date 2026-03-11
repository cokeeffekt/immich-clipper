import { randomUUID } from 'crypto'
import {
  getAllPresets,
  getCustomPresets,
  saveCustomPresets,
} from '../services/presets.js'

export async function handleListPresets(req, reply) {
  try {
    reply.send(await getAllPresets())
  } catch (err) {
    reply.status(500).send({ error: err.message })
  }
}

export async function handleCreatePreset(req, reply) {
  const { name, description, mode, ...rest } = req.body || {}
  if (!name || !mode) return reply.status(400).send({ error: 'name and mode required' })

  const preset = {
    id: randomUUID(),
    name,
    description: description || '',
    builtin: false,
    mode,
    ...rest,
  }

  const custom = await getCustomPresets()
  custom.push(preset)
  await saveCustomPresets(custom)
  reply.status(201).send(preset)
}

export async function handleDeletePreset(req, reply) {
  const { id } = req.params
  const all = await getAllPresets()
  const preset = all.find(p => p.id === id)

  if (!preset) return reply.status(404).send({ error: 'Preset not found' })
  if (preset.builtin) return reply.status(403).send({ error: 'Cannot delete a built-in preset' })

  const custom = await getCustomPresets()
  await saveCustomPresets(custom.filter(p => p.id !== id))
  reply.send({ ok: true })
}
