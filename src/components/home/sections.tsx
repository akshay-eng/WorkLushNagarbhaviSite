import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUpRight,
  Bike,
  Box,
  Coffee,
  CreditCard,
  Gamepad2,
  Library,
  LockOpen,
  MapPin,
  MessageCircle,
  MousePointerClick,
  Phone,
  Printer,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CtaLink } from "@/components/site/cta";
import { amenities, site } from "@/data/site";

const AMENITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  zap: Zap,
  coffee: Coffee,
  printer: Printer,
  "scan-face": ScanFace,
  "shield-check": ShieldCheck,
  library: Library,
  sparkles: Sparkles,
  "gamepad-2": Gamepad2,
  bike: Bike,
  "arrow-up-down": ArrowUpDown,
  "lock-open": LockOpen,
};

/** Section heading used by every block on the page. */
function Heading({ eyebrow, title, light = false, children }: { eyebrow: string; title: string; light?: boolean; children?: React.ReactNode }) {
  return (
    <div className="reveal-scroll max-w-2xl">
      <p className={light ? "type-eyebrow !text-lime" : "type-eyebrow"}>{eyebrow}</p>
      <h2 className={`type-h1 mt-3 ${light ? "text-white" : "text-ink"}`}>{title}</h2>
      {children}
    </div>
  );
}

type SpaceCard = { href: string; title: string; price: string; unit: string; body: string; photo: string; className: string; tag?: string };

const SPACES: SpaceCard[] = [
  { href: "/book?kind=desk", title: "Open desks", price: "₹500", unit: "/ day", body: "22 desks in three clusters. Pick the exact seat, from 9 to 6.", photo: "/images/open-booking.jpg", className: "md:col-span-2 md:row-span-2", tag: "22 desks" },
  { href: "/book?kind=boss", title: "Boss cabins", price: "₹450", unit: "/ hr", body: "Two private cabins beside the moss wall. ₹24,999 a month.", photo: "/images/rooms-6.jpg", className: "", tag: "Hourly or monthly" },
  { href: "/book?kind=cabin", title: "Team cabins", price: "₹450", unit: "/ hr", body: "Glass cabins for 4, 5, 6 or 7. Meetings or a home for your team.", photo: "/images/cabin.jpg", className: "" },
  { href: "/book?space=conference", title: "Conference room", price: "₹1,500", unit: "/ hr", body: "Ten seats, a big screen and the moss wall.", photo: "/images/conference.jpg", className: "" },
  { href: "/book?space=podcast", title: "Podcast studio", price: "₹1,900", unit: "/ hr", body: "Treated, lit, mic'd. Walk in and record.", photo: "/images/podcast.jpg", className: "" },
  { href: "/book", title: "Lounge, café & window bar", price: "Included", unit: "", body: "Coffee all day, chess, sofas and stools along the glass.", photo: "/images/rooms-3.jpg", className: "md:col-span-2" },
];

