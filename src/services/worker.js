import { unlink } from 'fs/promises'
import { saveQueue, getNextPending, updateJob } from './queue.js'
import { runFfmpeg, extractScreenshot } from './ffmpeg.js'
import { uploadAsset, getOrCreateAlbum, addToAlbum } from './immich.js'
import config from '../config.js'

let running = false

async function processNext() {
  const job = getNextPending()
  if (!job) {
    running = false
    return
  }

  updateJob(job.id, { status: 'processing' })
  saveQueue()

  try {
    const outputPath = job.type === 'screenshot'
      ? await extractScreenshot(job)
      : await runFfmpeg(job)

    const assetId = await uploadAsset(outputPath, job)

    const albumName = job.album || config.immichAlbum
    if (albumName) {
      const albumId = await getOrCreateAlbum(albumName)
      await addToAlbum(albumId, [assetId])
    }

    try { await unlink(outputPath) } catch {}

    updateJob(job.id, { status: 'done' })
    console.log(`Job ${job.id} completed`)
  } catch (err) {
    console.error(`Job ${job.id} failed:`, err.message)
    updateJob(job.id, { status: 'error', error: err.message })
  }

  saveQueue()
  setImmediate(processNext)
}

export function triggerWorker() {
  if (running) return
  running = true
  processNext()
}
