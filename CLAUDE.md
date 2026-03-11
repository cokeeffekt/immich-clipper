# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Docker (primary workflow)
cp .env.example .env        # edit with Immich URL, API key, and media path
docker compose up --build   # first run
docker compose up -d        # subsequent starts

# Syntax check without running
node --check src/server.js
for f in src/**/*.js public/js/*.js; do node --check "$f"; done
```

No test runner configured. No build step — ships as-is.

## Architecture

```
Browser (Alpine.js + Tailwind CDN)
  ↓ HTTP
Fastify (src/server.js → src/router.js)
  ├── Page routes      → src/views/*.js        (JS functions returning HTML strings)
  ├── /js/:file        → public/js/            (Alpine components served as static files)
  ├── /api/browse      → src/api/browse.js     (readdir + ffprobe)
  ├── /api/stream      → src/api/stream.js     (range-aware file streaming)
  ├── /api/albums      → src/api/albums.js     (proxies GET /albums from Immich)
  ├── /api/clips       → src/api/clips.js      (queue CRUD)
  └── /api/presets     → src/api/presets.js    (preset CRUD)
  ↓
src/services/
  ├── queue.js     — in-memory queue + atomic JSON persistence to /tmp/work/queue.json
  ├── worker.js    — single-job-at-a-time background processor
  ├── ffprobe.js   — video metadata (duration, dimensions)
  ├── ffmpeg.js    — clip extraction (stream copy or libx264 encode)
  ├── presets.js   — merges built-in (data/presets.json) + custom (/tmp/work/custom-presets.json)
  └── immich.js    — Immich REST API: upload asset, get/create album, add to album
```

## Editor UI — Draft Workflow

Clips exist as **drafts** (client-side only) before being submitted to the queue:

1. User marks start/end → clicks **Save Draft** → draft stored in Alpine component state
2. Multiple drafts can be built before submitting
3. Clicking a draft band on the timeline (or its sidebar card) enters **edit mode** — markers snap to that draft, live-sync back via `$watch`
4. **Queue All** POSTs each draft to `/api/clips`, clears the draft list

`public/js/editor.js` owns all draft state. No backend involvement until Queue All.

## Key Design Decisions

**No frontend build pipeline.** Alpine.js and Tailwind loaded via CDN. Views are JS functions returning HTML strings (`src/views/*.js`). Client-side components live in `public/js/` served by a `/js/:file` route in the router.

**`uuid()` helper in `app.js`.** `crypto.randomUUID()` requires HTTPS — unavailable over plain HTTP in a homelab. A simple Math.random-based UUID generator is defined in `public/js/app.js` and shared across all client components.

**HTTP Range requests in `/api/stream`.** Critical for video seeking. Without `206 Partial Content` + `Content-Range`, the browser downloads from byte 0 on every seek. See `src/api/stream.js`.

**FFmpeg `-ss` before `-i`.** Input-side seeking — FFmpeg jumps to the timestamp before decoding. Post-input seeking decodes every frame from the start, which is unusable on large files.

**Queue persistence with atomic write.** `queue.js` writes to `/tmp/work/queue.json.tmp` then `rename`s to `queue.json`. Atomic on Linux. On startup, any `processing` jobs are reset to `pending` (FFmpeg was killed mid-run).

**Immich upload via Node `http`/`https` module.** Native `fetch` in Node doesn't correctly consume `form-data` streams. The upload in `immich.js` uses `form.pipe(req)` with Node's built-in HTTP client. All other Immich calls use native `fetch`.

**Per-clip album.** Each clip job stores an `album` field. Worker uses `job.album || config.immichAlbum`. `immich.js` caches album IDs in a `Map` (multiple albums supported).

**Path traversal guard.** All file path inputs use `path.relative(baseDir, resolved).startsWith('..')` — a naive `startsWith(baseDir)` check fails for paths like `/media/sourceEvil/`.

**Container paths are hardcoded.** `sourceDir = '/media/source'`, `workDir = '/tmp/work'`. `MEDIA_SOURCE_DIR` in `.env` is only used by `docker-compose.yml` for the host-side volume mount — it is not read by the Node app.

## Environment Variables

| Variable | Used by | Notes |
|---|---|---|
| `IMMICH_URL` | Node app | e.g. `http://immich:2283/api` |
| `IMMICH_API_KEY` | Node app | Required at upload time |
| `IMMICH_ALBUM` | Node app | Default album; optional |
| `MEDIA_SOURCE_DIR` | docker-compose | **Host path** — mounted to `/media/source` in container |
| `PORT` | Node app | Default `3000` |

## Preset Schema

Built-in presets: `data/presets.json` (baked into image, immutable).
Custom presets: `/tmp/work/custom-presets.json` (reset on container restart).

```json
{ "id": "fast-clip", "name": "Fast Clip", "builtin": true, "mode": "copy" }
```

Encode mode fields: `cropW`, `cropH`, `cropX` (default: centered), `cropY`, `scaleW`, `scaleH`, `crf` (default: 23), `encodePreset` (default: `"fast"`).

Square crop: `"cropW": "ih", "cropH": "ih"` — FFmpeg expression for height×height center crop.
