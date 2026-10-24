import type { Metadata } from "next";
import { getFaqs, getPublicSettings } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Aurora } from "@/components/motion/aurora";
import { CONSULTATION_TYPES } from "@/types/content";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ConsultationForm } from "@/components/forms/consultation-form";
import { CalcomEmbed } from "@/components/forms/calcom-embed";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { WhatsAppLink } from "@/components/layout/whatsapp-button";
import { whatsappMessageFor } from "@/lib/links";
import { HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Book a consultation",
  description: "Request a discovery, website, software, enterprise, mobile or consulting conversation with areniX. Requests are confirmed by the team before any meeting is fixed.",
  path: "/book-consultation",
});

export default async function BookConsultationPage({ searchParams }: { searchParams: Promise<{ type?: string; service?: string }> }) {
  const sp = await searchParams;
  const [settings, faqs] = await Promise.all([getPublicSettings(), getFaqs("booking")]);
  const live = settings.booking.mode === "calcom" && settings.booking.publicEventLink;

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-booking" />
        <Aurora tone="quiet" />
        <div className="container-x relative">
          <Eyebrow index="Booking">Consultation</Eyebrow>
          <SplitLines as="h1" text="Book a conversation with the team." className="text-display-xl mt-6 max-w-[16ch]" />
          <Reveal delay={0.2}>
            <p className="text-lead mt-6 max-w-[60ch] text-muted">Choose the kind of conversation you need. {live ? "Pick a time directly from our live calendar." : "Send your preferred windows and we confirm a time by email."}</p>
          </Reveal>
          <Reveal delay={0.25} className="mt-5">
            <Badge tone={live ? "success" : "outline"} dot>
              {live ? "Live scheduling" : "Request mode. Confirmed by the team"}
            </Badge>
          </Reveal>
        </div>
      </section>

      <Section surface="dark" className="pt-0">
        <div className="container-x">
          <Stagger as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONSULTATION_TYPES.map((t) => (
              <StaggerItem as="li" key={t.key} className="flex flex-col gap-2 card p-5 transition-colors duration-500 hover:border-accent/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-[1.02rem] font-semibold">{t.label}</p>
                  <span className="num-chip">{t.durationMinutes} min</span>
                </div>
                <p className="text-sm leading-relaxed text-muted">{t.description}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="light" id="request">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <SectionHeading index="01" eyebrow={live ? "Pick a time" : "Request a time"} title={live ? "Choose a slot." : "Tell us when suits you."} lead={live ? "Availability comes from our calendar. Your booking is confirmed instantly." : "A request is not a confirmed appointment. We reply with a proposed time and the booking is fixed once you accept."} />
              <div className="mt-8 card p-5">
                <p className="text-micro text-fg-muted">Team hours</p>
                <p className="mt-2 text-sm">{settings.booking.operatingHoursNote}</p>
              </div>
              {settings.contact.whatsappDigits && (
                <div className="mt-4">
                  <WhatsAppLink digits={settings.contact.whatsappDigits} message={whatsappMessageFor({ page: "booking" })} variant="secondary" />
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-8">{live ? <CalcomEmbed link={settings.booking.publicEventLink} typeKey={sp.type} /> : <ConsultationForm defaults={{ type: sp.type, service: sp.service }} operatingHoursNote={settings.booking.operatingHoursNote} />}</div>
        </div>
      </Section>

      <Section surface="deep">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading index="02" eyebrow="FAQ" title="About consultations." />
          </div>
          <div className="lg:col-span-8">
            <FaqAccordion items={faqs} />
          </div>
        </div>
      </Section>
    </>
  );
}
