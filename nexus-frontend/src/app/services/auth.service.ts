import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { AUTH_BASE_URL, toBackendUrl } from '../core/runtime-config';

export interface User {
    id: string;
    email: string;
    name: string;
    username?: string;
    bio?: string;
    avatar_url?: string;
    language?: string;
    has_completed_onboarding?: boolean;
    email_verified?: boolean;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface RegisterResponse {
    message: string;
    email: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private apiUrl = AUTH_BASE_URL;

    // Core state
    currentUser = signal<User | null>(null);
    private _isReady = signal(false);

    // Computed for public access
    isReady = computed(() => this._isReady());

    constructor() {
        // Initialize auth state from storage
        this.initializeAuth();
    }

    private initializeAuth() {
        const user = this.getUserFromStorage();
        const token = this.getToken();

        if (token && user) {
            try {
                const decoded: any = jwtDecode(token);
                const isExpired = decoded.exp * 1000 < Date.now();
                if (!isExpired) {
                    this.currentUser.set(this.normalizeUser(user));
                } else {
                    this.clearStorage();
                }
            } catch {
                this.clearStorage();
            }
        }

        // Mark as ready after initialization
        this._isReady.set(true);
    }

    login(credentials: { email: string, password: string }) {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => this.handleAuth(response, false))
        );
    }

    register(data: { email: string, password: string, name: string }) {
        return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data);
    }

    verifyEmail(data: { email: string, code: string }) {
        return this.http.post<AuthResponse>(`${this.apiUrl}/verify-email`, data).pipe(
            tap(response => this.handleAuth(response, false))
        );
    }

    resendVerification(email: string) {
        return this.http.post<{ message: string }>(`${this.apiUrl}/resend-verification`, { email });
    }

    logout() {
        this.clearStorage();
        this.currentUser.set(null);
        this.router.navigate(['/login']);
    }

    private handleAuth(response: AuthResponse, navigate: boolean) {
        localStorage.setItem('nexus_token', response.token);
        const normalizedUser = this.normalizeUser(response.user);
        localStorage.setItem('nexus_user', JSON.stringify(normalizedUser));
        this.currentUser.set(normalizedUser);
        if (navigate) {
            this.router.navigate(['/dashboard']);
        }
    }

    private clearStorage() {
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_user');
    }

    private getUserFromStorage(): User | null {
        const userStr = localStorage.getItem('nexus_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    private normalizeUser(user: User): User {
        return {
            ...user,
            avatar_url: this.normalizeAvatarUrl(user.avatar_url)
        };
    }

    private normalizeAvatarUrl(avatarUrl?: string): string | undefined {
        return toBackendUrl(avatarUrl);
    }

    getToken(): string | null {
        return localStorage.getItem('nexus_token');
    }

    isAuthenticated(): boolean {
        const token = this.getToken();
        if (!token) return false;

        try {
            const decoded: any = jwtDecode(token);
            const isExpired = decoded.exp * 1000 < Date.now();
            // Guard checks must stay side-effect free to avoid navigation loops.
            if (isExpired) {
                this.clearStorage();
                this.currentUser.set(null);
            }
            return !isExpired;
        } catch {
            return false;
        }
    }
}
