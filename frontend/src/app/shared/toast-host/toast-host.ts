import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.messages(); track toast.id) {
        <div
          class="toast"
          [class.toast--success]="toast.tone === 'success'"
          [class.toast--error]="toast.tone === 'error'"
          [class.toast--info]="toast.tone === 'info'"
          role="status"
        >
          <span class="toast__icon">
            <app-icon
              [name]="toast.tone === 'success' ? 'check' : toast.tone === 'error' ? 'alert' : 'bell'"
              [size]="16"
            />
          </span>
          <span class="toast__text">{{ toast.message }}</span>
          <button
            type="button"
            class="toast__close"
            (click)="toasts.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <app-icon name="close" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .toast__text {
      flex: 1;
      line-height: 1.4;
    }

    .toast__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex: 0 0 auto;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--slate-500);
    }

    .toast__close:hover {
      background: var(--slate-100);
      color: var(--ink-900);
    }
  `,
})
export class ToastHost {
  readonly toasts = inject(ToastService);
}
