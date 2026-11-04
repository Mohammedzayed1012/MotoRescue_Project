import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { RequestStatus } from '../../core/models';

@Component({
  selector: 'app-tracking-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div
      class="track"
      [class.track--arrived]="status() === 'ARRIVED'"
      [class.track--complete]="status() === 'COMPLETED'"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      <svg class="track__map" viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
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

        <g class="labels">
          <text x="322" y="122">ITPL Main Road</text>
          <text x="40" y="242">Whitefield</text>
          <text x="470" y="306">Forum Mall</text>
          <text x="300" y="372">Hope Farm</text>
        </g>

        <path class="route" [attr.d]="routePath" />

        <g class="you-pin" transform="translate(150 332)">
          <circle class="you-pulse" r="22" />
          <circle class="you-ring" r="13" />
          <circle class="you-dot" r="7" />
          <text x="22" y="5">You</text>
        </g>

        @if (status() === 'EN_ROUTE') {
          <g class="mech-pin">
            <circle class="mech-halo" r="20" />
            <circle class="mech-body" r="14" />
            <path class="mech-icon" d="M-6 -1h3l2-3h3l-1 3h3l2 3h-3l-1 2h-6l-1-2h-4z" />
            <animateMotion dur="16s" repeatCount="indefinite" [attr.path]="routePath" />
          </g>
        }

        @if (status() === 'ARRIVED' || status() === 'COMPLETED') {
          <g class="mech-pin mech-pin--parked" transform="translate(150 306)">
            <circle class="mech-body" r="14" />
            <path class="mech-icon" d="M-6 -1h3l2-3h3l-1 3h3l2 3h-3l-1 2h-6l-1-2h-4z" />
          </g>
        }

        @if (status() === 'SEARCHING') {
          <g class="search-ring" transform="translate(540 92)">
            <circle r="16" />
            <circle r="16" />
            <circle class="search-core" r="6" />
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
            <a class="track__call" [href]="'tel:' + (phone() || '+918000000000')" aria-label="Call your mechanic">
              <app-icon name="phone" [size]="15" />
            </a>
          }
        </div>
      }

      <span class="track__pin">
        <app-icon name="pin" [size]="13" />
        {{ location() || 'Your live location' }}
      </span>
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

    .labels text {
      fill: rgba(16, 26, 44, 0.38);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .route {
      fill: none;
      stroke: var(--brand, #f2542d);
      stroke-width: 5;
      stroke-linecap: round;
      stroke-dasharray: 9 11;
      animation: route-flow 1.4s linear infinite;
      filter: drop-shadow(0 2px 3px rgba(242, 84, 45, 0.25));
    }

    @keyframes route-flow {
      to {
        stroke-dashoffset: -40;
      }
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

    .mech-body {
      fill: var(--ink-900, #101a2c);
      stroke: #ffffff;
      stroke-width: 3;
    }

    .mech-halo {
      fill: rgba(16, 26, 44, 0.1);
    }

    .mech-icon {
      fill: #ffffff;
      transform: translateY(1px);
    }

    .mech-pin--parked .mech-body {
      fill: #15803d;
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
      right: 12px;
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

    .track--arrived .route {
      stroke: #15803d;
    }

    @media (prefers-reduced-motion: reduce) {
      .route,
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

  readonly routePath =
    'M552 84 C500 96 512 150 466 166 C420 182 404 128 356 150 C308 172 330 238 272 250 C214 262 214 318 150 332';

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
