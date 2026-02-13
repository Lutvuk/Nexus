import { Injectable, inject, signal } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Observable, Subject, EMPTY, timer } from 'rxjs';
import { retryWhen, tap, delayWhen, catchError, filter, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { wsBackendUrl } from '../core/runtime-config';

export interface WsMessage {
    type: string;
    payload: any;
}

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private socket$: WebSocketSubject<WsMessage> | null = null;
    private authService = inject(AuthService);

    // Connection status signal
    isConnected = signal<boolean>(false);

    // Event bus for specific message types
    private messagesSubject = new Subject<WsMessage>();

    // Track current room for reconnection
    private currentBoardId: string | null = null;

    // Flag to suppress auto-reconnect during intentional switches
    private isSwitching = false;

    constructor() { }

    public connect(boardId: string): void {
        const token = this.authService.getToken();
        if (!token) {
            console.error('Cannot connect to WebSocket: No token');
            return;
        }

        // Store for reconnection
        this.currentBoardId = boardId;

        // Close existing connection if any (suppress reconnect)
        this.closeExisting();

        const url = wsBackendUrl(`/ws?token=${encodeURIComponent(token)}&board_id=${encodeURIComponent(boardId)}`);

        this.initSocket(url);
    }


    // Connect to user's notification room (no board_id = user room)
    public connectUserNotifications(): void {
        const token = this.authService.getToken();
        if (!token) {
            console.error('Cannot connect to WebSocket: No token');
            return;
        }

        this.currentBoardId = null;

        // Close existing connection if any (suppress reconnect)
        this.closeExisting();

        const url = wsBackendUrl(`/ws?token=${encodeURIComponent(token)}`); // No board_id = user room

        this.initSocket(url);
    }

    // Close existing socket without triggering auto-reconnect
    private closeExisting(): void {
        if (this.socket$) {
            this.isSwitching = true;
            this.socket$.complete();
            this.socket$ = null;
            this.isSwitching = false;
        }
    }

    private initSocket(url: string): void {
        const socketSubject = webSocket<WsMessage>({
            url,
            openObserver: {
                next: () => {
                    console.log('WS Connected');
                    this.isConnected.set(true);
                }
            },
            closeObserver: {
                next: () => {
                    console.log('WS Closed');
                    // Only modify state if this socket is still the active one
                    if (this.socket$ === socketSubject) {
                        this.isConnected.set(false);
                        this.socket$ = null;

                        // Only auto-reconnect if this was an unexpected disconnect
                        if (!this.isSwitching) {
                            this.attemptReconnect();
                        }
                    }
                }
            }
        });

        this.socket$ = socketSubject;

        this.socket$.pipe(
            retryWhen(errors =>
                errors.pipe(
                    tap(err => console.error('WS Error, retrying...', err)),
                    delayWhen(() => timer(3000)) // Retry every 3 seconds
                )
            ),
            catchError(err => {
                console.error('WS Fatal Error', err);
                return EMPTY;
            })
        ).subscribe({
            next: (msg) => {
                console.log('[WS] Received:', msg);
                this.messagesSubject.next(msg);
            },
            error: (err) => console.error('WS Subscription Error', err)
        });
    }

    private attemptReconnect(): void {
        if (this.currentBoardId && !this.socket$) {
            console.log('[WS] Attempting to reconnect in 2 seconds...');
            setTimeout(() => {
                if (this.currentBoardId && !this.socket$) {
                    console.log('[WS] Reconnecting to board:', this.currentBoardId);
                    this.connect(this.currentBoardId);
                }
            }, 2000);
        }
    }

    public disconnect(): void {
        // Clear stored room to prevent auto-reconnect
        this.currentBoardId = null;
        this.closeExisting();
        this.isConnected.set(false);
    }


    public sendMessage(type: string, payload: any): void {
        if (this.socket$) {
            this.socket$.next({ type, payload });
        }
    }

    // Filter messages by type
    public onEvent<T>(eventType: string): Observable<T> {
        return this.messagesSubject.asObservable().pipe(
            filter(msg => msg.type === eventType),
            map(msg => msg.payload as T)
        );
    }
}
