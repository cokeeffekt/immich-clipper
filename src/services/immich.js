import { createReadStream, statSync } from 'fs'
import { basename } from 'path'
import { request as httpRequest } from 'http'
import { request as httpsRequest } from 'https'
import FormData from 'form-data'
import config from '../config.js'

const albumCache = new Map() // albumName → albumId

export async function uploadAsset(filePath, job) {
  if (!config.immichUrl || !config.immichApiKey) {
    throw new Error('IMMICH_URL and IMMICH_API_KEY must be set to upload')
  }

  const filename = basename(filePath)
  const fileSize = statSync(filePath).size
  const now = new Date().toISOString()
  const isImage = filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png')

  const form = new FormData()
  form.append('deviceAssetId', job.id)
  form.append('deviceId', 'immich-clipper')
  form.append('fileCreatedAt', now)
  form.append('fileModifiedAt', now)
  form.append('assetData', createReadStream(filePath), {
    filename,
    contentType: isImage ? 'image/jpeg' : 'video/mp4',
    knownLength: fileSize,
  })

  const url = new URL(`${config.immichUrl}/assets`)
  const requester = url.protocol === 'https:' ? httpsRequest : httpRequest

  const body = await new Promise((resolve, reject) => {
    const req = requester(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'x-api-key': config.immichApiKey,
          ...form.getHeaders(),
        },
      },
      (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      }
    )
    req.on('error', reject)
    form.pipe(req)
  })

  if (body.status < 200 || body.status >= 300) {
    throw new Error(`Immich upload failed (${body.status}): ${body.body}`)
  }

  return JSON.parse(body.body).id
}

export async function getOrCreateAlbum(albumName) {
  if (albumCache.has(albumName)) return albumCache.get(albumName)

  const listRes = await fetch(`${config.immichUrl}/albums`, {
    headers: { 'x-api-key': config.immichApiKey },
  })
  if (!listRes.ok) throw new Error(`Immich list albums failed (${listRes.status})`)

  const albums = await listRes.json()
  const existing = albums.find(a => a.albumName === albumName)
  if (existing) {
    albumCache.set(albumName, existing.id)
    return existing.id
  }

  const createRes = await fetch(`${config.immichUrl}/albums`, {
    method: 'POST',
    headers: {
      'x-api-key': config.immichApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ albumName }),
  })
  if (!createRes.ok) throw new Error(`Immich create album failed (${createRes.status})`)

  const album = await createRes.json()
  albumCache.set(albumName, album.id)
  return album.id
}

export async function addToAlbum(albumId, assetIds) {
  const res = await fetch(`${config.immichUrl}/albums/${albumId}/assets`, {
    method: 'PUT',
    headers: {
      'x-api-key': config.immichApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids: assetIds }),
  })
  if (!res.ok) throw new Error(`Immich add to album failed (${res.status})`)
}
