import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden px-4">
      <div class="absolute top-0 left-0 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
      <div class="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>

      <div class="relative w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <div class="flex items-center justify-center gap-3 mb-5">
          <img src="nexus-logo.svg" alt="Nexus logo" class="w-9 h-9 rounded-lg">
          <span class="text-lg font-bold text-white tracking-tight">Nexus</span>
        </div>

        <h2 class="text-2xl font-bold text-white mb-1 text-center tracking-tight">Welcome back</h2>
        <p class="text-white/40 text-center mb-7 text-sm">Sign in to your workspace</p>

        @if (error) {
          <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {{ error }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-white/60">Email</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
            >
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-white/60">Password</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
            >
          </div>

          <button
            type="submit"
            [disabled]="isLoading"
            class="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            @if(isLoading) { <span class="animate-spin">...</span> }
            Sign In
          </button>
        </form>

        <p class="mt-6 text-center text-white/40 text-sm">
          Don't have an account?
          <a
            [routerLink]="['/register']"
            [queryParams]="{ returnUrl: returnUrl }"
            class="text-violet-400 hover:text-violet-300 transition-colors font-semibold"
          >Sign up</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  isLoading = false;
  error = '';

  ngOnInit() {
    this.error = '';
  }

  get returnUrl(): string | null {
    return this.route.snapshot.queryParamMap.get('returnUrl');
  }

  onSubmit() {
    this.isLoading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.error?.code === 'EMAIL_NOT_VERIFIED') {
          this.error = 'Email not verified. Please register verification code first from the Sign up screen.';
          return;
        }
        this.error = err.error?.error || 'Login failed';
      }
    });
  }
}
