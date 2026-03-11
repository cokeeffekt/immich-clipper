export function layout(content, { title = 'Immich Clipper', activePage = '', extraScripts = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Immich Clipper</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen flex flex-col">

  <header class="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6 flex-shrink-0">
    <a href="/browse" class="font-bold text-white tracking-tight">Immich Clipper</a>
    <nav class="flex gap-5 text-sm">
      <a href="/browse" class="${activePage === 'browse' ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors">Browse</a>
    </nav>
    <div class="ml-auto">
      <button
        onclick="document.getElementById('queue-drawer').classList.toggle('translate-x-full')"
        class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        id="queue-btn"
      >
        Queue
        <span id="queue-badge" class="hidden bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"></span>
      </button>
    </div>
  </header>

  <main class="flex-1 flex flex-col overflow-hidden">
    ${content}
  </main>

  <!-- Queue drawer -->
  <div
    id="queue-drawer"
    class="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col translate-x-full transition-transform duration-200"
    x-data="queuePanel()"
    x-init="init()"
  >
    <div class="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
      <h2 class="font-semibold">Processing Queue</h2>
      <button
        onclick="document.getElementById('queue-drawer').classList.add('translate-x-full')"
        class="text-gray-400 hover:text-white text-2xl leading-none"
      >&times;</button>
    </div>
    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <template x-if="jobs.length === 0">
        <p class="text-gray-500 text-sm text-center py-12">No jobs yet.</p>
      </template>
      <template x-for="job in jobs" :key="job.id">
        <div class="bg-gray-800 rounded-lg p-3 space-y-1">
          <div class="flex items-start justify-between gap-2">
            <span class="text-sm font-medium break-all" x-text="job.label || job.sourcePath.split('/').pop()"></span>
            <span
              class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
              :class="{
                'bg-yellow-900 text-yellow-300': job.status === 'pending',
                'bg-blue-900 text-blue-300': job.status === 'processing',
                'bg-green-900 text-green-300': job.status === 'done',
                'bg-red-900 text-red-300': job.status === 'error',
              }"
              x-text="job.status"
            ></span>
          </div>
          <div class="text-xs text-gray-400" x-text="formatRange(job.startTime, job.endTime)"></div>
          <div class="text-xs text-gray-500" x-text="job.presetId"></div>
          <template x-if="job.status === 'error'">
            <div class="text-xs text-red-400 break-words" x-text="job.error"></div>
          </template>
          <template x-if="job.status === 'pending'">
            <button @click="deleteJob(job.id)" class="text-xs text-gray-500 hover:text-red-400 transition-colors">Remove</button>
          </template>
        </div>
      </template>
    </div>
  </div>

  <script src="/js/app.js"></script>
  ${extraScripts}
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</body>
</html>`
}
