import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import config from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BUILTIN_PATH = path.resolve(__dirname, '../../data/presets.json')
const CUSTOM_PATH = path.join(config.workDir, 'custom-presets.json')

export async function getAllPresets() {
  const builtin = JSON.parse(await readFile(BUILTIN_PATH, 'utf8'))
  let custom = []
  if (existsSync(CUSTOM_PATH)) {
    try {
      custom = JSON.parse(await readFile(CUSTOM_PATH, 'utf8'))
    } catch {}
  }
  return [...builtin, ...custom]
}

export async function getPresetById(id) {
  const all = await getAllPresets()
  return all.find(p => p.id === id) || null
}

export async function getCustomPresets() {
  if (!existsSync(CUSTOM_PATH)) return []
  try {
    return JSON.parse(await readFile(CUSTOM_PATH, 'utf8'))
  } catch {
    return []
  }
}

export async function saveCustomPresets(presets) {
  await writeFile(CUSTOM_PATH, JSON.stringify(presets, null, 2), 'utf8')
}
