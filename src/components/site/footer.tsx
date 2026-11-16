import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Image src="/images/logo-horizontal.png" alt="Worklush Spaces" width={200} height={43} className="h-9 w-auto" />
          <p className="type-small mt-4 max-w-xs text-white/70">
            A coworking floor on 80 Feet Ring Road, Nagarbhavi. Desks by the day, rooms by the hour, cabins by the month.
          </p>
        </div>
        <div>
          <h3 className="type-small font-semibold text-lime">Book</h3>
          <ul className="type-small mt-3 space-y-2 text-white/80">
            <li><Link href="/book?kind=desk" className="hover:text-white">Open desk</Link></li>
            <li><Link href="/book?kind=boss" className="hover:text-white">Boss cabins</Link></li>
            <li><Link href="/book?space=conference" className="hover:text-white">Conference room</Link></li>
            <li><Link href="/book?space=podcast" className="hover:text-white">Podcast studio</Link></li>
            <li><Link href="/book?kind=cabin" className="hover:text-white">Team cabins</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="type-small font-semibold text-lime">Visit</h3>
          <address className="type-small mt-3 space-y-1 not-italic text-white/80">
            <div>{site.address.line1}</div>
            <div>{site.address.line2}</div>
            <div>{site.address.city}</div>
          </address>
          <p className="type-small mt-3 text-white/80">{site.hours}</p>
        </div>
        <div>
          <h3 className="type-small font-semibold text-lime">Talk to us</h3>
          <ul className="type-small mt-3 space-y-2 text-white/80">
            <li><a href={site.phoneHref} className="hover:text-white">{site.phone}</a></li>
            <li><a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a></li>
            <li><a href={site.whatsappHref} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp</a></li>
            <li><a href={site.social.instagram} target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a></li>
            <li><a href={site.social.facebook} target="_blank" rel="noreferrer" className="hover:text-white">Facebook</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="type-small mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {site.name}. Film and TV shoots welcome, ask us.</span>
          <span className="flex gap-4">
            <a href={site.legal.terms} className="hover:text-white">Terms</a>
            <a href={site.legal.privacy} className="hover:text-white">Privacy</a>
            <a href={site.legal.refunds} className="hover:text-white">Cancellations & refunds</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
