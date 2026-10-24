import { Button, ArrowIcon } from "@/components/ui/button";
import { SplitLines } from "@/components/motion/split-lines";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { WhatsAppLink } from "@/components/layout/whatsapp-button";
import { Aurora } from "@/components/motion/aurora";
import { bookConsultationHref, startProjectHref, whatsappMessageFor } from "@/lib/links";
import { cn } from "@/lib/utils";
import { TopicImage } from "@/components/media/topic-image";

/**
 * Contextual conversion block. Pass `service` or `project` so the CTAs carry context.
 */
export function CtaBand({
  title = "Let us turn your idea into something useful.",
  lead = "Tell us what you are building, or book a discovery conversation.",
  service,
  project,
  whatsappDigits = "",
  surface = "light",
  className,
}: {
  title?: string;
  lead?: string;
  service?: string;
  project?: string;
  whatsappDigits?: string;
  surface?: "light" | "dark" | "deep" | "gold";
  className?: string;
}) {
  return (
    <section data-surface={surface === "gold" ? "dark" : surface} className={cn("relative py-16 sm:py-24", className)}>
      <div className="container-x">
        <div className={cn("card relative grid items-center gap-10 overflow-hidden p-7 sm:p-10 lg:grid-cols-12 lg:p-14", surface === "gold" && "border-transparent shadow-[0_40px_120px_-40px_rgba(252,143,45,0.55)]")} data-surface={surface === "light" ? "deep" : surface}>
          <Aurora tone={surface === "gold" ? "gold" : "default"} />
          <div className="dots absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative lg:col-span-7">
          <p className="pill">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            Next step
          </p>
          <SplitLines as="h2" text={title} className="text-display-lg mt-4 max-w-[20ch]" />
          <Reveal delay={0.1}>
            <p className="text-lead mt-5 text-[var(--fg-muted)]">{lead}</p>
          </Reveal>
          <Reveal delay={0.15} className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            <Magnetic>
              <Button href={startProjectHref({ service, project })} variant={surface === "gold" ? "primary" : "accent"} size="lg">
                {service ? "Request a quote" : "Start a Project"} <ArrowIcon />
              </Button>
            </Magnetic>
            <Button href={bookConsultationHref({ service })} variant="secondary" size="lg">
              Book a consultation
            </Button>
            <WhatsAppLink digits={whatsappDigits} message={whatsappMessageFor({ service, project })} variant="ghost" size="lg" context={service ?? project ?? "cta"} />
          </Reveal>
        </div>
        <Reveal delay={0.2} className="relative hidden lg:col-span-5 lg:block">
          <div className="drift-slow card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.7)]">
            <TopicImage image="cta" className="aspect-[16/11] rounded-[inherit]" overlay="soft" sizes="40vw" />
          </div>
        </Reveal>
        </div>
      </div>
    </section>
  );
}
