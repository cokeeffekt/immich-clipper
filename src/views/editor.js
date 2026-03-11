import { layout } from './layout.js'

export function editorPage() {
  const content = `
<div class="flex flex-1 overflow-hidden" x-data="editor()" x-init="init()">

  <!-- Left: video + controls -->
  <div class="flex-1 flex flex-col min-w-0 p-4 gap-3 overflow-y-auto">

    <!-- Video -->
    <div class="bg-black rounded-xl overflow-hidden flex-shrink-0" style="aspect-ratio:16/9">
      <video
        x-ref="video"
        class="w-full h-full"
        controls
        preload="metadata"
        @timeupdate="onTimeUpdate()"
        @loadedmetadata="onMetadata()"
        @pause="loopingDraftId && stopLoop()"
      ></video>
    </div>

    <!-- Timeline + controls -->
    <div class="bg-gray-900 rounded-xl p-4 space-y-3 flex-shrink-0">

      <!-- Timeline bar -->
      <div
        x-ref="timeline"
        class="relative h-8 bg-gray-800 rounded-lg overflow-hidden cursor-crosshair select-none"
        @mousedown="onTimelineMousedown($event)"
      >
        <!-- Draft bands -->
        <template x-for="draft in drafts" :key="draft.id">
          <div
            class="absolute inset-y-0 cursor-pointer transition-colors border-y"
            :class="{
              'bg-violet-500/80 border-violet-400': editingDraftId === draft.id,
              'bg-violet-500/60 border-violet-400': loopingDraftId === draft.id && editingDraftId !== draft.id,
              'bg-violet-800/50 border-transparent hover:bg-violet-700/60': editingDraftId !== draft.id && loopingDraftId !== draft.id,
            }"
            :style="{ left: pct(draft.startTime) + '%', width: Math.max(0.5, pct(draft.endTime) - pct(draft.startTime)) + '%' }"
            @mousedown.stop="selectDraft(draft.id)"
            :title="(draft.label || 'Draft') + ': ' + fmtTime(draft.startTime) + ' → ' + fmtTime(draft.endTime) + ' — click to edit'"
          ></div>
        </template>

        <!-- New-clip selection band (only when not editing a draft) -->
        <template x-if="editingDraftId === null && startTime !== null && endTime !== null">
          <div
            class="absolute inset-y-0 bg-blue-500/20 pointer-events-none"
            :style="{ left: pct(startTime) + '%', width: Math.max(0, pct(endTime) - pct(startTime)) + '%' }"
          ></div>
        </template>

        <!-- Playhead -->
        <div
          class="absolute inset-y-0 w-px bg-white/60 pointer-events-none"
          :style="{ left: pct(currentTime) + '%' }"
        ></div>

        <!-- Start marker handle -->
        <template x-if="startTime !== null">
          <div
            class="absolute inset-y-0 w-3 cursor-ew-resize flex items-stretch group"
            :style="{ left: pct(startTime) + '%' }"
            @mousedown.stop="startDrag('start', $event)"
            title="Drag to adjust start"
          >
            <div class="w-0.5 h-full bg-green-400 group-hover:bg-green-300 group-hover:w-1 transition-all"></div>
          </div>
        </template>

        <!-- End marker handle -->
        <template x-if="endTime !== null">
          <div
            class="absolute inset-y-0 w-3 cursor-ew-resize flex items-stretch justify-end group"
            :style="{ left: 'calc(' + pct(endTime) + '% - 12px)' }"
            @mousedown.stop="startDrag('end', $event)"
            title="Drag to adjust end"
          >
            <div class="w-0.5 h-full bg-red-400 group-hover:bg-red-300 group-hover:w-1 transition-all"></div>
          </div>
        </template>
      </div>

      <!-- Marker buttons -->
      <div class="flex flex-wrap items-center gap-3">
        <button @click="markStart()" class="px-4 py-2 bg-green-900 hover:bg-green-800 text-green-100 rounded-lg text-sm font-medium transition-colors">▶ Mark Start</button>
        <span class="text-sm tabular-nums" :class="startTime !== null ? 'text-green-400' : 'text-gray-600'" x-text="startTime !== null ? fmtTime(startTime) : '--:--'"></span>

        <span class="text-gray-700">→</span>

        <button @click="markEnd()" class="px-4 py-2 bg-red-900 hover:bg-red-800 text-red-100 rounded-lg text-sm font-medium transition-colors">■ Mark End</button>
        <span class="text-sm tabular-nums" :class="endTime !== null ? 'text-red-400' : 'text-gray-600'" x-text="endTime !== null ? fmtTime(endTime) : '--:--'"></span>

        <template x-if="startTime !== null && endTime !== null">
          <span class="text-xs text-gray-500" x-text="'(' + fmtTime(endTime - startTime) + ')'"></span>
        </template>

        <span class="ml-auto text-sm tabular-nums text-gray-500" x-text="fmtTime(currentTime)"></span>
      </div>

      <!-- Form fields + action button -->
      <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800">
        <select
          x-model="selectedPreset"
          @change="syncFormToDraft()"
          class="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <template x-for="p in presets" :key="p.id">
            <option :value="p.id" x-text="p.name"></option>
          </template>
        </select>

        <input
          x-model="clipLabel"
          @input="syncFormToDraft()"
          type="text"
          placeholder="Label (optional)"
          class="flex-1 min-w-28 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          x-model="selectedAlbum"
          @input="syncFormToDraft()"
          type="text"
          list="album-list"
          placeholder="Album (optional)"
          class="flex-1 min-w-28 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="album-list">
          <template x-for="a in albums" :key="a.id">
            <option :value="a.name"></option>
          </template>
        </datalist>

        <!-- Save draft (new clip) or Done (editing existing) -->
        <template x-if="editingDraftId === null">
          <button
            @click="saveDraft()"
            :disabled="startTime === null || endTime === null"
            class="px-5 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
          >+ Save Draft</button>
        </template>
        <template x-if="editingDraftId !== null">
          <button
            @click="newClip()"
            class="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >✓ Done Editing</button>
        </template>
      </div>

      <template x-if="addError">
        <p class="text-red-400 text-sm" x-text="addError"></p>
      </template>
    </div>
  </div>

  <!-- Right: drafts sidebar -->
  <div class="w-72 flex-shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col">

    <!-- Header -->
    <div class="p-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
      <h2 class="font-semibold text-sm text-gray-300">
        Drafts
        <span x-show="drafts.length > 0" class="ml-1 text-gray-500 font-normal" x-text="'(' + drafts.length + ')'"></span>
      </h2>
      <button
        x-show="editingDraftId !== null"
        @click="newClip()"
        class="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
      >+ New Clip</button>
    </div>

    <!-- Draft list -->
    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <template x-if="drafts.length === 0">
        <p class="text-gray-600 text-sm text-center py-10">Mark start and end,<br>then save a draft.</p>
      </template>

      <template x-for="draft in drafts" :key="draft.id">
        <div
          class="rounded-lg p-3 space-y-2 border cursor-pointer transition-colors"
          :class="editingDraftId === draft.id
            ? 'bg-violet-950 border-violet-700'
            : 'bg-gray-800 border-transparent hover:border-gray-700'"
          @click="selectDraft(draft.id)"
        >
          <!-- Title + delete -->
          <div class="flex items-start justify-between gap-2">
            <span class="text-sm font-medium break-all" x-text="draft.label || ('Clip @ ' + fmtTime(draft.startTime))"></span>
            <button
              @click.stop="deleteDraft(draft.id)"
              class="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0 mt-0.5"
              title="Delete draft"
            >&times;</button>
          </div>

          <!-- Time range -->
          <div class="text-xs text-gray-400" x-text="fmtTime(draft.startTime) + ' → ' + fmtTime(draft.endTime) + ' (' + fmtTime(draft.endTime - draft.startTime) + ')'"></div>

          <div class="flex items-center gap-2 flex-wrap text-xs text-gray-600">
            <span x-text="draft.presetId"></span>
            <template x-if="draft.album">
              <span x-text="'· ' + draft.album"></span>
            </template>
          </div>

          <!-- Loop preview button -->
          <button
            @click.stop="toggleLoop(draft.id)"
            class="text-xs px-3 py-1 rounded-md transition-colors font-medium"
            :class="loopingDraftId === draft.id
              ? 'bg-violet-600 hover:bg-violet-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'"
            x-text="loopingDraftId === draft.id ? '⏹ Stop preview' : '▶ Preview loop'"
          ></button>

          <!-- Editing indicator -->
          <div x-show="editingDraftId === draft.id" class="text-xs text-violet-400">Editing — adjust markers on timeline</div>
        </div>
      </template>
    </div>

    <!-- Footer actions -->
    <div class="p-3 border-t border-gray-800 space-y-2 flex-shrink-0">
      <button
        @click="queueAll()"
        :disabled="drafts.length === 0 || adding"
        class="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
        x-text="adding ? 'Queuing…' : 'Queue All (' + drafts.length + ' clip' + (drafts.length === 1 ? '' : 's') + ')'"
      ></button>
      <button
        onclick="document.getElementById('queue-drawer').classList.remove('translate-x-full')"
        class="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
      >View Processing Queue</button>
    </div>

  </div>

</div>`

  return layout(content, {
    title: 'Editor',
    activePage: 'editor',
    extraScripts: '<script src="/js/editor.js"></script>',
  })
}
