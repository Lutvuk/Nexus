import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden px-4">
      <div class="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
      <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>

      <div class="relative w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <div class="flex items-center justify-center gap-3 mb-5">
          <img src="nexus-logo.svg" alt="Nexus logo" class="w-9 h-9 rounded-lg">
          <span class="text-lg font-bold text-white tracking-tight">Nexus</span>
        </div>

        <h2 class="text-2xl font-bold text-white mb-1 text-center tracking-tight">
          {{ isAwaitingVerification ? 'Verify your email' : 'Create account' }}
        </h2>
        <p class="text-white/40 text-center mb-7 text-sm">
          {{ isAwaitingVerification ? 'Enter the code we sent to your email' : 'Start organizing your work in Nexus' }}
        </p>

        @if (error) {
          <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {{ error }}
          </div>
        }
        @if (info) {
          <div class="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
            {{ info }}
          </div>
        }

        @if (!isAwaitingVerification) {
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-white/60">Full Name</label>
            <input
              type="text"
              [(ngModel)]="name"
              name="name"
              required
              class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
            >
          </div>

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
              minlength="8"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
            >
            <p class="text-xs text-white/40">Use 8+ chars with upper/lowercase, number, and symbol.</p>
          </div>

          <button
            type="submit"
            [disabled]="isLoading"
            class="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            @if(isLoading) { <span class="animate-spin">...</span> }
            Create Account
          </button>
        </form>
        } @else {
        <form (ngSubmit)="onVerify()" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-white/60">Verification Code</label>
            <input
              type="text"
              [(ngModel)]="verificationCode"
              name="verificationCode"
              required
              minlength="6"
              maxlength="6"
              placeholder="Enter 6-digit code"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
            >
            <p class="text-xs text-white/40">Code sent to {{ verificationEmail }}.</p>
          </div>

          <button
            type="submit"
            [disabled]="isLoading"
            class="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            @if(isLoading) { <span class="animate-spin">...</span> }
            Verify Email
          </button>
        </form>

        <button
          type="button"
          (click)="onResendCode()"
          [disabled]="isResendingCode"
          class="mt-3 w-full py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-60 text-white/90 font-medium transition-all"
        >
          {{ isResendingCode ? 'Resending...' : 'Resend code' }}
        </button>
        }

        <p class="mt-6 text-center text-white/40 text-sm">
          Already have an account?
          <a
            [routerLink]="['/login']"
            [queryParams]="{ returnUrl: returnUrl }"
            class="text-violet-400 hover:text-violet-300 transition-colors font-semibold"
          >Sign in</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  name = '';
  email = '';
  password = '';
  verificationCode = '';
  verificationEmail = '';
  isAwaitingVerification = false;
  isLoading = false;
  isResendingCode = false;
  error = '';
  info = '';

  get returnUrl(): string | null {
    return this.route.snapshot.queryParamMap.get('returnUrl');
  }

  onSubmit() {
    this.isLoading = true;
    this.error = '';
    this.info = '';
    this.authService.register({ name: this.name, email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.isAwaitingVerification = true;
        this.verificationEmail = res.email || this.email;
        this.info = res.message || 'Account created. Please verify your email.';
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Registration failed';
      }
    });
  }

  onVerify() {
    this.isLoading = true;
    this.error = '';
    this.info = '';
    this.authService.verifyEmail({
      email: this.verificationEmail || this.email,
      code: this.verificationCode
    }).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.returnUrl || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Verification failed';
      }
    });
  }

  onResendCode() {
    const email = this.verificationEmail || this.email;
    if (!email) return;
    this.isResendingCode = true;
    this.error = '';
    this.info = '';
    this.authService.resendVerification(email).subscribe({
      next: (res) => {
        this.isResendingCode = false;
        this.info = res?.message || 'Verification code resent';
      },
      error: (err) => {
        this.isResendingCode = false;
        this.error = err.error?.error || 'Failed to resend code';
      }
    });
  }
}
