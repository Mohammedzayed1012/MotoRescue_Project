import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" [class.logo--light]="variant() === 'light'" [class.logo--sm]="size() === 'sm'">
      <span class="logo__mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="12" fill="currentColor" />
          <path
            d="M22.6 7.2 12.4 22.4h6.1l-1.2 10.4 10.3-15.4h-6.2l1.2-10.2Z"
            fill="#fff"
          />
          <circle cx="30.4" cy="9.6" r="2.2" fill="#fff" fill-opacity=".55" />
        </svg>
      </span>
      <span class="logo__word">Moto<span>Rescue</span></span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .logo {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--brand);
      font-family: var(--font-display);
      font-size: 1.22rem;
      font-weight: 800;
      letter-spacing: -0.035em;
      line-height: 1;
      white-space: nowrap;
    }

    .logo__mark {
      display: inline-flex;
      width: 34px;
      height: 34px;
      filter: drop-shadow(0 5px 10px rgba(242, 84, 45, 0.25));
    }

    .logo__mark svg {
      width: 100%;
      height: 100%;
    }

    .logo__word {
      color: var(--ink-900);
    }

    .logo__word span {
      color: var(--brand);
    }

    .logo--light .logo__word {
      color: #fff;
    }

    .logo--light .logo__word span {
      color: #ff8a68;
    }

    .logo--sm {
      font-size: 1.06rem;
      gap: 8px;
    }

    .logo--sm .logo__mark {
      width: 30px;
      height: 30px;
    }
  `,
})
export class Logo {
  readonly variant = input<'dark' | 'light'>('dark');
  readonly size = input<'md' | 'sm'>('md');
}
