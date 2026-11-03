import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  readonly messages = signal<ToastMessage[]>([]);

  show(message: string, tone: ToastTone = 'success'): void {
    const id = ++this.counter;
    this.messages.update((messages) => [...messages, { id, message, tone }]);

    setTimeout(() => this.dismiss(id), 4200);
  }

  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((toast) => toast.id !== id));
  }
}
