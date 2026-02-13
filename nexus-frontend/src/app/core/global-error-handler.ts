import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    constructor(private injector: Injector) { }

    handleError(error: any): void {
        const toastService = this.injector.get(ToastService);
        const message = error.message ? error.message : error.toString();
        const cleanMessage = message.replace('Uncaught (in promise): ', '');

        console.error('Global Error:', error);

        // Avoid spamming toasts for common non-critical errors if needed
        toastService.show(`An unexpected error occurred: ${cleanMessage.substring(0, 100)}...`, 'error');
    }
}
