import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { RequestStatus } from '../../core/models';

@Component({
  selector: 'app-tracking-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(document:keydown.escape)': 'collapse()' },
  template: `
    @if (expanded()) {
      <div class="track-scrim" aria-hidden="true" (click)="collapse()"></div>
    }

    <div
      class="track"
      [class.track--arrived]="status() === 'ARRIVED'"
      [class.track--complete]="status() === 'COMPLETED'"
      [class.track--expanded]="expanded()"
      role="img"
      [attr.aria-label]="ariaLabel()"
      (click)="expand()"
    >
      <svg
        class="track__map"
        viewBox="0 0 640 420"
        [attr.preserveAspectRatio]="expanded() ? 'xMidYMid meet' : 'xMidYMid slice'"
        aria-hidden="true"
      >
        <rect class="ground" width="640" height="420" />

        <g class="blocks">
          <rect x="26" y="30" width="118" height="76" rx="10" />
          <rect x="168" y="20" width="92" height="96" rx="10" />
          <rect x="298" y="38" width="126" height="66" rx="10" />
          <rect x="470" y="26" width="140" height="82" rx="10" />
          <rect x="34" y="150" width="86" height="92" rx="10" />
          <rect x="156" y="152" width="112" height="64" rx="10" />
          <rect x="306" y="146" width="92" height="94" rx="10" />
          <rect x="438" y="140" width="168" height="70" rx="10" />
          <rect x="24" y="304" width="112" height="92" rx="10" />
          <rect x="188" y="270" width="84" height="72" rx="10" />
          <rect x="312" y="286" width="106" height="104" rx="10" />
          <rect x="456" y="256" width="150" height="76" rx="10" />
        </g>

        <path class="park" d="M470 236h144v96c-38-16-72 14-108 2s-30-38-36-62z" />
        <path class="water" d="M0 244c52-18 82 16 128 8s54-40 76-32 8 52 40 62 78-6 108 12v126H0z" />

        <g class="roads">
          <path d="M0 128h640" />
          <path d="M0 246h640" />
          <path d="M0 384h640" />
          <path d="M146 0v420" />
          <path d="M282 0v420" />
          <path d="M424 0v420" />
          <path d="M574 0v420" />
        </g>

        @if (status() === 'EN_ROUTE') {
          <path class="route-line__casing" [attr.d]="roadPath" />
          <path class="route-line" [attr.d]="roadPath" />
          <circle class="route-start" cx="574" cy="84" r="5" />
        }

        <g class="labels">
          <text x="322" y="122">ITPL Main Road</text>
          <text x="40" y="242">Whitefield</text>
          <text x="470" y="306">Forum Mall</text>
          <text x="300" y="372">Hope Farm</text>
        </g>

        <g class="you-pin" transform="translate(150 332)">
          <circle class="you-pulse" r="22" />
          <circle class="you-ring" r="13" />
          <circle class="you-dot" r="7" />
          <text x="22" y="5">You</text>
        </g>

        @if (status() === 'EN_ROUTE') {
          <g class="scooter">
            <g class="scooter__body">
              <circle class="scooter__bg" r="18" />
              <g class="scooter__glyph" transform="translate(-12 -13.5)">
                <circle cx="5" cy="17" r="3" />
                <circle cx="19" cy="17" r="3" />
                <path d="M8 17h6" />
                <path d="M15 17V8h4" />
                <path d="M19 8h3" />
                <path d="M3 10h5" />
              </g>
              <animateMotion dur="18s" repeatCount="indefinite" rotate="auto" [attr.path]="roadPath" />
            </g>
            <g class="scooter__tag">
              <text class="scooter__label" x="-24" y="5" text-anchor="end">Mechanic</text>
              <animateMotion dur="18s" repeatCount="indefinite" [attr.path]="roadPath" />
            </g>
          </g>
        }

        @if (status() === 'ARRIVED' || status() === 'COMPLETED') {
          <g class="scooter scooter--parked" transform="translate(150 332)">
            <circle class="scooter__bg" r="18" />
            <g class="scooter__glyph" transform="translate(-12 -13.5)">
              <circle cx="5" cy="17" r="3" />
              <circle cx="19" cy="17" r="3" />
              <path d="M8 17h6" />
              <path d="M15 17V8h4" />
              <path d="M19 8h3" />
              <path d="M3 10h5" />
            </g>
            <text class="scooter__label" x="-24" y="5" text-anchor="end">Mechanic</text>
          </g>
        }


        @if (status() === 'SEARCHING') {
          <g class="search-ring" transform="translate(540 92)">
            <circle r="16" />
            <circle r="16" />
            <circle class="search-core" r="6" />
          </g>
        }

        @if (!status() || status() === 'SEARCHING') {
          <g class="scooter scooter--nearby">
            <g class="scooter__body">
              <circle class="scooter__bg" r="18" />
              <g class="scooter__glyph" transform="translate(-12 -13.5)">
                <circle cx="5" cy="17" r="3" />
                <circle cx="19" cy="17" r="3" />
                <path d="M8 17h6" />
                <path d="M15 17V8h4" />
                <path d="M19 8h3" />
                <path d="M3 10h5" />
              </g>
              <animateMotion dur="22s" repeatCount="indefinite" rotate="auto" [attr.path]="nearbyPath" />
            </g>
            <g class="scooter__tag">
              <text class="scooter__label" x="-24" y="5" text-anchor="end">Nearby mechanic</text>
              <animateMotion dur="22s" repeatCount="indefinite" [attr.path]="nearbyPath" />
            </g>
          </g>
        }
      </svg>

      <span class="track__chip">
        <span class="dot" [class.dot--amber]="status() === 'SEARCHING'" [class.dot--brand]="status() === 'EN_ROUTE'"></span>
        {{ chipLabel() }}
      </span>

      @if (etaLabel()) {
        <span class="track__eta">
          <app-icon name="timer" [size]="14" />
          {{ etaLabel() }}
        </span>
      }

      @if (status()) {
        <div class="track__card">
          <span class="avatar avatar--sm" [class.avatar--brand]="status() === 'EN_ROUTE'" [class.avatar--green]="status() === 'ARRIVED' || status() === 'COMPLETED'">
            {{ initials() }}
          </span>
          <div class="track__copy">
            <strong>{{ mechanicName() || 'Finding a partner' }}</strong>
            <span>{{ subLabel() }}</span>
          </div>
          @if (status() === 'COMPLETED') {
            <span class="track__done"><app-icon name="check" [size]="14" /> Done</span>
          } @else if (status() !== 'SEARCHING') {
            <a
              class="track__call"
              [href]="'tel:' + (phone() || '+918000000000')"
              aria-label="Call your mechanic"
              (click)="$event.stopPropagation()"
            >
              <app-icon name="phone" [size]="15" />
            </a>
          }
        </div>
      }

      <span class="track__pin">
        <app-icon name="pin" [size]="13" />
        {{ location() || 'Your live location' }}
      </span>

      <button
        type="button"
        class="track__expand"
        (click)="toggle($event)"
        [attr.aria-label]="expanded() ? 'Close the large map' : 'Expand the map'"
        [attr.aria-expanded]="expanded()"
        [attr.title]="expanded() ? 'Close map' : 'Expand map'"
      >
        <app-icon [name]="expanded() ? 'close' : 'maximize'" [size]="16" />
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 260px;
    }

    .track {
      position: relative;
      height: 100%;
      min-height: 260px;
      overflow: hidden;
      border-radius: inherit;
      background: #eef2ea;
      isolation: isolate;
      cursor: zoom-in;
    }

    .track-scrim {
      position: fixed;
      inset: 0;
      z-index: 300;
      background: rgba(8, 15, 30, 0.55);
      backdrop-filter: blur(3px);
      animation: scrim-in 0.16s ease-out;
    }

    .track--expanded {
      position: fixed;
      inset: 0;
      z-index: 310;
      width: min(1100px, 92vw);
      height: min(74vh, calc(92vw * 0.656));
      min-height: 0;
      margin: auto;
      border-radius: 22px;
      box-shadow: 0 40px 90px rgba(8, 15, 30, 0.45);
      animation: track-pop 0.18s ease-out;
      cursor: default;
      background: #f2efe7;
    }

    @keyframes scrim-in {
      from {
        opacity: 0;
      }
    }

    @keyframes track-pop {
      from {
        opacity: 0;
        transform: scale(0.97);
      }
    }

    .track__map {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .ground {
      fill: #f2efe7;
    }

    .blocks rect {
      fill: #fbfaf6;
      stroke: rgba(16, 26, 44, 0.06);
      stroke-width: 1.2;
    }

    .park {
      fill: #dcebd7;
      opacity: 0.9;
    }

    .water {
      fill: #dce9ef;
      opacity: 0.85;
    }

    .roads path {
      fill: none;
      stroke: #ffffff;
      stroke-width: 15;
      stroke-linecap: round;
    }

    .roads path:nth-child(2) {
      stroke-width: 20;
    }

    .route-line__casing {
      fill: none;
      stroke: rgba(255, 255, 255, 0.92);
      stroke-width: 10;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .route-line {
      fill: none;
      stroke: rgba(242, 84, 45, 0.62);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .route-start {
      fill: #ffffff;
      stroke: var(--brand, #f2542d);
      stroke-width: 3;
    }

    .labels text {
      fill: rgba(16, 26, 44, 0.38);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .you-ring {
      fill: #ffffff;
      stroke: var(--blue, #2458c5);
      stroke-width: 3;
    }

    .you-dot {
      fill: var(--blue, #2458c5);
    }

    .you-pulse {
      fill: rgba(36, 88, 197, 0.16);
      animation: ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    .you-pin text {
      fill: var(--ink-900, #101a2c);
      font-size: 12px;
      font-weight: 800;
    }

    @keyframes ping {
      0% {
        transform: scale(0.6);
        opacity: 0.9;
      }
      80%,
      100% {
        transform: scale(1.7);
        opacity: 0;
      }
    }

    .scooter__bg {
      fill: var(--brand, #f2542d);
      stroke: #ffffff;
      stroke-width: 3;
      filter: drop-shadow(0 4px 7px rgba(16, 26, 44, 0.28));
    }

    .scooter__glyph {
      fill: none;
      stroke: #ffffff;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .scooter--parked .scooter__bg {
      fill: #15803d;
    }

    .scooter__label {
      fill: var(--ink-900, #101a2c);
      stroke: #ffffff;
      stroke-width: 3.5;
      paint-order: stroke;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.01em;
      pointer-events: none;
    }

    .search-ring circle {
      fill: none;
      stroke: var(--brand, #f2542d);
      stroke-width: 2;
      opacity: 0.6;
      animation: ping 2s ease-out infinite;
    }

    .search-ring circle:nth-child(2) {
      animation-delay: 0.8s;
    }

    .search-core {
      fill: var(--brand, #f2542d);
      stroke: none;
      opacity: 1 !important;
    }

    .track__chip {
      position: absolute;
      top: 12px;
      left: 12px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 11px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 4px 14px rgba(16, 26, 44, 0.1);
      color: var(--ink-800, #1f2a3d);
      font-size: 0.7rem;
      font-weight: 800;
      backdrop-filter: blur(8px);
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #15803d;
    }

    .dot--amber {
      background: #d97706;
    }

    .dot--brand {
      background: var(--brand, #f2542d);
    }

    .track__eta {
      position: absolute;
      top: 12px;
      right: 54px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 11px;
      border-radius: 999px;
      background: var(--ink-900, #101a2c);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      box-shadow: 0 8px 18px rgba(16, 26, 44, 0.22);
    }

    .track__expand {
      position: absolute;
      top: 10px;
      right: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.96);
      color: var(--ink-800, #1f2a3d);
      box-shadow: 0 4px 14px rgba(16, 26, 44, 0.16);
      cursor: pointer;
      z-index: 2;
      backdrop-filter: blur(8px);
    }

    .track__expand:hover {
      color: var(--brand, #f2542d);
    }

    .track__expand:focus-visible {
      outline: 2px solid var(--brand, #f2542d);
      outline-offset: 2px;
    }

    .track__card {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 11px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 10px 24px rgba(16, 26, 44, 0.14);
      backdrop-filter: blur(10px);
    }

    .track__copy {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
      line-height: 1.25;
    }

    .track__copy strong {
      font-size: 0.82rem;
      color: var(--ink-900, #101a2c);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .track__copy span {
      font-size: 0.68rem;
      color: var(--slate-500, #64748b);
    }

    .track__call {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--brand-soft, #ffeee8);
      color: var(--brand, #f2542d);
      flex: none;
    }

    .track__done {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 9px;
      border-radius: 999px;
      background: #dcfce7;
      color: #15803d;
      font-size: 0.68rem;
      font-weight: 800;
      flex: none;
    }

    .track__pin {
      position: absolute;
      right: 12px;
      bottom: 66px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      max-width: 60%;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.9);
      color: var(--slate-600, #475569);
      font-size: 0.64rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (prefers-reduced-motion: reduce) {
      .you-pulse,
      .search-ring circle {
        animation: none;
      }
    }
  `,
})
export class TrackingMap {
  readonly status = input<RequestStatus | null>(null);
  readonly mechanicName = input('');
  readonly riderLabel = input('You');
  readonly location = input('');
  readonly eta = input('');
  readonly phone = input('');

