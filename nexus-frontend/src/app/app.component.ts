import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { NexusNavbarComponent } from './components/nexus-navbar/nexus-navbar.component';
import { NexusToastComponent } from './components/nexus-toast/nexus-toast.component';
import { NexusGlobalDialogComponent } from './components/nexus-global-dialog/nexus-global-dialog.component';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { AnalyticsService } from './services/analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NexusNavbarComponent, NexusToastComponent, NexusGlobalDialogComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'nexus-frontend';
  isLoading = signal(false);
  showNavbar = signal(true);
  private router = inject(Router);
  private authService = inject(AuthService);
  private analyticsService = inject(AnalyticsService);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isLoading.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isLoading.set(false);
      }

      if (event instanceof NavigationEnd || event instanceof NavigationStart) {
        this.showNavbar.set(this.shouldShowNavbar(this.router.url));
      }
    });

    this.showNavbar.set(this.shouldShowNavbar(this.router.url));
  }

  private shouldShowNavbar(url: string): boolean {
    if (!this.authService.isAuthenticated()) return false;
    return !(url.startsWith('/login') || url.startsWith('/register'));
  }
}
