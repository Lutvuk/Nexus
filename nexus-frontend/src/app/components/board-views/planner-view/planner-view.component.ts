import { Component, computed, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CardService } from '../../../services/card.service';
import { FocusTimeService, FocusTimeEvent } from '../../../services/focus-time.service';

type PlannerMode = 'WEEK' | 'MONTH' | 'AGENDA';
type PlannerEntry = CardEntry | FocusEntry;

interface CardEntry {
  kind: 'card';
  boardId: string;
  boardTitle: string;
  columnName: string;
  card: any;
  dueDate: Date;
}

interface FocusEntry {
  kind: 'focus';
  boardId: string;
  focus: FocusTimeEvent;
  start: Date;
  end: Date;
}

@Component({
  selector: 'app-planner-view',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, RouterLink],
  template: `
    <div class="h-full p-4 md:p-6 overflow-auto custom-scrollbar">
      <div class="rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-sm p-4">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="text-white text-lg font-semibold">Planner</h3>
            <p class="text-xs text-white/45">Hourly planning with custom focus-time blocks.</p>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="mode.set('WEEK')" class="px-3 h-9 rounded-lg text-xs border transition-colors"
              [ngClass]="mode() === 'WEEK' ? 'bg-violet-600/25 border-violet-500/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'">Week</button>
            <button (click)="mode.set('MONTH')" class="px-3 h-9 rounded-lg text-xs border transition-colors"
              [ngClass]="mode() === 'MONTH' ? 'bg-violet-600/25 border-violet-500/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'">Month</button>
            <button (click)="mode.set('AGENDA')" class="px-3 h-9 rounded-lg text-xs border transition-colors"
              [ngClass]="mode() === 'AGENDA' ? 'bg-violet-600/25 border-violet-500/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'">Agenda</button>
          </div>
        </div>

        <!-- Focus Time Quick Add / Edit -->
        <div class="rounded-lg border border-white/10 bg-white/[0.03] p-3 mb-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-semibold uppercase tracking-wider text-white/45">
              {{ editingFocusId() ? 'Edit Focus Time' : 'Add Focus Time' }}
            </p>
            @if (editingFocusId()) {
              <button (click)="resetFocusForm()" class="text-xs text-white/60 hover:text-white">Cancel edit</button>
            }
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
            <input [(ngModel)]="focusTitle" type="text" placeholder="Focus title"
              class="h-9 rounded-md bg-slate-900 border border-white/15 px-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500">
            <input [(ngModel)]="focusStart" type="datetime-local"
              class="h-9 rounded-md bg-slate-900 border border-white/15 px-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
            <input [(ngModel)]="focusEnd" type="datetime-local"
              class="h-9 rounded-md bg-slate-900 border border-white/15 px-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
            <input [(ngModel)]="focusNotes" type="text" placeholder="Notes (optional)"
              class="h-9 rounded-md bg-slate-900 border border-white/15 px-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500">
            <button (click)="saveFocusTime()"
              class="h-9 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
              {{ editingFocusId() ? 'Save' : 'Add' }}
            </button>
          </div>
          @if (focusError()) {
            <p class="text-xs text-rose-300 mt-2">{{ focusError() }}</p>
          }
        </div>

        @if (mode() === 'WEEK') {
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-white/60">Week of {{ weekStart() | date:'MMM d, y' }}</p>
            <div class="flex gap-2">
              <button (click)="shiftWeek(-7)" class="px-3 h-8 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white/80">Prev</button>
              <button (click)="goToToday()" class="px-3 h-8 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white/80">Today</button>
              <button (click)="shiftWeek(7)" class="px-3 h-8 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white/80">Next</button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3" cdkDropListGroup>
            @for (day of weekDays(); track day.key) {
              <section class="rounded-lg border border-white/10 bg-white/[0.03] min-h-[250px]">
                <header class="px-3 py-2 border-b border-white/10">
                  <p class="text-[11px] text-white/45">{{ day.date | date:'EEE' }}</p>
                  <p class="text-sm text-white font-semibold">{{ day.date | date:'MMM d' }}</p>
                </header>
                <div class="p-2 space-y-2 min-h-[200px]" cdkDropList [cdkDropListData]="day.entries" (cdkDropListDropped)="dropOnDate($event, day.date)">
                  @for (entry of day.entries; track entry.kind + '-' + entryId(entry)) {
                    @if (entry.kind === 'card') {
                      <article cdkDrag [cdkDragData]="entry" class="rounded-md border border-white/10 bg-slate-900/70 p-2">
                        <a [routerLink]="['/board', entry.boardId]" [queryParams]="{ card: entry.card.id }"
                          class="text-xs font-semibold text-white hover:text-violet-300 transition-colors truncate block">{{ entry.card.title }}</a>
                        <p class="text-[11px] text-white/45 truncate">{{ entry.columnName }} • {{ entry.dueDate | date:'HH:mm' }}</p>
                      </article>
                    } @else {
                      <article cdkDrag [cdkDragData]="entry" class="rounded-md border border-cyan-400/30 bg-cyan-500/10 p-2">
                        <p class="text-xs font-semibold text-cyan-100 truncate">{{ entry.focus.title }}</p>
                        <p class="text-[11px] text-cyan-200/80 truncate">{{ entry.start | date:'HH:mm' }} - {{ entry.end | date:'HH:mm' }}</p>
                      </article>
                    }
                  }
                </div>
              </section>
            }
          </div>
        }

        @if (mode() === 'MONTH') {
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-white/60">{{ monthCursor() | date:'MMMM y' }}</p>
            <div class="flex gap-2">
              <button (click)="shiftMonth(-1)" class="px-3 h-8 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white/80">Prev</button>
              <button (click)="goToToday()" class="px-3 h-8 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white/80">Today</button>
              <button (click)="shiftMonth(1)" class="px-3 h-8 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white/80">Next</button>
            </div>
          </div>

          <div class="grid grid-cols-7 gap-2 text-[11px] text-white/45 mb-2 px-1">
            <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
          </div>
          <div class="grid grid-cols-7 gap-2" cdkDropListGroup>
            @for (day of monthGrid(); track day.key) {
              <section class="rounded-lg border min-h-[145px] p-2"
                [ngClass]="day.inMonth ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-white/[0.01]'">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-[11px]" [ngClass]="day.inMonth ? 'text-white/70' : 'text-white/25'">{{ day.date | date:'d' }}</p>
                  @if (isToday(day.date)) {
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-200">Today</span>
                  }
                </div>
                <div class="space-y-1 min-h-[95px]" cdkDropList [cdkDropListData]="day.entries" (cdkDropListDropped)="dropOnDate($event, day.date)">
                  @for (entry of day.entries; track entry.kind + '-' + entryId(entry)) {
                    @if (entry.kind === 'card') {
                      <article cdkDrag [cdkDragData]="entry" class="rounded border border-white/10 bg-slate-900/70 px-1.5 py-1">
                        <a [routerLink]="['/board', entry.boardId]" [queryParams]="{ card: entry.card.id }"
                          class="text-[11px] text-white/90 hover:text-violet-300 truncate block">{{ entry.card.title }}</a>
                      </article>
                    } @else {
                      <article cdkDrag [cdkDragData]="entry" class="rounded border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-1">
                        <p class="text-[11px] text-cyan-100 truncate">{{ entry.focus.title }}</p>
                      </article>
                    }
                  }
                </div>
              </section>
            }
          </div>
        }

        @if (mode() === 'AGENDA') {
          <div class="space-y-2">
            @for (entry of agendaEntries(); track entry.kind + '-' + entryId(entry)) {
              <div class="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between gap-3">
                @if (entry.kind === 'card') {
                  <div class="min-w-0">
                    <a [routerLink]="['/board', entry.boardId]" [queryParams]="{ card: entry.card.id }"
                      class="text-sm font-semibold text-white hover:text-violet-300 transition-colors truncate block">{{ entry.card.title }}</a>
                    <p class="text-xs text-white/45 truncate">{{ entry.columnName }} • Due {{ entry.dueDate | date:'EEE, MMM d, y HH:mm' }}</p>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <input [value]="datetimeLocalValue(entry.dueDate)" (change)="changeCardHour(entry, $event)" type="datetime-local"
                        class="h-8 rounded-md bg-slate-900 border border-white/15 px-2 text-xs text-white focus:outline-none focus:border-violet-500">
                      <label class="text-xs text-white/75 inline-flex items-center gap-2">
                        <input type="checkbox" [checked]="entry.card.is_complete" (change)="toggleComplete(entry, $event)" class="w-4 h-4">
                        Done
                      </label>
                    </div>
                  </div>
                } @else {
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-cyan-100 truncate">{{ entry.focus.title }}</p>
                    <p class="text-xs text-cyan-200/80 truncate">{{ entry.start | date:'EEE, MMM d, y HH:mm' }} - {{ entry.end | date:'HH:mm' }}</p>
                    @if (entry.focus.notes) {
                      <p class="text-xs text-cyan-200/60 mt-1 truncate">{{ entry.focus.notes }}</p>
                    }
                  </div>
                  <div class="flex items-center gap-2">
                    <button (click)="editFocus(entry.focus)" class="px-2.5 h-8 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white">Edit</button>
                    <button (click)="deleteFocus(entry.focus.id)" class="px-2.5 h-8 rounded-md bg-red-500/20 hover:bg-red-500/30 text-xs text-red-200">Delete</button>
                  </div>
                }
              </div>
            } @empty {
              <p class="text-sm text-white/50">No due-date cards or focus events on this board.</p>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class PlannerViewComponent {
  board = input.required<any>();
  private cardService = inject(CardService);
  private focusTimeService = inject(FocusTimeService);

  mode = signal<PlannerMode>('WEEK');
  weekStart = signal<Date>(this.startOfWeek(new Date()));
  monthCursor = signal<Date>(new Date());

  // Focus form
  focusTitle = '';
  focusStart = this.toDateTimeLocal(new Date());
  focusEnd = this.toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000));
  focusNotes = '';
  editingFocusId = signal<string | null>(null);
  focusError = signal('');

  // Local overrides for instant UI sync
  private dueOverrides = signal<Record<string, string>>({});
  private completeOverrides = signal<Record<string, boolean>>({});

  focusEvents = computed(() => {
    const b = this.board();
    if (!b?.id) return [];
    // make this computed reactive on storage-backed signal
    this.focusTimeService.events();
    return this.focusTimeService.getByBoard(b.id);
  });

  cardEntries = computed<CardEntry[]>(() => {
    const b = this.board();
    if (!b?.columns) return [];
    const out: CardEntry[] = [];
    const dueMap = this.dueOverrides();
    const completeMap = this.completeOverrides();

    for (const col of b.columns) {
      for (const card of col.cards || []) {
        const effectiveDue = dueMap[card.id] ?? card.due_date;
        if (!effectiveDue) continue;
        const effectiveComplete = completeMap[card.id] ?? card.is_complete;
        out.push({
          kind: 'card',
          boardId: b.id,
          boardTitle: b.title,
          columnName: col.name,
          card: { ...card, is_complete: effectiveComplete },
          dueDate: new Date(effectiveDue)
        });
      }
    }
    return out.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  });

  focusEntries = computed<FocusEntry[]>(() => {
    const b = this.board();
    if (!b?.id) return [];
    return this.focusEvents().map((f): FocusEntry => ({
      kind: 'focus',
      boardId: b.id,
      focus: f,
      start: new Date(f.start),
      end: new Date(f.end)
    })).sort((a, b) => a.start.getTime() - b.start.getTime());
  });

  allEntries = computed<PlannerEntry[]>(() => [...this.cardEntries(), ...this.focusEntries()].sort((a, b) => {
    const at = a.kind === 'card' ? a.dueDate.getTime() : a.start.getTime();
    const bt = b.kind === 'card' ? b.dueDate.getTime() : b.start.getTime();
    return at - bt;
  }));

  weekDays = computed(() => {
    const start = this.weekStart();
    const list = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { key: this.dateKey(date), date, entries: [] as PlannerEntry[] };
    });
    const map = new Map(list.map(d => [d.key, d]));
    for (const entry of this.allEntries()) {
      const date = entry.kind === 'card' ? entry.dueDate : entry.start;
      const key = this.dateKey(date);
      const bucket = map.get(key);
      if (bucket) bucket.entries.push(entry);
    }
    return list;
  });

  monthGrid = computed(() => {
    const cursor = this.monthCursor();
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = this.startOfWeek(first);
    const cells = Array.from({ length: 42 }).map((_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return {
        key: this.dateKey(date),
        date,
        inMonth: date.getMonth() === cursor.getMonth(),
        entries: [] as PlannerEntry[]
      };
    });
    const map = new Map(cells.map(c => [c.key, c]));
    for (const entry of this.allEntries()) {
      const date = entry.kind === 'card' ? entry.dueDate : entry.start;
      const key = this.dateKey(date);
      const cell = map.get(key);
      if (cell) cell.entries.push(entry);
    }
    return cells;
  });

  agendaEntries = computed(() => this.allEntries());

  shiftWeek(days: number) {
    const next = new Date(this.weekStart());
    next.setDate(next.getDate() + days);
    this.weekStart.set(this.startOfWeek(next));
  }

  shiftMonth(delta: number) {
    const d = new Date(this.monthCursor());
    d.setMonth(d.getMonth() + delta, 1);
    this.monthCursor.set(d);
  }

  goToToday() {
    const now = new Date();
    this.weekStart.set(this.startOfWeek(now));
    this.monthCursor.set(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  dropOnDate(event: CdkDragDrop<PlannerEntry[]>, targetDate: Date) {
    const entry: PlannerEntry = event.item.data;
    if (!entry) return;

    if (entry.kind === 'card') {
      const nextDue = new Date(entry.dueDate);
      nextDue.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const iso = nextDue.toISOString();
      this.dueOverrides.update(map => ({ ...map, [entry.card.id]: iso }));
      this.cardService.updateCard(entry.card.id, { due_date: iso }).subscribe();
      return;
    }

    const start = new Date(entry.start);
    const end = new Date(entry.end);
    start.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    end.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    if (end.getTime() <= start.getTime()) {
      end.setTime(start.getTime() + 30 * 60 * 1000);
    }
    this.focusTimeService.update(entry.focus.id, {
      start: start.toISOString(),
      end: end.toISOString()
    });
  }

  changeCardHour(entry: CardEntry, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    const next = new Date(value);
    if (isNaN(next.getTime())) return;
    const iso = next.toISOString();
    this.dueOverrides.update(map => ({ ...map, [entry.card.id]: iso }));
    this.cardService.updateCard(entry.card.id, { due_date: iso }).subscribe();
  }

  toggleComplete(entry: CardEntry, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.completeOverrides.update(map => ({ ...map, [entry.card.id]: checked }));
    this.cardService.updateCard(entry.card.id, { is_complete: checked }).subscribe();
  }

  saveFocusTime() {
    this.focusError.set('');
    const boardId = this.board()?.id;
    if (!boardId) return;

    const title = this.focusTitle.trim();
    if (!title) {
      this.focusError.set('Focus title is required.');
      return;
    }

    const start = new Date(this.focusStart);
    const end = new Date(this.focusEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      this.focusError.set('Please provide valid start and end date/time.');
      return;
    }
    if (end.getTime() <= start.getTime()) {
      this.focusError.set('End time must be after start time.');
      return;
    }

    const editingId = this.editingFocusId();
    if (editingId) {
      this.focusTimeService.update(editingId, {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        notes: this.focusNotes.trim() || undefined
      });
      this.resetFocusForm();
      return;
    }

    this.focusTimeService.create({
      boardId,
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      notes: this.focusNotes.trim() || undefined
    });
    this.focusTitle = '';
    this.focusNotes = '';
    this.focusStart = this.toDateTimeLocal(new Date());
    this.focusEnd = this.toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000));
  }

  editFocus(focus: FocusTimeEvent) {
    this.editingFocusId.set(focus.id);
    this.focusTitle = focus.title;
    this.focusStart = this.toDateTimeLocal(new Date(focus.start));
    this.focusEnd = this.toDateTimeLocal(new Date(focus.end));
    this.focusNotes = focus.notes || '';
    this.focusError.set('');
  }

  resetFocusForm() {
    this.editingFocusId.set(null);
    this.focusTitle = '';
    this.focusNotes = '';
    this.focusStart = this.toDateTimeLocal(new Date());
    this.focusEnd = this.toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000));
    this.focusError.set('');
  }

  deleteFocus(id: string) {
    this.focusTimeService.delete(id);
    if (this.editingFocusId() === id) this.resetFocusForm();
  }

  isToday(date: Date): boolean {
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  }

  entryId(entry: PlannerEntry): string {
    return entry.kind === 'card' ? entry.card.id : entry.focus.id;
  }

  datetimeLocalValue(date: Date): string {
    return this.toDateTimeLocal(date);
  }

  private toDateTimeLocal(date: Date): string {
    const d = new Date(date);
    d.setSeconds(0, 0);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const h = `${d.getHours()}`.padStart(2, '0');
    const min = `${d.getMinutes()}`.padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 Sun..6 Sat
    const diff = day === 0 ? -6 : 1 - day; // Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private dateKey(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
