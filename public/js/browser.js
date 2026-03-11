function browser() {
  return {
    currentPath: '',
    entries: [],
    loading: false,

    get breadcrumbs() {
      if (!this.currentPath) return []
      const parts = this.currentPath.split('/').filter(Boolean)
      return parts.map((name, i) => ({
        name,
        path: parts.slice(0, i + 1).join('/'),
      }))
    },

    async init() {
      const url = new URL(location.href)
      const p = url.searchParams.get('path') || ''
      await this.navigate(p)
    },

    async navigate(p) {
      this.currentPath = p
      this.loading = true

      // Update URL without a full reload
      const url = new URL(location.href)
      if (p) {
        url.searchParams.set('path', p)
      } else {
        url.searchParams.delete('path')
      }
      history.replaceState(null, '', url)

      try {
        const res = await fetch('/api/browse' + (p ? '/' + encodeURIComponent(p).replace(/%2F/g, '/') : ''))
        this.entries = await res.json()
      } catch {
        this.entries = []
      }

      this.loading = false

      // Fetch duration for each video file lazily
      for (const entry of this.entries) {
        if (entry.type === 'file') this.fetchMeta(entry)
      }
    },

    async fetchMeta(entry) {
      try {
        const res = await fetch('/api/meta?path=' + encodeURIComponent(entry.path))
        const meta = await res.json()
        entry.duration = meta.duration
      } catch {}
    },

    openEditor(path) {
      location.href = '/editor?path=' + encodeURIComponent(path)
    },

    formatDuration,
  }
}
