import { Injectable, effect, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PreferencesService } from './preferences.service';

type AnalyticsEvent = {
    type: 'page_view';
    path: string;
    timestamp: string;
};

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private router = inject(Router);
    private preferencesService = inject(PreferencesService);
    private readonly storageKey = 'nexus_analytics_events';
    private readonly maxEvents = 200;

    constructor() {
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd)
        ).subscribe((event) => this.trackPageView(event.urlAfterRedirects || event.url));

        // Keep consent state synced to preference changes
        effect(() => {
            this.preferencesService.preferences();
        });
    }

    private trackPageView(path: string) {
        const prefs = this.preferencesService.preferences();
        if (!prefs?.cookie_analytics) return;

        const nextEvent: AnalyticsEvent = {
            type: 'page_view',
            path,
            timestamp: new Date().toISOString()
        };

        const existing = this.readEvents();
        const next = [nextEvent, ...existing].slice(0, this.maxEvents);
        localStorage.setItem(this.storageKey, JSON.stringify(next));
    }

    private readEvents(): AnalyticsEvent[] {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
}
