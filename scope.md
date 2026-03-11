
# Immich Clipper Scope

Immich Clipper is a lightweight self‑hosted web tool for extracting short clips from large video files and uploading them directly to Immich.

The application is designed for homelab users who store large recordings locally (GoPro, drone footage, cameras, etc.) and want a fast workflow for generating short shareable clips.

## Goals

- Quickly extract short clips from large video files
- Provide a simple browser-based UI
- Export clips using FFmpeg
- Upload clips directly to Immich
- Run entirely inside Docker
- Require minimal configuration
- Avoid any frontend build pipeline

This tool is **not intended to replace full video editors**.

## Frontend Approach

The UI must avoid a JavaScript build pipeline.

Technologies:

- HTML templates served by the backend
- Alpine.js for UI interactivity
- Tailwind CSS for styling
- No SPA frameworks
- No bundlers like Vite/Webpack required at runtime

The UI should remain small, readable, and easy for self‑hosting users to modify.

## Core Features

### Video Browser

Users can browse video files stored in the mounted source directory.

Features:

- Folder navigation
- Video file listing
- Basic metadata display (duration)

### Clip Editor

Users can select start and end timestamps.

Features:

- Video playback
- Timeline scrubbing
- Start marker
- End marker
- Multiple clips per video

### Clip Queue

Clip requests are added to a processing queue.

Each job contains:

- Source video
- Start time
- End time
- Export preset

Queue state should persist across restarts.

### Export Presets

Presets define export behaviour.

Examples:

Fast Clip
- Stream copy
- No re‑encoding

Instagram Reel
- 1080x1920
- H264 encoding

Square Post
- 1080x1080 crop

Presets stored as JSON.

### FFmpeg Processing

Two modes:

Fast copy:

ffmpeg -ss START -to END -i input.mp4 -c copy output.mp4

Encode mode:

ffmpeg -ss START -to END -i input.mp4 -vf "crop=...,scale=..." -c:v libx264 output.mp4

### Immich Upload

After export the clip is uploaded via Immich API.

Required configuration:

- IMMICH_URL
- IMMICH_API_KEY
- IMMICH_ALBUM

Temporary files are deleted after upload.

## Storage Layout

Inside the container:

/media/source   (mounted read‑only video library)
/media/work     (temporary processing workspace)

Example mounts:

/mnt/gopro → /media/source
/mnt/clipper-work → /media/work

## Configuration

Example .env:

IMMICH_URL=http://immich:2283/api
IMMICH_API_KEY=your_api_key
IMMICH_ALBUM=Instagram Clips

MEDIA_SOURCE_DIR=/media/source
WORK_DIR=/media/work

PORT=3000

## System Architecture

Browser
  ↓
Node Server
  ↓
FFmpeg Processing
  ↓
Temporary Workspace
  ↓
Immich API Upload
  ↓
Immich Library

## Non Goals

- Full video editing
- Multi‑track timelines
- Transitions
- Audio editing
- Captioning
- Collaborative editing

## Success Criteria

A user can:

1. Launch the container
2. Open the UI
3. Select a video
4. Mark a clip
5. Export it
6. See it appear in Immich