export function Spaces() {
  return (
    <section id="spaces" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Heading eyebrow="Spaces & prices" title="One floor, every way to work on it." />
          <p className="type-body reveal-scroll max-w-sm text-muted-foreground">Prices exclude 18% GST. Power, A/C, Wi-Fi and coffee are always included.</p>
        </div>
        <div className="mt-12 grid auto-rows-[300px] grid-cols-1 gap-4 md:grid-cols-4">
          {SPACES.map((s) => (
            <Link key={s.title} href={s.href} className={`reveal-scroll group relative overflow-hidden rounded-3xl bg-ink text-white shadow-[0_24px_50px_-30px_rgb(2_60_64/0.6)] transition-transform duration-300 ease-out-premium hover:-translate-y-1 ${s.className}`}>
              <Image src={s.photo} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover opacity-90 transition-transform duration-700 ease-out-premium group-hover:scale-[1.05]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent" />
              {s.tag && <span className="type-caption absolute left-5 top-5 rounded-full bg-lime px-3 py-1 text-ink">{s.tag}</span>}
              <span className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur transition-[background-color,transform] duration-300 group-hover:rotate-45 group-hover:bg-lime group-hover:text-ink">
                <ArrowUpRight className="h-5 w-5" />
              </span>
              <div className="absolute inset-x-5 bottom-5">
                <h3 className="type-h3">{s.title}</h3>
                <p className="type-small mt-1 max-w-sm text-white/75">{s.body}</p>
                <p className="mt-3">
                  <span className="type-h2 nums">{s.price}</span> <span className="type-small text-white/70">{s.unit}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: MousePointerClick, title: "Pick on the plan", body: "Choose your desk, cabin or room on the live floor plan. Free seats are green." },
  { icon: Box, title: "Step inside", body: "Drop into a 3D view from that exact seat and look around before you commit." },
  { icon: UserCheck, title: "Register, sign in, verify", body: "Create an account, sign in, and add a government ID for the front desk." },
  { icon: CreditCard, title: "Pay and walk in", body: "Pay by UPI or card. Show your booking reference at reception." },
];

export function HowItWorks() {
  return (
    <section className="bg-mint/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Heading eyebrow="How booking works" title="From plan to desk in four steps." />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="reveal-scroll relative rounded-3xl border border-ink/10 bg-white p-6">
              <span className="type-small nums text-muted-foreground">0{i + 1}</span>
              <span className="mt-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-lime">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="type-h3 mt-5 text-ink">{s.title}</h3>
              <p className="type-body mt-2 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Amenities() {
  return (
    <section id="amenities" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.6fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Heading eyebrow="Included, always" title="Work without the meter running.">
            <p className="type-lead mt-4 max-w-md text-muted-foreground">Everything you&apos;d otherwise pay extra for is part of the price. Plug in, settle down, get going.</p>
          </Heading>
          <div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-3xl lg:block">
            <Image src="/images/rooms-2.jpg" alt="Window bar stools along the glass" fill sizes="40vw" className="object-cover" />
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((a) => {
            const Icon = AMENITY_ICONS[a.icon] ?? Sparkles;
            return (
              <li key={a.title} className="reveal-scroll group bg-card p-6 transition-colors duration-200 hover:bg-mint/40">
                <Icon className="h-6 w-6 text-teal transition-transform duration-300 ease-out-premium group-hover:-translate-y-0.5 group-hover:scale-110" />
                <h3 className="type-title mt-4 text-ink">{a.title}</h3>
                <p className="type-small mt-1.5 text-muted-foreground">{a.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function Visit() {
  return (
    <section id="visit" className="scroll-mt-20 pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="reveal-scroll grid overflow-hidden rounded-[32px] border border-border bg-card lg:grid-cols-[1.3fr_1fr]">
          <div className="relative min-h-[320px] bg-mint">
            <iframe title="Worklush Spaces on Google Maps" src={site.mapEmbed} className="absolute inset-0 h-full w-full border-0 grayscale-[30%]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <div className="flex flex-col gap-6 p-8 sm:p-10">
            <div>
              <p className="type-eyebrow">Come by</p>
              <h2 className="type-h2 mt-3 text-ink">Third floor, 80 Feet Ring Road.</h2>
            </div>
            <address className="type-body flex items-start gap-3 not-italic text-foreground">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-teal" />
              <span>
                {site.address.line1}
                <br />
                {site.address.line2}
                <br />
                {site.address.city}
              </span>
            </address>
            <p className="type-body text-muted-foreground">{site.hours}. Cafés, banks and buses are right outside.</p>
            <div className="mt-auto flex flex-wrap gap-3">
              <a href={site.whatsappHref} target="_blank" rel="noreferrer" className="type-body inline-flex h-12 items-center gap-2 rounded-full bg-[#25d366] px-5 font-semibold text-white transition-transform duration-150 active:scale-[0.97]">
                <MessageCircle className="h-4 w-4" /> WhatsApp us
              </a>
              <a href={site.phoneHref} className="type-body nums inline-flex h-12 items-center gap-2 rounded-full border border-ink/15 px-5 font-semibold text-ink transition-colors hover:bg-mint">
                <Phone className="h-4 w-4" /> {site.phone}
              </a>
              <a href={site.mapLink} target="_blank" rel="noreferrer" className="type-body inline-flex h-12 items-center gap-2 rounded-full px-3 font-semibold text-teal hover:underline">
                Directions <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-ink py-24 text-white">
      <div aria-hidden className="absolute inset-0 opacity-[0.15]">
        <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 200">
          {Array.from({ length: 22 }).map((_, i) => (
            <circle key={i} cx={46 + (i % 11) * 31} cy={80 + Math.floor(i / 11) * 40} r={6} fill="none" stroke="#c8f169" strokeWidth={1.5} />
          ))}
        </svg>
      </div>
      <div className="reveal-scroll relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="type-display text-balance">
          Your desk is waiting. <span className="whitespace-nowrap text-lime">Pick it.</span>
        </h2>
        <p className="type-lead mx-auto mt-5 max-w-xl text-white/70">Day passes from ₹500. Cabins by the hour or the month. Book in under a minute.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CtaLink href="/book" arrow>
            Book a seat
          </CtaLink>
          <CtaLink href="/book?kind=cabin" variant="white">
            Book a cabin
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