  /** Large, in-page map view opened by clicking the map. */
  readonly expanded = signal(false);

  expand(): void {
    if (!this.expanded()) this.expanded.set(true);
  }

  collapse(): void {
    this.expanded.set(false);
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.expanded.update((open) => !open);
  }

  /** Follows the road grid instead of cutting across buildings. */
  readonly roadPath =
    'M574 84 L574 120 Q574 128 566 128 L432 128 Q424 128 424 136 L424 238 Q424 246 416 246 L290 246 Q282 246 282 254 L282 376 Q282 384 274 384 L154 384 Q146 384 146 376 L146 340 L150 332';

  /** Idle coverage: a nearby mechanic cruising the block next to the customer. */
  readonly nearbyPath =
    'M424 376 Q424 384 416 384 L290 384 Q282 384 282 376 L282 254 Q282 246 290 246 L416 246 Q424 246 424 254 Z';

  readonly initials = computed(() => {
    const name = this.mechanicName().trim();
    if (!name) return 'MR';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  });

  readonly chipLabel = computed(() => {
    switch (this.status()) {
      case 'SEARCHING':
        return 'Finding a mechanic';
      case 'EN_ROUTE':
        return 'Mechanic on the way';
      case 'ARRIVED':
        return 'Mechanic has arrived';
      case 'COMPLETED':
        return 'Rescue completed';
      case 'CANCELLED':
        return 'Request cancelled';
      default:
        return 'Live coverage';
    }
  });

  readonly etaLabel = computed(() => {
    if (this.status() === 'ARRIVED' || this.status() === 'COMPLETED') return 'On site';
    if (this.status() === 'EN_ROUTE') return this.eta() || '4 min';
    return '';
  });

  readonly subLabel = computed(() => {
    switch (this.status()) {
      case 'SEARCHING':
        return 'Matching you with the closest partner';
      case 'EN_ROUTE':
        return `Approaching now${this.eta() ? ' · ' + this.eta() : ''}`;
      case 'ARRIVED':
        return 'At your location — repair starting';
      case 'COMPLETED':
        return 'Job complete. Thanks for riding with us.';
      default:
        return '';
    }
  });

  readonly ariaLabel = computed(
    () =>
      `Map showing ${this.riderLabel()} and ${this.mechanicName() || 'the assigned mechanic'}. ${this.subLabel()}`,
  );
}
