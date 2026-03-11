// Shared utilities and Alpine.js components loaded on every page

function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ (Math.random() * 16 >> c / 4)).toString(16)
  )
}

function fmtTime(s) {
  if (s == null || isNaN(s)) return '--:--'
  const m = Math.floor(s / 60)
  const sec = String(Math.floor(s % 60)).padStart(2, '0')
  const frac = String(Math.floor((s % 1) * 10))
  return `${m}:${sec}.${frac}`
}

function formatDuration(s) {
  if (!s) return ''
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function queuePanel() {
  return {
    jobs: [],

    init() {
      this.refresh()
      setInterval(() => this.refresh(), 3000)
    },

    async refresh() {
      try {
        const res = await fetch('/api/clips')
        this.jobs = await res.json()

        // Update queue badge
        const active = this.jobs.filter(j => j.status === 'pending' || j.status === 'processing').length
        const badge = document.getElementById('queue-badge')
        if (badge) {
          badge.textContent = active
          badge.classList.toggle('hidden', active === 0)
        }
      } catch {}
    },

    async deleteJob(id) {
      await fetch(`/api/clips/${id}`, { method: 'DELETE' })
      await this.refresh()
    },

    formatRange(start, end) {
      return `${fmtTime(start)} → ${fmtTime(end)}`
    },
  }
}
