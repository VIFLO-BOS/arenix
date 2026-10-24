import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { hostnameOf } from "@/lib/links";
import type { ProjectMedia, ProjectStatus } from "@/types/content";
import { MediaPlaceholder } from "./media-placeholder";

export function BrowserFrame({ children, url, className }: { children: ReactNode; url?: string; className?: string }) {
  return (
    <div className={cn("browser-frame", className)}>
      <div className="bar">
        <i />
        <i />
        <i />
        {url && <span className="ml-3 truncate rounded-md bg-ink/60 px-2 py-0.5 font-mono text-[0.6rem] text-muted">{hostnameOf(url)}</span>}
      </div>
      {children}
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[260px] overflow-hidden rounded-[2rem] border border-[var(--line-strong)] bg-surface-deep p-2 shadow-[0_30px_80px_-30px_rgba(2,10,30,0.7)]", className)}>
      <div className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-b-xl bg-ink" aria-hidden="true" />
      <div className="overflow-hidden rounded-[1.5rem]">{children}</div>
    </div>
  );
}

/**
 * Renders authentic project media with next/image, or the labelled placeholder when nothing
 * approved exists. Never fabricates a screenshot.
 */
export function ProjectMediaImage({
  media,
  title,
  status,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  className,
  fill = true,
}: {
  media?: ProjectMedia | null;
  title: string;
  status: ProjectStatus;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
}) {
  if (!media || !media.approvedForPublication) {
    return <MediaPlaceholder title={title} status={status} className={className} />;
  }
  if (fill) {
    return <Image src={media.src} alt={media.alt} fill sizes={sizes} priority={priority} className={cn("object-cover object-top", className)} />;
  }
  return <Image src={media.src} alt={media.alt} width={media.width ?? 1440} height={media.height ?? 900} sizes={sizes} priority={priority} className={cn("h-auto w-full", className)} />;
}
