function editor() {
  return {
    videoPath: '',
    currentTime: 0,
    videoDuration: 0,

    // Current marker state — controls new clip OR the draft being edited
    startTime: null,
    endTime: null,

    // Draft clips (local, not yet queued)
    drafts: [],
    editingDraftId: null,

    // Form fields
    clipLabel: '',
    selectedAlbum: '',
    selectedPreset: '',
    presets: [],
    albums: [],

    // Queued jobs (submitted)
    allJobs: [],

    // UI state
    adding: false,
    addError: null,
    loopingDraftId: null,
    dragging: null,

    pct(t) {
      if (!this.videoDuration || t == null) return 0
      return Math.min(100, Math.max(0, (t / this.videoDuration) * 100))
    },

    async init() {
      const url = new URL(location.href)
      this.videoPath = url.searchParams.get('path') || ''
      if (this.videoPath) {
        this.$refs.video.src = '/api/stream?path=' + encodeURIComponent(this.videoPath)
      }

      try {
        const res = await fetch('/api/presets')
        this.presets = await res.json()
        if (this.presets.length) this.selectedPreset = this.presets[0].id
      } catch {}

      try {
        const res = await fetch('/api/albums')
        this.albums = await res.json()
      } catch {}

      this.selectedAlbum = localStorage.getItem('lastAlbum') || ''

      await this.refreshQueue()
      setInterval(() => this.refreshQueue(), 3000)

      // Live-sync markers back to the draft being edited
      this.$watch('startTime', val => {
        if (this.editingDraftId === null || val === null) return
        const d = this.drafts.find(d => d.id === this.editingDraftId)
        if (d) d.startTime = val
      })
      this.$watch('endTime', val => {
        if (this.editingDraftId === null || val === null) return
        const d = this.drafts.find(d => d.id === this.editingDraftId)
        if (d) d.endTime = val
      })
    },

    onTimeUpdate() {
      this.currentTime = this.$refs.video.currentTime
      if (this.loopingDraftId) {
        const draft = this.drafts.find(d => d.id === this.loopingDraftId)
        if (draft && this.currentTime >= draft.endTime) {
          this.$refs.video.currentTime = draft.startTime
        }
      }
    },

    onMetadata() {
      this.videoDuration = this.$refs.video.duration
    },

    async refreshQueue() {
      try {
        const res = await fetch('/api/clips')
        this.allJobs = await res.json()
        const active = this.allJobs.filter(j => j.status === 'pending' || j.status === 'processing').length
        const badge = document.getElementById('queue-badge')
        if (badge) {
          badge.textContent = active
          badge.classList.toggle('hidden', active === 0)
        }
      } catch {}
    },

    markStart() {
      this.startTime = this.$refs.video.currentTime
      if (this.endTime !== null && this.endTime <= this.startTime) this.endTime = null
      this.addError = null
    },

    markEnd() {
      const t = this.$refs.video.currentTime
      if (this.startTime !== null && t <= this.startTime) {
        this.addError = 'End must be after start'
        return
      }
      this.endTime = t
      this.addError = null
    },

    onTimelineMousedown(event) {
      if (event.target !== this.$refs.timeline) return
      if (!this.videoDuration) return
      const rect = this.$refs.timeline.getBoundingClientRect()
      const t = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * this.videoDuration
      this.$refs.video.currentTime = t
    },

    startDrag(marker, event) {
      event.preventDefault()
      this.dragging = marker

      const onMove = (e) => {
        const rect = this.$refs.timeline.getBoundingClientRect()
        const t = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * this.videoDuration
        if (marker === 'start') {
          this.startTime = t
          if (this.endTime !== null && this.endTime <= t) this.endTime = null
        } else {
          if (this.startTime === null || t > this.startTime) this.endTime = t
        }
        this.addError = null
        this.$refs.video.currentTime = t
      }

      const onUp = () => {
        this.dragging = null
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },

    // Save form fields (label/album/preset) back to the draft being edited
    syncFormToDraft() {
      if (!this.editingDraftId) return
      const d = this.drafts.find(d => d.id === this.editingDraftId)
      if (!d) return
      d.label = this.clipLabel
      d.album = this.selectedAlbum
      d.presetId = this.selectedPreset
    },

    // Save current markers as a new draft
    saveDraft() {
      if (this.startTime === null || this.endTime === null) return
      const id = uuid()
      this.drafts.push({
        id,
        startTime: this.startTime,
        endTime: this.endTime,
        label: this.clipLabel,
        album: this.selectedAlbum,
        presetId: this.selectedPreset,
      })
      // Reset markers for the next clip
      this.startTime = null
      this.endTime = null
      this.clipLabel = ''
      this.addError = null
    },

    // Click a draft band or sidebar row to edit it; click again to deselect
    selectDraft(draftId) {
      this.syncFormToDraft()

      if (this.editingDraftId === draftId) {
        this.editingDraftId = null
        this.startTime = null
        this.endTime = null
        this.clipLabel = ''
        return
      }

      const draft = this.drafts.find(d => d.id === draftId)
      if (!draft) return

      this.editingDraftId = draftId
      this.startTime = draft.startTime
      this.endTime = draft.endTime
      this.clipLabel = draft.label
      this.selectedPreset = draft.presetId
      this.selectedAlbum = draft.album
      this.addError = null
    },

    // Deselect and clear markers to start a new clip
    newClip() {
      this.syncFormToDraft()
      this.editingDraftId = null
      this.startTime = null
      this.endTime = null
      this.clipLabel = ''
      this.addError = null
    },

    deleteDraft(id) {
      if (this.loopingDraftId === id) this.stopLoop()
      if (this.editingDraftId === id) {
        this.editingDraftId = null
        this.startTime = null
        this.endTime = null
        this.clipLabel = ''
      }
      this.drafts = this.drafts.filter(d => d.id !== id)
    },

    toggleLoop(draftId) {
      if (this.loopingDraftId === draftId) { this.stopLoop(); return }
      const draft = this.drafts.find(d => d.id === draftId)
      if (!draft) return
      this.loopingDraftId = draftId
      this.$refs.video.currentTime = draft.startTime
      this.$refs.video.play()
    },

    stopLoop() {
      this.loopingDraftId = null
      this.$refs.video.pause()
    },

    async queueAll() {
      if (this.drafts.length === 0) return
      this.syncFormToDraft()
      this.adding = true
      this.addError = null

      if (this.selectedAlbum) localStorage.setItem('lastAlbum', this.selectedAlbum)

      const toQueue = [...this.drafts]
      let failed = 0

      for (const draft of toQueue) {
        try {
          const res = await fetch('/api/clips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourcePath: this.videoPath,
              startTime: draft.startTime,
              endTime: draft.endTime,
              presetId: draft.presetId,
              label: draft.label,
              album: draft.album || undefined,
            }),
          })
          if (res.ok) {
            const job = await res.json()
            this.allJobs.push(job)
            this.drafts = this.drafts.filter(d => d.id !== draft.id)
          } else {
            failed++
          }
        } catch {
          failed++
        }
      }

      if (failed > 0) {
        this.addError = `${failed} clip(s) failed to queue`
      } else {
        this.editingDraftId = null
        this.startTime = null
        this.endTime = null
      }
      this.adding = false
    },

    fmtTime,
  }
}
