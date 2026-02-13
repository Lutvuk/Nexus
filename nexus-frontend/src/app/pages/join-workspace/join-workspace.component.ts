import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BoardService } from '../../services/board.service';

@Component({
    selector: 'app-join-workspace',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6">
      <div class="w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl text-center">
        @if (isLoading()) {
          <div class="animate-spin w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-white/70">Joining workspace...</p>
        } @else if (error()) {
          <div class="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 class="text-2xl font-bold text-white mb-2">Unable to Join</h2>
          <p class="text-white/50 mb-6">{{ error() }}</p>
          <a routerLink="/dashboard" class="inline-block px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors">
            Go to Dashboard
          </a>
        } @else if (success()) {
          <div class="text-green-400 text-6xl mb-4">✓</div>
          <h2 class="text-2xl font-bold text-white mb-2">Welcome!</h2>
          <p class="text-white/50 mb-2">You've joined <span class="text-violet-400 font-medium">{{ workspaceName() }}</span></p>
          <p class="text-white/40 text-sm mb-6">Redirecting to dashboard...</p>
        }
      </div>
    </div>
  `
})
export class JoinWorkspaceComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private boardService = inject(BoardService);

    isLoading = signal(true);
    error = signal('');
    success = signal(false);
    workspaceName = signal('');

    ngOnInit() {
        const token = this.route.snapshot.paramMap.get('token');
        if (!token) {
            this.error.set('Invalid invite link');
            this.isLoading.set(false);
            return;
        }

        this.boardService.joinViaLink(token).subscribe({
            next: (res) => {
                this.success.set(true);
                this.workspaceName.set(res.workspace_name || 'Workspace');
                this.isLoading.set(false);
                // Redirect after 2 seconds
                setTimeout(() => this.router.navigate(['/dashboard']), 2000);
            },
            error: (err) => {
                this.error.set(err?.error?.error || 'Failed to join workspace');
                this.isLoading.set(false);
            }
        });
    }
}
