# Immich Clipper

A self-hosted web tool for extracting short clips from long videos and uploading them directly to Immich.

Perfect for GoPro, drone footage, or any large recordings stored on a NAS or homelab server.

---

## Features

- Browse your video library by folder
- Mark start and end points with draggable timeline markers
- Build multiple draft clips from a single video before processing
- Preview any draft clip on loop directly in the browser
- Export presets: Fast Copy, Instagram Reel, Square Post
- Per-clip album selection with autocomplete from your Immich library
- Background processing queue with live status updates
- Direct upload to Immich with automatic album assignment
- Fully Dockerized — no dependencies on the host machine

---

## Workflow

1. Browse your library and open a video
2. Mark a start and end point using the buttons or by dragging the markers on the timeline
3. Optionally set a label, export preset, and destination album
4. **Save Draft** — the clip appears as a purple band on the timeline
5. Repeat to mark additional clips from the same video
6. Click any purple band (or sidebar card) to re-enter edit mode and adjust
7. **Queue All** when you're happy — all drafts are submitted for processing
8. FFmpeg extracts each clip and uploads it to Immich

---

## Requirements

- Docker
- An Immich server
- Local video files

No other dependencies required on the host.

---

## Quick Start

```bash
git clone https://github.com/cokeeffekt/immich-clipper
cd immich-clipper
cp .env.example .env
```

Edit `.env` — at minimum set `IMMICH_URL`, `IMMICH_API_KEY`, and `MEDIA_SOURCE_DIR`.

Edit `docker-compose.yml` if you need to connect Immich over a custom network (see comments in the file).

```bash
docker compose up --build -d
```

Open `http://localhost:3000`.

---

## Configuration

```env
# Immich server
IMMICH_URL=http://immich:2283/api
IMMICH_API_KEY=your_api_key_here

# Default album for uploads (optional — can be overridden per clip in the UI)
IMMICH_ALBUM=My Clips

# Path to your video library on the host machine (mounted read-only)
MEDIA_SOURCE_DIR=/mnt/gopro

# Web UI port
PORT=3000
```

---

## Connecting to Immich

**Same Docker host (different Compose stack):**
Uncomment `extra_hosts` in `docker-compose.yml` and set:
```
IMMICH_URL=http://host.docker.internal:2283/api
```

**Same Compose stack:**
Uncomment `networks` in `docker-compose.yml` and set:
```
IMMICH_URL=http://immich-server:2283/api
```

---

## Export Presets

| Preset | Mode | Description |
|---|---|---|
| Fast Clip | Stream copy | No re-encoding — instant extraction |
| Instagram Reel | H.264 encode | 1080×1920 portrait crop |
| Square Post | H.264 encode | 1080×1080 center crop |

---

## License

MIT
