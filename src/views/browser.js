import { layout } from './layout.js'

export function browsePage() {
  const content = `
<div class="flex-1 overflow-y-auto p-6" x-data="browser()" x-init="init()">

  <!-- Breadcrumb -->
  <nav class="flex items-center gap-1.5 text-sm text-gray-400 mb-5 flex-wrap">
    <button @click="navigate('')" class="hover:text-white transition-colors">Library</button>
    <template x-for="(crumb, i) in breadcrumbs" :key="i">
      <span class="flex items-center gap-1.5">
        <span class="text-gray-700">/</span>
        <button @click="navigate(crumb.path)" class="hover:text-white transition-colors" x-text="crumb.name"></button>
      </span>
    </template>
  </nav>

  <!-- Loading -->
  <template x-if="loading">
    <div class="text-gray-500 text-sm">Loading&hellip;</div>
  </template>

  <!-- Empty -->
  <template x-if="!loading && entries.length === 0">
    <div class="text-gray-500 text-sm">No video files found in this folder.</div>
  </template>

  <!-- Grid -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
    <template x-for="entry in entries" :key="entry.path">
      <button
        @click="entry.type === 'dir' ? navigate(entry.path) : openEditor(entry.path)"
        class="flex flex-col items-start gap-2 p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl text-left transition-all group"
      >
        <span class="text-3xl" x-text="entry.type === 'dir' ? '📁' : '🎬'"></span>
        <div class="min-w-0 w-full">
          <div class="text-sm font-medium text-gray-100 truncate" x-text="entry.name"></div>
          <div class="text-xs text-gray-500 mt-0.5">
            <span x-show="entry.type === 'dir'">Folder</span>
            <span x-show="entry.type === 'file' && entry.duration == null">Loading&hellip;</span>
            <span x-show="entry.type === 'file' && entry.duration != null" x-text="formatDuration(entry.duration)"></span>
          </div>
        </div>
      </button>
    </template>
  </div>

</div>`

  return layout(content, {
    title: 'Browse',
    activePage: 'browse',
    extraScripts: '<script src="/js/browser.js"></script>',
  })
}
