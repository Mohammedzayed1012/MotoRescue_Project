import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-map-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="map" role="img" [attr.aria-label]="label()">
      <svg class="map__roads" viewBox="0 0 420 320" preserveAspectRatio="none" aria-hidden="true">
        <g class="map__blocks">
          <rect x="18" y="22" width="78" height="52" rx="6" />
          <rect x="120" y="14" width="64" height="64" rx="6" />
          <rect x="208" y="28" width="92" height="46" rx="6" />
          <rect x="324" y="16" width="72" height="58" rx="6" />
          <rect x="30" y="118" width="60" height="64" rx="6" />
          <rect x="112" y="108" width="86" height="48" rx="6" />
          <rect x="222" y="112" width="58" height="70" rx="6" />
          <rect x="302" y="104" width="94" height="54" rx="6" />
          <rect x="20" y="218" width="88" height="76" rx="6" />
          <rect x="130" y="196" width="70" height="58" rx="6" />
          <rect x="226" y="214" width="74" height="80" rx="6" />
          <rect x="322" y="192" width="74" height="54" rx="6" />
        </g>
        <g class="map__streets">
          <path d="M0 96h420" />
          <path d="M0 186h420" />
          <path d="M0 208h420" />
          <path d="M104 0v320" />
          <path d="M206 0v320" />
          <path d="M306 0v320" />
          <path d="M0 282h420" />
        </g>
        <path class="map__route" d="M84 252c34 0 30-52 62-52s34 58 74 58 38-66 78-66 44 30 74 30" />
      </svg>

      <span class="map__pin map__pin--user" aria-hidden="true">
        <span class="map__pulse"></span>
        <span class="map__dot"></span>
      </span>

      <span class="map__pin map__pin--mechanic" aria-hidden="true">
        <app-icon name="navigation" [size]="15" />
      </span>

      <span class="map__chip">
        <span class="map__chip-dot"></span>
        {{ badge() }}
      </span>

      @if (eta()) {
        <span class="map__eta">
          <app-icon name="timer" [size]="14" />
          {{ eta() }}
        </span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .map {
      position: relative;
      height: 100%;
      min-height: 220px;
      overflow: hidden;
      background:
        linear-gradient(90deg, rgba(16, 26, 44, 0.035) 1px, transparent 1px) 0 0 / 34px 34px,
        linear-gradient(rgba(16, 26, 44, 0.035) 1px, transparent 1px) 0 0 / 34px 34px,
        linear-gradient(150deg, #f4f1e9, #e9eee8 58%, #f0ece4);
      border-radius: inherit;
    }

    .map__roads {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .map__blocks rect {
      fill: rgba(255, 255, 255, 0.5);
      stroke: rgba(16, 26, 44, 0.05);
      stroke-width: 1;
    }

    .map__streets path {
      fill: none;
      stroke: rgba(255, 255, 255, 0.95);
      stroke-width: 13;
      stroke-linecap: round;
    }

    .map__streets path:nth-child(2) {
      stroke-width: 18;
    }

    .map__route {
      fill: none;
      stroke: var(--brand);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-dasharray: 7 9;
      opacity: 0.9;
      animation: route-flow 1.6s linear infinite;
    }

    @keyframes route-flow {
      to {
        stroke-dashoffset: -32;
      }
    }

    .map__pin {
      position: absolute;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      box-shadow: 0 6px 14px rgba(16, 26, 44, 0.25);
    }

    .map__pin--user {
      top: 74%;
      left: 18%;
      width: 20px;
      height: 20px;
      background: #fff;
    }

    .map__dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--blue);
    }

    .map__pulse {
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      background: rgba(36, 88, 197, 0.18);
      animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    @keyframes ping {
      0% {
        transform: scale(0.65);
        opacity: 0.8;
      }
      80%,
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }

    .map__pin--mechanic {
      top: 33%;
      right: 18%;
      width: 34px;
      height: 34px;
      background: var(--ink-900);
      color: #fff;
      border: 3px solid #fff;
    }

    .map__chip {
      position: absolute;
      top: 14px;
      left: 14px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 11px;
      border-radius: var(--radius-pill);
      background: rgba(255, 255, 255, 0.92);
      box-shadow: var(--shadow-sm);
      color: var(--ink-800);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      backdrop-filter: blur(6px);
    }

    .map__chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--brand);
    }

    .map__eta {
      position: absolute;
      right: 14px;
      bottom: 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 11px;
      border-radius: var(--radius-pill);
      background: var(--ink-900);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      box-shadow: var(--shadow-md);
    }
  `,
})
export class MapPreview {
  readonly label = input('Live map showing a mechanic approaching your location');
  readonly badge = input('Whitefield, Bengaluru');
  readonly eta = input('8 min away');
}
