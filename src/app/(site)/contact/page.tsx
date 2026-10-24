import type { Metadata } from "next";
import { getFaqs, getPublicSettings } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Aurora } from "@/components/motion/aurora";
import { buildWhatsAppUrl, whatsappMessageFor } from "@/lib/links";
import { Button, ArrowIcon, ExternalIcon } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ContactForm } from "@/components/forms/contact-form";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Contact areniX Technologies Limited. Send a message, chat on WhatsApp, or start a project request. Every inquiry is saved with a reference number.",
  path: "/contact",
});

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const sp = await searchParams;
  const [settings, faqs] = await Promise.all([getPublicSettings(), getFaqs("contact")]);
  const { email, phone, whatsappDigits, showLocation, addressLine, city, country } = settings.contact;
  const wa = buildWhatsAppUrl(whatsappDigits, whatsappMessageFor({ page: "contact" }));
  const location = showLocation ? [addressLine, city, country].filter(Boolean).join(", ") : "";

  const channels = [
    wa && { k: "WhatsApp", v: "Fastest for quick questions. Opens a chat with the official areniX business number.", href: wa, label: "Open WhatsApp", external: true },
    email && { k: "Email", v: "For documents, briefs and anything you want on record.", href: `mailto:${email}`, label: email, external: false },
    phone && { k: "Phone", v: `Working hours, ${settings.booking.operatingHoursNote}.`, href: `tel:${phone.replace(/\s+/g, "")}`, label: phone, external: false },
    { k: "Start a project", v: "A structured brief with budget, timeline and attachments.", href: "/start-project", label: "Open the project form", external: false },
  ].filter(Boolean) as { k: string; v: string; href: string; label: string; external: boolean }[];

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-contact" />
        <Aurora tone="quiet" />
        <div className="container-x relative">
          <Eyebrow index="Contact">Talk to us</Eyebrow>
          <SplitLines as="h1" text="Tell us what you are trying to build." className="text-display-xl mt-6 max-w-[16ch]" />
          <Reveal delay={0.2}>
            <p className="text-lead mt-6 max-w-[60ch] text-muted">Messages sent through this page are saved immediately with a reference number and reviewed by the team during working hours.</p>
          </Reveal>
        </div>
      </section>

      <Section surface="dark" className="pt-0">
        <div className="container-x">
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {channels.map((c) => (
              <StaggerItem as="li" key={c.k} className="hover-lift flex h-full flex-col gap-3 card p-6 hover:border-accent/50">
                <p className="text-micro text-muted">{c.k}</p>
                <p className="text-sm leading-relaxed text-muted">{c.v}</p>
                <div className="mt-auto pt-2">
                  <Button href={c.href} external={c.external} variant="link" className="break-all text-sm">
                    {c.label} {c.external ? <ExternalIcon /> : <ArrowIcon />}
                  </Button>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="light" id="form">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <SectionHeading index="01" eyebrow="General inquiry" title="Send a message." lead="Tell us a little about your organisation and what you need. We reply using the method you choose." />
              {location && (
                <div className="mt-8 card p-5">
                  <p className="text-micro text-fg-muted">Location</p>
                  <p className="mt-2 text-sm">{location}</p>
                </div>
              )}
              <div className="mt-4 card p-5">
                <p className="text-micro text-fg-muted">Working hours</p>
                <p className="mt-2 text-sm">{settings.booking.operatingHoursNote}</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-8">
            <ContactForm defaultSubject={sp.subject ?? ""} whatsappDigits={whatsappDigits} />
          </div>
        </div>
      </Section>

      <Section surface="deep">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading index="02" eyebrow="FAQ" title="Before you write." />
          </div>
          <div className="lg:col-span-8">
            <FaqAccordion items={faqs} />
          </div>
        </div>
      </Section>
    </>
  );
}
