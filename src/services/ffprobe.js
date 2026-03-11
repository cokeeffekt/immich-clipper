import { spawn } from 'child_process'

export function getVideoMeta(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ])

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', d => { stdout += d })
    proc.stderr.on('data', d => { stderr += d })

    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`ffprobe failed: ${stderr.slice(0, 200)}`))
      try {
        const data = JSON.parse(stdout)
        const videoStream = data.streams?.find(s => s.codec_type === 'video')
        resolve({
          duration: parseFloat(data.format?.duration || 0),
          width: videoStream?.width || null,
          height: videoStream?.height || null,
        })
      } catch (err) {
        reject(new Error(`ffprobe parse error: ${err.message}`))
      }
    })

    proc.on('error', reject)
  })
}
