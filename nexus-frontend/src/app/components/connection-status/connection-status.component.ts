import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../services/websocket.service';

@Component({
    selector: 'app-connection-status',
    standalone: true,
    imports: [CommonModule],
    template: `
    @if (!isConnected()) {
      <div class="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/90 text-white backdrop-blur-md shadow-lg shadow-rose-500/20 border border-white/10">
          <div class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-bold leading-none">Offline</span>
            <span class="text-[10px] opacity-80 leading-none mt-1">Reconnecting...</span>
          </div>
        </div>
      </div>
    }
  `
})
export class ConnectionStatusComponent {
    private wsService = inject(WebSocketService);
    isConnected = this.wsService.isConnected;
}
