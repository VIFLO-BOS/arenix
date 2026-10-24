import Link from "next/link";
import type { Service } from "@/types/content";
import { Reveal } from "@/components/motion/reveal";
import { ArrowIcon } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TopicImage } from "@/components/media/topic-image";
import { serviceImage } from "@/content/images";

/* Tile spans on a 6 column grid. The first and fourth tiles are hero tiles with artwork. */
const SPANS = ["lg:col-span-4 lg:row-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2 lg:row-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2"];

/** Bento grid of services for the home page. Mixed tile sizes, artwork on the hero tiles. */
export function ServiceBento({ services }: { services: Service[] }) {
  return (
    <ul className="grid auto-rows-[minmax(150px,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {services.slice(0, 8).map((s, i) => {
        const hero = i === 0 || i === 3;
        return (
          <Reveal as="li" key={s.slug} delay={(i % 4) * 0.07} className={cn(SPANS[i] ?? "lg:col-span-2", "min-w-0")}>
            <Link href={`/services/${s.slug}`} className={cn("card group flex h-full flex-col overflow-hidden p-6 hover:-translate-y-1", hero && "p-7")}>
              <div className="flex items-start justify-between gap-4">
                <span className="num-chip">{s.index}</span>
                <span className="inline-flex size-9 items-center justify-center rounded-full border border-line text-[var(--fg)] transition-[background-color,color,transform] duration-700 ease-[var(--ease-out-expo)] group-hover:bg-accent group-hover:text-ink group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowIcon />
                </span>
              </div>
              <h3 className={cn("mt-5 font-display font-bold leading-tight tracking-tight", hero ? "text-[clamp(1.3rem,2vw,1.75rem)]" : "text-[1.1rem]")}>{s.shortTitle ?? s.title}</h3>
              <p className={cn("mt-2 text-sm leading-relaxed text-[var(--fg-muted)]", !hero && "line-clamp-3")}>{s.summary}</p>
              {hero && (
                <div className="relative mt-6 min-h-[180px] flex-1 overflow-hidden rounded-xl border border-line">
                  <TopicImage image={serviceImage[s.slug] ?? "code"} className="absolute inset-0" overlay="soft" sizes="(max-width: 1024px) 100vw, 60vw" />
                </div>
              )}
            </Link>
          </Reveal>
        );
      })}
    </ul>
  );
}
