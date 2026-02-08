import { Injectable, signal } from '@angular/core';

export interface DialogConfig {
    title: string;
    type: 'confirm' | 'prompt';
    message?: string; // For confirm
    promptLabel?: string; // For prompt
    promptValue?: string; // For prompt initial value
    confirmLabel?: string;
    isDanger?: boolean;
}

interface DialogRequest extends DialogConfig {
    resolve: (value: any) => void;
}

@Injectable({
    providedIn: 'root'
})
export class DialogService {
    activeDialog = signal<DialogRequest | null>(null);

    openConfirm(config: DialogConfig): Promise<boolean> {
        return new Promise((resolve) => {
            this.activeDialog.set({ ...config, type: 'confirm', resolve });
        });
    }

    openPrompt(config: DialogConfig): Promise<string | null> {
        return new Promise((resolve) => {
            this.activeDialog.set({ ...config, type: 'prompt', resolve });
        });
    }

    close(result: any) {
        const dialog = this.activeDialog();
        if (dialog) {
            dialog.resolve(result);
            this.activeDialog.set(null);
        }
    }
}
