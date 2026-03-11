import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs'
import path from 'path'
import config from '../config.js'

const QUEUE_FILE = path.join(config.workDir, 'queue.json')
const QUEUE_TMP = path.join(config.workDir, 'queue.json.tmp')

let queue = []

export function loadQueue() {
  if (!existsSync(QUEUE_FILE)) return
  try {
    const data = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'))
    // Reset any in-flight jobs back to pending — they were interrupted mid-run
    queue = data.map(job =>
      job.status === 'processing' ? { ...job, status: 'pending' } : job
    )
    console.log(`Loaded ${queue.length} job(s) from queue.json`)
  } catch (err) {
    console.error('Failed to load queue, starting fresh:', err.message)
    queue = []
  }
}

export function saveQueue() {
  try {
    writeFileSync(QUEUE_TMP, JSON.stringify(queue, null, 2), 'utf8')
    renameSync(QUEUE_TMP, QUEUE_FILE)
  } catch (err) {
    console.error('Failed to save queue:', err.message)
  }
}

export function getQueue() {
  return queue
}

export function addJob(job) {
  queue.push(job)
  saveQueue()
}

export function removeJob(id) {
  queue = queue.filter(j => j.id !== id)
  saveQueue()
}

export function updateJob(id, patch) {
  const job = queue.find(j => j.id === id)
  if (job) Object.assign(job, patch)
}

export function getNextPending() {
  return queue.find(j => j.status === 'pending') || null
}
