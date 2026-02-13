import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-not-found',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <div class="mb-8 relative">
        <div class="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full animate-pulse"></div>
        <div class="relative text-9xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          404
        </div>
      </div>
      
      <h1 class="text-3xl font-bold text-white mb-4">Board Not Found</h1>
      <p class="text-slate-400 max-w-md mb-8">
        The board or page you are looking for might have been moved, deleted, or never existed in this dimension.
      </p>

      <a routerLink="/" 
         class="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2">
        <span>🏠</span> Return Home
      </a>
    </div>
  `
})
export class NotFoundComponent { }
