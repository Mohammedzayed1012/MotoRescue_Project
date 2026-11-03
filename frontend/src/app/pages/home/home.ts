import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Icon, IconName } from '../../shared/icon/icon';
import { MapPreview } from '../../shared/map-preview/map-preview';
import { SiteFooter } from '../../shared/site-footer/site-footer';
import { SiteHeader } from '../../shared/site-header/site-header';

interface HomeService {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  price: string;
}

interface Step {
  icon: IconName;
  title: string;
  description: string;
}

interface Feature {
  icon: IconName;
  title: string;
  description: string;
}

interface Testimonial {
  quote: string;
  name: string;
  meta: string;
  initials: string;
  tone: 'brand' | 'green' | 'blue';
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, MapPreview, SiteHeader, SiteFooter],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  readonly services: HomeService[] = [
    {
      id: 'puncture',
      icon: 'tire',
      title: 'Puncture & tyre repair',
      description: 'Tube changes, tubeless plugs, and pressure checks at the roadside.',
      price: 'From ₹149',
    },
    {
      id: 'battery',
      icon: 'battery',
      title: 'Battery & starting',
      description: 'Jump-starts, terminal fixes, and on-spot battery replacement.',
      price: 'From ₹199',
    },
    {
      id: 'fuel',
      icon: 'fuel',
      title: 'Fuel delivery',
      description: 'Petrol delivered to you — enough to reach the nearest pump.',
      price: 'From ₹99',
    },
    {
      id: 'repair',
      icon: 'wrench',
      title: 'General repairs',
      description: 'Brakes, cables, levers, and the everyday fixes that stop a ride.',
      price: 'From ₹249',
    },
    {
      id: 'chain',
      icon: 'chain',
      title: 'Chain & clutch',
      description: 'Snapped chains, slipping gears, and clutch adjustments.',
      price: 'From ₹229',
    },
    {
      id: 'tow',
      icon: 'tow',
      title: 'Towing & recovery',
      description: 'Safe transport to a trusted garage when a fix is not possible.',
      price: 'From ₹499',
    },
  ];

  readonly steps: Step[] = [
    {
      icon: 'pin',
      title: 'Share your location',
      description: 'Drop a pin, or let us detect where you are. No address hunting.',
    },
    {
      icon: 'wrench',
      title: 'Tell us what happened',
      description: 'Pick the issue and see an upfront estimate before you confirm.',
    },
    {
      icon: 'navigation',
      title: 'Track your mechanic',
      description: 'Watch them arrive live, with their name, rating, and ETA.',
    },
  ];

  readonly features: Feature[] = [
    {
      icon: 'shield',
      title: 'Verified, police-checked mechanics',
      description: 'Every partner is ID-verified, trained, and rated after every job.',
    },
    {
      icon: 'wallet',
      title: 'The price you see is the price you pay',
      description: 'Quotes are locked before dispatch. No surprise add-ons at the roadside.',
    },
    {
      icon: 'navigation',
      title: 'Live tracking, start to finish',
      description: 'Follow your mechanic on the map and know exactly when they will arrive.',
    },
    {
      icon: 'headset',
      title: 'A real human, 24/7',
      description: 'Our rescue desk stays on the line until you are safely moving again.',
    },
  ];

  readonly testimonials: Testimonial[] = [
    {
      quote:
        'I was stranded on the ORR at 11pm with a flat. A mechanic reached me in 14 minutes, fixed it, and the price was exactly what the app quoted.',
      name: 'Ananya Rao',
      meta: 'Royal Enfield Classic · Bengaluru',
      initials: 'AR',
      tone: 'brand',
    },
    {
      quote:
        'The live tracking is what sold me. I could see exactly where he was, and my parents could stop worrying. This is how roadside help should work.',
      name: 'Karthik Menon',
      meta: 'Honda Activa · Hyderabad',
      initials: 'KM',
      tone: 'green',
    },
    {
      quote:
        'My chain snapped on a weekend ride. One tap, a verified mechanic, and a clear estimate. Back on the road before the tea got cold.',
      name: 'Sneha Patil',
      meta: 'Yamaha MT-15 · Pune',
      initials: 'SP',
      tone: 'blue',
    },
  ];

  readonly faqs = [
    {
      question: 'How fast can a mechanic reach me?',
      answer:
        'Most riders in covered zones are matched within 2 minutes and see a mechanic in 15–25 minutes, depending on traffic and location. Your live ETA updates as the mechanic moves.',
    },
    {
      question: 'Do I pay before or after the repair?',
      answer:
        'You approve an upfront estimate before dispatch. Payment is collected after the job is complete, and the final amount never exceeds the approved quote without your confirmation.',
    },
    {
      question: 'What if my bike cannot be fixed on the spot?',
      answer:
        'We arrange towing to a trusted partner garage. You will see the recovery cost before confirming, and Rescue+ members get two free tows every year.',
    },
    {
      question: 'Which areas do you cover?',
      answer:
        'We currently operate across Bengaluru, Hyderabad, Pune, Chennai, Mumbai, and Delhi NCR, with new zones added every month. Enter your location to check live coverage.',
    },
    {
      question: 'Can any mechanic join MotoRescue?',
      answer:
        'Mechanics apply with their ID, workshop details, and certifications. We verify each application, run a background check, and review performance after every job.',
    },
  ];

  readonly cities = ['Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Mumbai', 'Delhi NCR'];

  requestRescue(): void {
    if (this.auth.isAuthenticated()) {
      if (this.auth.role() === 'CUSTOMER') {
        this.router.navigate(['/customer'], { queryParams: { tab: 'request' } });
        return;
      }

      this.router.navigate([this.auth.dashboardPath()]);
      return;
    }

    this.router.navigate(['/register']);
  }

  selectService(service: HomeService): void {
    if (this.auth.isAuthenticated() && this.auth.role() === 'CUSTOMER') {
      this.router.navigate(['/customer'], {
        queryParams: { tab: 'request', service: service.id },
      });
      return;
    }

    this.router.navigate(['/register'], {
      queryParams: { service: service.id },
    });
  }

  joinWaitlist(): void {
    this.toasts.show(
      'You are on the list. We will let you know as soon as MotoRescue reaches your city.',
      'success',
    );
  }
}
