import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

type HelpAction = 'dashboard' | 'profile' | 'settings' | 'tour';

interface DocumentationNote {
    title: string;
    body: string;
}

@Component({
    selector: 'app-help-guide-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" (click)="close.emit()">
      <div class="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div>
            <h3 class="text-lg font-bold text-white">Help Guide</h3>
            <p class="text-xs text-white/50">Quick actions, documentation notes, and essential usage tips</p>
          </div>
          <button (click)="close.emit()" class="h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-5">
          <section class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h4 class="text-sm font-semibold text-white mb-2">Get Started Fast</h4>
              <ul class="text-sm text-white/70 space-y-2">
                <li>1. Go to Dashboard and create your first board.</li>
                <li>2. Add columns such as To Do, In Progress, Done.</li>
                <li>3. Add cards and move them with drag and drop.</li>
                <li>4. Invite teammates from Workspace settings.</li>
              </ul>
            </div>

            <div class="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h4 class="text-sm font-semibold text-white mb-2">Important Shortcuts</h4>
              <ul class="text-sm text-white/70 space-y-2">
                <li><span class="text-white font-mono">?</span> Open keyboard shortcut help</li>
                <li><span class="text-white font-mono">f</span> Focus search / filter</li>
                <li><span class="text-white font-mono">c</span> Add new column in board</li>
                <li><span class="text-white font-mono">Esc</span> Close modal / clear focus</li>
              </ul>
            </div>
          </section>

          <section class="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.05] p-4">
            <div class="flex items-center justify-between gap-3 mb-3">
              <h4 class="text-sm font-semibold text-cyan-100">Documentation Notes</h4>
              <span class="text-[11px] text-cyan-100/60">Google Notes style</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <article *ngFor="let note of documentationNotes"
                class="rounded-lg border border-white/10 bg-gradient-to-b from-slate-800/85 to-slate-900/85 p-3 min-h-[120px]">
                <h5 class="text-xs font-semibold text-white mb-1.5 leading-tight">{{ note.title }}</h5>
                <p class="text-xs text-white/65 leading-relaxed break-words">{{ note.body }}</p>
              </article>
            </div>
          </section>
        </div>

        <div class="px-6 pb-6">
          <div class="flex flex-wrap gap-2">
            <button (click)="action.emit('dashboard')" class="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold">
              Open Dashboard
            </button>
            <button (click)="action.emit('profile')" class="px-3 py-2 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-white/80 text-sm">
              Open Profile
            </button>
            <button (click)="action.emit('settings')" class="px-3 py-2 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-white/80 text-sm">
              Workspace Settings
            </button>
            <button (click)="action.emit('tour')" class="px-3 py-2 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-sm font-semibold">
              Replay Quick Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HelpGuideModalComponent {
    documentationNotes: DocumentationNote[] = [
        {
            title: 'Board Basics',
            body: 'Create one board per project, then map workflow stages into columns before adding cards.'
        },
        {
            title: 'Card Hygiene',
            body: 'Use short titles, clear due dates, labels, and checklist items so teammates can act quickly.'
        },
        {
            title: 'Team Collaboration',
            body: 'Invite members from workspace settings and mention teammates in comments for ownership.'
        },
        {
            title: 'Automation Reminder',
            body: 'Set simple rules first, then expand automation once your board flow is stable.'
        },
        {
            title: 'Focus Routine',
            body: 'Add a daily focus block in planner view and attach notes to track blockers or context.'
        },
        {
            title: 'Weekly Cleanup',
            body: 'Archive completed cards weekly to keep active columns compact and easier to scan.'
        }
    ];

    @Output() close = new EventEmitter<void>();
    @Output() action = new EventEmitter<HelpAction>();
}
