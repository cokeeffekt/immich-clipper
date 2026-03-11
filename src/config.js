import { resolve } from 'path'

const config = Object.freeze({
  immichUrl: (process.env.IMMICH_URL || '').replace(/\/$/, ''),
  immichApiKey: process.env.IMMICH_API_KEY || '',
  immichAlbum: process.env.IMMICH_ALBUM || '',
  sourceDir: '/media/source',
  workDir: '/tmp/work',
  port: parseInt(process.env.PORT || '3000', 10),
})

export default config
