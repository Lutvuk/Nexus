import { Component, Input, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BoardService } from '../../../services/board.service';

@Component({
    selector: 'app-analytics-view',
    standalone: true,
    imports: [CommonModule, BaseChartDirective],
    template: `
    <div class="h-full overflow-auto custom-scrollbar p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        
        <!-- Key Metrics -->
        <div class="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
                <p class="text-white/50 text-xs font-semibold uppercase tracking-wider">Total Cards</p>
                <p class="text-2xl font-bold text-white mt-1">{{ analytics()?.total_cards || 0 }}</p>
            </div>
            <div class="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
                <p class="text-white/50 text-xs font-semibold uppercase tracking-wider">Completed</p>
                <p class="text-2xl font-bold text-green-400 mt-1">{{ analytics()?.completed_cards || 0 }}</p>
            </div>
            <div class="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
                <p class="text-white/50 text-xs font-semibold uppercase tracking-wider">Overdue</p>
                <p class="text-2xl font-bold text-red-400 mt-1">{{ analytics()?.due_date_status?.overdue || 0 }}</p>
            </div>
             <div class="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
                <p class="text-white/50 text-xs font-semibold uppercase tracking-wider">Due Soon</p>
                <p class="text-2xl font-bold text-amber-400 mt-1">{{ analytics()?.due_date_status?.due_soon || 0 }}</p>
            </div>
        </div>

        <!-- Cards per List -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-6 rounded-xl flex flex-col">
          <h3 class="text-white font-semibold mb-4">Cards per List</h3>
          <div class="flex-1 min-h-[250px] relative">
            @if (listChartData.datasets[0].data.length > 0) {
                <canvas baseChart
                    [data]="listChartData"
                    [options]="barChartOptions"
                    [type]="'bar'">
                </canvas>
            } @else {
                <div class="flex items-center justify-center h-full text-white/30 text-sm">No data available</div>
            }
          </div>
        </div>

        <!-- Cards per Label -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-6 rounded-xl flex flex-col">
          <h3 class="text-white font-semibold mb-4">Cards by Label</h3>
          <div class="flex-1 min-h-[250px] relative">
             @if (labelChartData.datasets[0].data.length > 0) {
                <canvas baseChart
                    [data]="labelChartData"
                    [options]="pieChartOptions"
                    [type]="'pie'">
                </canvas>
             } @else {
                <div class="flex items-center justify-center h-full text-white/30 text-sm">No data available</div>
            }
          </div>
        </div>

        <!-- Weekly Activity -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-6 rounded-xl flex flex-col">
          <h3 class="text-white font-semibold mb-4">Weekly Activity</h3>
          <div class="flex-1 min-h-[250px] relative">
             @if (activityChartData.datasets[0].data.length > 0) {
                <canvas baseChart
                    [data]="activityChartData"
                    [options]="lineChartOptions"
                    [type]="'line'">
                </canvas>
             } @else {
                <div class="flex items-center justify-center h-full text-white/30 text-sm">No data available</div>
            }
          </div>
        </div>

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
export class AnalyticsViewComponent {
    @Input({ required: true }) boardId!: string;

    private boardService = inject(BoardService);
    analytics = signal<any>(null);

    // Charts Data
    listChartData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], label: 'Cards' }] };
    labelChartData: ChartData<'pie'> = { labels: [], datasets: [{ data: [] }] };
    activityChartData: ChartData<'line'> = { labels: [], datasets: [{ data: [], label: 'Actions' }] };

    // Options
    barChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'rgba(255,255,255,0.7)' } },
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } }
        }
    };

    pieChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)' } } }
    };

    lineChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        elements: { line: { tension: 0.4 } },
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'rgba(255,255,255,0.7)' } },
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } }
        }
    };

    constructor() {
        effect(() => {
            if (this.boardId) {
                this.loadData();
            }
        });
    }

    loadData() {
        this.boardService.getBoardAnalytics(this.boardId).subscribe(data => {
            this.analytics.set(data);
            this.updateCharts(data);
        });
    }

    updateCharts(data: any) {
        // Lists
        if (data.cards_per_list) {
            this.listChartData = {
                labels: data.cards_per_list.map((i: any) => i.name),
                datasets: [{
                    data: data.cards_per_list.map((i: any) => i.count),
                    backgroundColor: 'rgba(124, 58, 237, 0.8)',
                    borderRadius: 4
                }]
            };
        }

        // Labels
        if (data.cards_per_label) {
            this.labelChartData = {
                labels: data.cards_per_label.map((i: any) => i.name),
                datasets: [{
                    data: data.cards_per_label.map((i: any) => i.count),
                    backgroundColor: data.cards_per_label.map((i: any) => i.color || '#cbd5e1'),
                    borderWidth: 0
                }]
            };
        }

        // Activity
        if (data.weekly_activity) {
            this.activityChartData = {
                labels: data.weekly_activity.map((i: any) => i.date),
                datasets: [{
                    data: data.weekly_activity.map((i: any) => i.count),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    pointBackgroundColor: '#10b981'
                }]
            };
        }
    }
}
