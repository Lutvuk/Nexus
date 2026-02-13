import { Component, EventEmitter, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

interface OnboardingStep {
    title: string;
    description: string;
    icon: string;
    targetSelector?: string; // CSS selector for spotlight
}

@Component({
    selector: 'app-onboarding-guide',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Full-screen overlay -->
    <div class="fixed inset-0 z-[100] transition-all duration-300">
      <!-- Backdrop with spotlight cutout -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      <!-- Tooltip card -->
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
          <!-- Progress bar -->
          <div class="h-1 bg-white/5">
            <div class="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
                [style.width.%]="((currentStep() + 1) / steps.length) * 100"></div>
          </div>

          <!-- Content -->
          <div class="p-8 text-center">
            <!-- Icon -->
            <div class="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-5 text-3xl">
              {{ steps[currentStep()].icon }}
            </div>

            <!-- Title -->
            <h2 class="text-xl font-bold text-white mb-3">
              {{ steps[currentStep()].title }}
            </h2>

            <!-- Description -->
            <p class="text-white/60 text-sm leading-relaxed mb-8">
              {{ steps[currentStep()].description }}
            </p>

            <!-- Step indicator dots -->
            <div class="flex items-center justify-center gap-2 mb-6">
              @for (step of steps; track $index) {
                <div class="w-2 h-2 rounded-full transition-all duration-300"
                    [class]="$index === currentStep() ? 'bg-violet-500 w-6' : $index < currentStep() ? 'bg-violet-500/50' : 'bg-white/20'">
                </div>
              }
            </div>

            <!-- Navigation buttons -->
            <div class="flex items-center justify-between">
              <button (click)="skip()"
                class="text-sm text-white/40 hover:text-white/60 transition-colors">
                Skip tour
              </button>

              <div class="flex items-center gap-3">
                @if (currentStep() > 0) {
                  <button (click)="prev()"
                    class="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-all">
                    Back
                  </button>
                }

                @if (currentStep() < steps.length - 1) {
                  <button (click)="next()"
                    class="px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2">
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                } @else {
                  <button (click)="complete()"
                    class="px-6 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2">
                    Get Started! 🚀
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.4s ease-out;
    }
  `]
})
export class OnboardingGuideComponent {
    @Output() completed = new EventEmitter<void>();
    private userService = inject(UserService);
    private authService = inject(AuthService);

    currentStep = signal(0);

    steps: OnboardingStep[] = [
        {
            title: 'Welcome to Nexus! 🎉',
            description: 'Nexus is your powerful project management tool. Let\'s take a quick tour to help you get started.',
            icon: '👋'
        },
        {
            title: 'Your Dashboard',
            description: 'This is your home base. Here you\'ll find all your workspaces, boards, and quick stats at a glance.',
            icon: '🏠'
        },
        {
            title: 'Create a Board',
            description: 'Click the "+ New Board" button to create your first board. Boards are where you organize your projects.',
            icon: '📋'
        },
        {
            title: 'Organize with Columns',
            description: 'Inside a board, create columns like "To Do", "In Progress", and "Done" to organize your workflow.',
            icon: '📊'
        },
        {
            title: 'Add Tasks',
            description: 'Click "+ Add Task" at the bottom of any column to create cards. Each card represents a task or item.',
            icon: '✨'
        },
        {
            title: 'Drag & Drop',
            description: 'Move cards between columns by dragging them. This is how you update task progress!',
            icon: '🖱️'
        },
        {
            title: 'Rich Card Details',
            description: 'Click any card to open detailed view. Add descriptions, checklists, labels, due dates, attachments, and more.',
            icon: '📝'
        },
        {
            title: 'Collaborate in Real-Time',
            description: 'Invite team members to your workspace. Changes sync instantly — everyone sees updates in real-time.',
            icon: '👥'
        },
        {
            title: 'Keyboard Shortcuts',
            description: 'Press "?" anytime to see all available keyboard shortcuts. Use "f" for search, "c" for new column, and more.',
            icon: '⌨️'
        },
        {
            title: 'You\'re All Set!',
            description: 'You now know the basics of Nexus. Explore features like board backgrounds, automation rules, and analytics. Happy organizing!',
            icon: '🚀'
        }
    ];

    next() {
        if (this.currentStep() < this.steps.length - 1) {
            this.currentStep.update(s => s + 1);
        }
    }

    prev() {
        if (this.currentStep() > 0) {
            this.currentStep.update(s => s - 1);
        }
    }

    skip() {
        this.markComplete();
    }

    complete() {
        this.markComplete();
    }

    private markComplete() {
        this.userService.completeOnboarding().subscribe({
            next: () => this.persistOnboardingCompleted(),
            error: () => { } // non-critical
        });
        this.persistOnboardingCompleted();
        this.completed.emit();
    }

    private persistOnboardingCompleted() {
        const current = this.authService.currentUser();
        if (!current) return;

        const updated = { ...current, has_completed_onboarding: true };
        this.authService.currentUser.set(updated);
        localStorage.setItem('nexus_user', JSON.stringify(updated));
    }
}
