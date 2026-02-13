import { Injectable, effect, inject, signal } from '@angular/core';
import { UserPreferences, UserService } from './user.service';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class PreferencesService {
    private userService = inject(UserService);
    private authService = inject(AuthService);

    preferences = signal<UserPreferences | null>(null);

    constructor() {
        effect(() => {
            const user = this.authService.currentUser();
            if (user?.id) {
                this.loadPreferences();
            } else {
                this.preferences.set(null);
                this.applyToDocument(null);
            }
        });
    }

    loadPreferences() {
        this.userService.getPreferences().subscribe({
            next: (prefs) => {
                this.preferences.set(prefs);
                this.applyToDocument(prefs);
            },
            error: () => { }
        });
    }

    updatePreferences(prefs: UserPreferences) {
        this.preferences.set(prefs);
        this.applyToDocument(prefs);
    }

    private applyToDocument(prefs: UserPreferences | null) {
        const body = document.body;
        if (!body) return;

        if (prefs?.color_blind_mode) {
            body.classList.add('color-blind-mode');
        } else {
            body.classList.remove('color-blind-mode');
        }

        if (typeof document !== 'undefined') {
            if (prefs?.cookie_analytics) {
                document.cookie = 'nexus_analytics_consent=1; path=/; max-age=31536000; SameSite=Lax';
            } else {
                document.cookie = 'nexus_analytics_consent=; path=/; max-age=0; SameSite=Lax';
                localStorage.removeItem('nexus_analytics_events');
            }
        }
    }

    isSuggestionDismissed(key: string): boolean {
        const userId = this.authService.currentUser()?.id;
        if (!userId) return false;
        return localStorage.getItem(`nexus_suggestion_dismissed:${userId}:${key}`) === '1';
    }

    dismissSuggestion(key: string) {
        const userId = this.authService.currentUser()?.id;
        if (!userId) return;
        localStorage.setItem(`nexus_suggestion_dismissed:${userId}:${key}`, '1');
    }
}
