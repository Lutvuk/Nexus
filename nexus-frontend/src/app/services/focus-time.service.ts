import { Injectable, computed, signal } from '@angular/core';

export interface FocusTimeEvent {
  id: string;
  boardId: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'nexus_focus_time_events_v1';

@Injectable({
  providedIn: 'root'
})
export class FocusTimeService {
  private eventsSignal = signal<FocusTimeEvent[]>(this.readFromStorage());

  events = computed(() => this.eventsSignal());

  getByBoard(boardId: string): FocusTimeEvent[] {
    return this.eventsSignal()
      .filter(e => e.boardId === boardId)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  create(input: Omit<FocusTimeEvent, 'id' | 'createdAt' | 'updatedAt'>): FocusTimeEvent {
    const now = new Date().toISOString();
    const event: FocusTimeEvent = {
      ...input,
      id: this.newId(),
      createdAt: now,
      updatedAt: now
    };
    const next = [...this.eventsSignal(), event];
    this.eventsSignal.set(next);
    this.writeToStorage(next);
    return event;
  }

  update(id: string, patch: Partial<Omit<FocusTimeEvent, 'id' | 'createdAt'>>): FocusTimeEvent | null {
    let updated: FocusTimeEvent | null = null;
    const now = new Date().toISOString();
    const next = this.eventsSignal().map(e => {
      if (e.id !== id) return e;
      updated = { ...e, ...patch, updatedAt: now };
      return updated;
    });
    if (!updated) return null;
    this.eventsSignal.set(next);
    this.writeToStorage(next);
    return updated;
  }

  delete(id: string): void {
    const next = this.eventsSignal().filter(e => e.id !== id);
    this.eventsSignal.set(next);
    this.writeToStorage(next);
  }

  private readFromStorage(): FocusTimeEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item: any) =>
        item && typeof item.id === 'string' && typeof item.boardId === 'string' &&
        typeof item.title === 'string' && typeof item.start === 'string' &&
        typeof item.end === 'string'
      );
    } catch {
      return [];
    }
  }

  private writeToStorage(events: FocusTimeEvent[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // ignore storage failures
    }
  }

  private newId(): string {
    return `focus_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  }
}

