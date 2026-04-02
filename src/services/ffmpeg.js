import { spawn } from 'child_process'
import path from 'path'
import config from '../config.js'
import { getPresetById } from './presets.js'

export async function extractScreenshot(job) {
  const outputPath = path.join(config.workDir, `${job.id}.jpg`)
  const args = [
    '-y',
    '-ss', String(job.startTime),
    '-i', job.sourcePath,
    '-frames:v', '1',
    '-q:v', '1',
    outputPath,
  ]

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args)

    let stderr = ''
    proc.stderr.on('data', d => {
      stderr += d
      process.stdout.write(d)
    })

    proc.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`FFmpeg screenshot failed (code ${code}): ${stderr.slice(-500)}`))
      }
      resolve(outputPath)
    })

    proc.on('error', reject)
  })
}

export async function runFfmpeg(job) {
  const preset = await getPresetById(job.presetId)
  if (!preset) throw new Error(`Unknown preset: ${job.presetId}`)

  const outputPath = path.join(config.workDir, `${job.id}.mp4`)
  const args = buildArgs(job, preset, outputPath)

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args)

    let stderr = ''
    proc.stderr.on('data', d => {
      stderr += d
      process.stdout.write(d)
    })

    proc.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`FFmpeg failed (code ${code}): ${stderr.slice(-500)}`))
      }
      resolve(outputPath)
    })

    proc.on('error', reject)
  })
}

function buildArgs(job, preset, outputPath) {
  // -ss before -i: input-side seeking — fast even for large files
  const base = [
    '-y',
    '-ss', String(job.startTime),
    '-to', String(job.endTime),
    '-i', job.sourcePath,
  ]

  if (preset.mode === 'copy') {
    return [...base, '-c', 'copy', outputPath]
  }

  // encode mode
  const args = [...base]
  const vf = buildVideoFilter(preset)
  if (vf) args.push('-vf', vf)

  args.push(
    '-c:v', 'libx264',
    '-preset', preset.encodePreset || 'fast',
    '-crf', String(preset.crf ?? 23),
    '-c:a', 'aac',
    outputPath,
  )

  return args
}

function buildVideoFilter(preset) {
  const filters = []

  if (preset.cropW && preset.cropH) {
    const x = preset.cropX ?? `(iw-${preset.cropW})/2`
    const y = preset.cropY ?? `(ih-${preset.cropH})/2`
    filters.push(`crop=${preset.cropW}:${preset.cropH}:${x}:${y}`)
  }

  if (preset.scaleW && preset.scaleH) {
    filters.push(`scale=${preset.scaleW}:${preset.scaleH}`)
  }

  return filters.join(',')
}
