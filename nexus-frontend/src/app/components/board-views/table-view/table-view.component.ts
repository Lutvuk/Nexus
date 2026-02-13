import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../../models/board.model'; // Assuming Card model is exported correctly
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-table-view',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="h-full overflow-auto custom-scrollbar p-6">
      <div class="min-w-[800px] border border-white/10 rounded-xl overflow-hidden bg-slate-900/50 backdrop-blur-sm">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-white/5 text-xs uppercase font-semibold text-white/50">
            <tr>
              <th class="px-4 py-3 cursor-pointer hover:text-white transition-colors" (click)="sort('title')">
                Card Title
                @if (sortColumn() === 'title') { <span class="ml-1">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span> }
              </th>
              <th class="px-4 py-3 cursor-pointer hover:text-white transition-colors" (click)="sort('list')">
                List
                @if (sortColumn() === 'list') { <span class="ml-1">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span> }
              </th>
              <th class="px-4 py-3">Labels</th>
              <th class="px-4 py-3">Members</th>
              <th class="px-4 py-3 cursor-pointer hover:text-white transition-colors" (click)="sort('dueDate')">
                Due Date
                @if (sortColumn() === 'dueDate') { <span class="ml-1">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span> }
              </th>
              <th class="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (row of sortedRows(); track row.card.id) {
              <tr class="hover:bg-white/5 transition-colors group">
                <td class="px-4 py-3 font-medium text-white group-hover:text-violet-200 transition-colors">
                    {{ row.card.title }}
                </td>
                <td class="px-4 py-3 text-white/60">
                    <span class="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-xs">
                        {{ row.listName }}
                    </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    @for (label of row.card.labels; track label.id) {
                      <span class="w-2 h-2 rounded-full" [style.background-color]="label.color" [title]="label.name"></span>
                    }
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex -space-x-2 overflow-hidden">
                    @for (member of row.card.assignees; track member.user_id) {
                      <div class="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-slate-900" title="{{member.user_id}}">
                        {{ member.user_id.charAt(0).toUpperCase() }} <!-- Ideally fetch name -->
                      </div>
                    }
                  </div>
                </td>
                <td class="px-4 py-3 text-white/60 font-mono text-xs">
                  {{ row.card.due_date | date:'MMM d' }}
                </td>
                <td class="px-4 py-3 text-right">
                    @if (row.card.is_complete) {
                        <span class="text-green-400 text-xs font-medium">Done</span>
                    }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
  `]
})
export class TableViewComponent {
  board = input.required<any>();

  sortColumn = signal<string>('list');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Flatten board structure into rows
  rows = computed(() => {
    const boardData = this.board();
    if (!boardData) return [];
    const rows: { card: any, listName: string, listId: string }[] = [];

    if (boardData.columns) {
      for (const col of boardData.columns) {
        if (col.cards) {
          for (const card of col.cards) {
            rows.push({
              card: card,
              listName: col.name,
              listId: col.id
            });
          }
        }
      }
    }
    return rows;
  });

  sortedRows = computed(() => {
    const data = [...this.rows()];
    const col = this.sortColumn();
    const dir = this.sortDirection();

    return data.sort((a, b) => {
      let valA, valB;

      switch (col) {
        case 'title':
          valA = a.card.title.toLowerCase();
          valB = b.card.title.toLowerCase();
          break;
        case 'list':
          valA = a.listName.toLowerCase(); // Or order?
          valB = b.listName.toLowerCase();
          break;
        case 'dueDate':
          valA = a.card.due_date ? new Date(a.card.due_date).getTime() : 0;
          valB = b.card.due_date ? new Date(b.card.due_date).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  });

  sort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }
}
