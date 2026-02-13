import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-nexus-skeleton',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="animate-pulse" [ngClass]="containerClass">
        @if (type === 'board') {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                @for (i of [1,2,3,4,5,6]; track i) {
                    <div class="h-40 rounded-2xl bg-white/5 border border-white/10"></div>
                }
            </div>
        } @else if (type === 'card') {
            <div class="space-y-4">
                <div class="h-8 w-3/4 bg-white/10 rounded"></div>
                <div class="h-24 bg-white/5 rounded-xl"></div>
                <div class="h-12 bg-white/5 rounded-xl"></div>
            </div>
        } @else if (type === 'column') {
            <div class="flex gap-6 overflow-x-hidden pt-4 px-6">
                @for (i of [1,2,3]; track i) {
                    <div class="w-80 h-[80vh] flex-shrink-0 rounded-2xl bg-white/5 border border-white/10 p-4 space-y-4">
                        <div class="h-6 w-1/2 bg-white/10 rounded"></div>
                        <div class="space-y-3 pt-6">
                            <div class="h-24 bg-white/5 rounded-xl"></div>
                            <div class="h-24 bg-white/5 rounded-xl"></div>
                            <div class="h-24 bg-white/5 rounded-xl"></div>
                        </div>
                    </div>
                }
            </div>
        }
    </div>
    `
})
export class NexusSkeletonComponent {
    @Input() type: 'board' | 'card' | 'column' = 'board';
    @Input() containerClass = '';
}
