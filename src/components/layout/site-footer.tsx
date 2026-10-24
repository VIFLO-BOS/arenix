import Link from "next/link";
import { legalNav, primaryNav, secondaryNav } from "@/config/navigation";
import { isSafeExternalUrl } from "@/lib/links";
import { WordmarkGiant } from "@/components/brand/wordmark";
import { Button, ArrowIcon } from "@/components/ui/button";
import { WhatsAppLink } from "./whatsapp-button";
import type { PublicSettings } from "@/server/repositories/content";

export function SiteFooter({ settings }: { settings: PublicSettings }) {
  const year = new Date().getFullYear();
  const socials = Object.entries(settings.socials).filter(([, url]) => isSafeExternalUrl(url)) as [string, string][];
  const hasContact = settings.contact.email || settings.contact.phone || settings.contact.whatsappDigits;

  return (
    <footer data-surface="deep" className="relative overflow-hidden">
      <div className="flare-blue right-[-20%] top-[-30%]" aria-hidden="true" />
      <div className="flare bottom-[-30%] left-[-20%]" aria-hidden="true" />
      <div className="container-x relative py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="pill">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
              Have a project in mind?
            </p>
            <h2 className="text-display-md mt-4 max-w-[16ch]">Let us build it together.</h2>
            <div className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
              <Button href="/start-project" variant="accent" size="lg">
                Start a Project <ArrowIcon />
              </Button>
              <Button href="/book-consultation" variant="secondary" size="lg">
                Book a Consultation
              </Button>
              <WhatsAppLink digits={settings.contact.whatsappDigits} message="Hello areniX, I would like to discuss a project." variant="ghost" size="lg" context="footer" />
            </div>
          </div>

          <div className="card grid grid-cols-1 gap-10 p-6 xs:grid-cols-2 sm:p-8 lg:col-span-6 lg:grid-cols-3">
            <nav aria-label="Footer primary">
              <p className="text-micro mb-4 text-muted">Explore</p>
              <ol className="flex flex-col gap-2.5">
                {primaryNav.map((item, i) => (
                  <li key={item.href} className="flex items-center gap-3">
                    <span className="num-chip">0{i + 1}</span>
                    <Link href={item.href} className="link-underline text-sm text-on-dark/85 transition-colors duration-500 hover:text-accent">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
            <nav aria-label="Footer secondary">
              <p className="text-micro mb-4 text-muted">Company</p>
              <ul className="flex flex-col gap-2.5">
                {[...secondaryNav, ...legalNav].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="link-underline text-sm text-on-dark/85 transition-colors duration-500 hover:text-accent">
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/admin/login" className="text-sm text-muted transition-colors duration-500 hover:text-accent">
                    Team sign in
                  </Link>
                </li>
              </ul>
            </nav>
            <div>
              <p className="text-micro mb-4 text-muted">Contact</p>
              {hasContact ? (
                <ul className="flex flex-col gap-2.5 text-sm">
                  {settings.contact.email && (
                    <li>
                      <a href={`mailto:${settings.contact.email}`} className="break-all text-on-dark/85 hover:text-accent">
                        {settings.contact.email}
                      </a>
                    </li>
                  )}
                  {settings.contact.phone && (
                    <li>
                      <a href={`tel:${settings.contact.phone.replace(/\s+/g, "")}`} className="text-on-dark/85 hover:text-accent">
                        {settings.contact.phone}
                      </a>
                    </li>
                  )}
                  {settings.contact.showLocation && (settings.contact.city || settings.contact.country) && (
                    <li className="text-muted">{[settings.contact.addressLine, settings.contact.city, settings.contact.country].filter(Boolean).join(", ")}</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted">Use the contact form. Official channels are published once configured.</p>
              )}
              {socials.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-3">
                  {socials.map(([name, url]) => (
                    <li key={name}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-[0.12em] text-muted hover:text-accent">
                        {name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="mt-14 overflow-hidden border-t border-[rgba(246,243,234,0.08)] pt-8">
          <WordmarkGiant className="-mb-[0.1em] opacity-95" />
        </div>

        <div className="mt-8 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.brand.legalName}. All rights reserved.
          </p>
          <p>Built by areniX. Portfolio marks belong to their respective owners.</p>
        </div>
      </div>
    </footer>
  );
}
