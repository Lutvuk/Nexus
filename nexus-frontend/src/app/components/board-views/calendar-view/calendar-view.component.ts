import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CardService } from '../../../services/card.service';
import { FocusTimeService } from '../../../services/focus-time.service';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  template: `
    <div class="h-full p-6 overflow-auto custom-scrollbar">
      <div class="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div class="mb-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
          Tip: Select a date range to add Focus Time. Click any event to edit hour/date.
        </div>
        <full-calendar [options]="calendarOptions()"></full-calendar>
      </div>
    </div>
  `,
  styles: [`
    ::ng-deep .fc {
      --fc-border-color: rgba(255, 255, 255, 0.1);
      --fc-page-bg-color: transparent;
      --fc-neutral-bg-color: rgba(255, 255, 255, 0.05);
      --fc-list-event-hover-bg-color: rgba(255, 255, 255, 0.1);
      --fc-today-bg-color: rgba(124, 58, 237, 0.1);
      color: rgba(255, 255, 255, 0.9);
      font-family: 'Outfit', sans-serif;
    }
    ::ng-deep .fc-col-header-cell-cushion {
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      font-size: 0.75rem;
      padding-top: 1rem;
      padding-bottom: 1rem;
    }
    ::ng-deep .fc-daygrid-day-number {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
      padding: 0.5rem;
    }
    ::ng-deep .fc-event {
      border-radius: 4px;
      font-size: 0.75rem;
      padding: 2px 4px;
      cursor: pointer;
    }
    ::ng-deep .fc-button {
      background: rgba(124, 58, 237, 0.3) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: rgba(255, 255, 255, 0.9) !important;
      font-size: 0.8rem !important;
      padding: 4px 12px !important;
      border-radius: 6px !important;
      transition: all 0.2s !important;
    }
    ::ng-deep .fc-button:hover {
      background: rgba(124, 58, 237, 0.5) !important;
    }
    ::ng-deep .fc-button-active {
      background: rgba(124, 58, 237, 0.7) !important;
    }
    ::ng-deep .fc-toolbar-title {
      font-size: 1.2rem !important;
      font-weight: 600 !important;
    }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
  `]
})
export class CalendarViewComponent {
  board = input.required<any>();

  private cardService = inject(CardService);
  private focusTimeService = inject(FocusTimeService);
  private dialogService = inject(DialogService);

  events = computed<EventInput[]>(() => {
    const boardData = this.board();
    if (!boardData || !boardData.columns) return [];

    // Make computed reactive on focus events.
    this.focusTimeService.events();

    const events: EventInput[] = [];
    for (const col of boardData.columns) {
      for (const card of col.cards || []) {
        if (!card.due_date) continue;
        events.push({
          id: `card:${card.id}`,
          title: card.title,
          start: card.due_date,
          allDay: false,
          backgroundColor: card.is_complete ? '#10b981' : '#7c3aed',
          borderColor: 'transparent',
          extendedProps: {
            kind: 'card',
            cardId: card.id,
            listName: col.name
          }
        });
      }
    }

    const focusEvents = this.focusTimeService.getByBoard(boardData.id);
    for (const focus of focusEvents) {
      events.push({
        id: `focus:${focus.id}`,
        title: `Focus: ${focus.title}`,
        start: focus.start,
        end: focus.end,
        allDay: false,
        backgroundColor: '#0891b2',
        borderColor: '#22d3ee',
        extendedProps: {
          kind: 'focus',
          focusId: focus.id,
          notes: focus.notes || ''
        }
      });
    }

    return events;
  });

  calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    events: this.events(),
    editable: true,
    selectable: true,
    height: 'auto',
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: false },
    buttonText: {
      today: 'Today',
      month: 'Month',
      week: 'Week'
    },
    select: (arg) => this.onSelect(arg),
    eventClick: (arg) => this.onEventClick(arg),
    eventDrop: (arg) => this.onEventDrop(arg),
    eventResize: (arg) => this.onEventResize(arg)
  }));

  private async onSelect(arg: DateSelectArg) {
    const boardId = this.board()?.id;
    if (!boardId) return;

    const title = await this.dialogService.openPrompt({
      title: 'Add Focus Time',
      promptLabel: 'Focus Title',
      promptValue: '',
      confirmLabel: 'Add',
      type: 'prompt'
    });
    if (!title?.trim()) return;

    // dayGrid selection end is exclusive; make safer duration for all-day selections
    const start = new Date(arg.start);
    let end = new Date(arg.end);
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    this.focusTimeService.create({
      boardId,
      title: title.trim(),
      start: start.toISOString(),
      end: end.toISOString()
    });
  }

  private async onEventClick(arg: EventClickArg) {
    const kind = arg.event.extendedProps['kind'];

    if (kind === 'card') {
      const cardId = arg.event.extendedProps['cardId'];
      const current = arg.event.start ? this.toDateTimeLocal(arg.event.start) : '';
      const next = await this.dialogService.openPrompt({
        title: 'Edit Card Due Date/Time',
        promptLabel: 'Format: YYYY-MM-DDTHH:mm',
        promptValue: current,
        confirmLabel: 'Save',
        type: 'prompt'
      });
      if (!next?.trim()) return;
      const parsed = new Date(next);
      if (isNaN(parsed.getTime())) return;
      this.cardService.updateCard(cardId, { due_date: parsed.toISOString() }).subscribe();
      return;
    }

    if (kind === 'focus') {
      const focusId = arg.event.extendedProps['focusId'];
      const currentTitle = String(arg.event.title || '').replace(/^Focus:\s*/, '');
      const nextTitle = await this.dialogService.openPrompt({
        title: 'Edit Focus Time',
        promptLabel: 'Focus Title',
        promptValue: currentTitle,
        confirmLabel: 'Save',
        type: 'prompt'
      });
      if (!nextTitle?.trim()) return;
      this.focusTimeService.update(focusId, { title: nextTitle.trim() });
    }
  }

  private onEventDrop(arg: EventDropArg) {
    const kind = arg.event.extendedProps['kind'];
    if (kind === 'card') {
      const cardId = arg.event.extendedProps['cardId'];
      const start = arg.event.start;
      if (!start) return;
      this.cardService.updateCard(cardId, { due_date: start.toISOString() }).subscribe();
      return;
    }

    if (kind === 'focus') {
      const focusId = arg.event.extendedProps['focusId'];
      const start = arg.event.start;
      const end = arg.event.end;
      if (!start) return;
      this.focusTimeService.update(focusId, {
        start: start.toISOString(),
        end: (end || new Date(start.getTime() + 60 * 60 * 1000)).toISOString()
      });
    }
  }

  private onEventResize(arg: any) {
    const kind = arg.event.extendedProps['kind'];
    if (kind !== 'focus') return;
    const focusId = arg.event.extendedProps['focusId'];
    const start = arg.event.start;
    const end = arg.event.end;
    if (!start || !end) return;
    this.focusTimeService.update(focusId, {
      start: start.toISOString(),
      end: end.toISOString()
    });
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
}
