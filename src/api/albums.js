import config from '../config.js'

export async function handleListAlbums(req, reply) {
  if (!config.immichUrl || !config.immichApiKey) return reply.send([])
  try {
    const res = await fetch(`${config.immichUrl}/albums`, {
      headers: { 'x-api-key': config.immichApiKey },
    })
    if (!res.ok) return reply.send([])
    const albums = await res.json()
    reply.send(albums.map(a => ({ id: a.id, name: a.albumName })))
  } catch {
    reply.send([])
  }
}
