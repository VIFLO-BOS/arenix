import Image from "next/image";
import { stockImages, type ImageKey } from "@/content/images";
import { cn } from "@/lib/utils";

/**
 * Topic matched photograph in a framed box. Pass an aspect ratio through `className`
 * (for example `aspect-[16/10]`) or give the parent a size and use `className="absolute inset-0"`.
 */
export function TopicImage({ image, className, sizes = "(max-width: 1024px) 100vw, 50vw", priority = false, overlay = "none", alt }: { image: ImageKey; className?: string; sizes?: string; priority?: boolean; overlay?: "none" | "soft" | "strong"; alt?: string }) {
  const s = stockImages[image];
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image src={s.file} alt={alt ?? s.alt} fill sizes={sizes} priority={priority} className="img-zoom object-cover" />
      {overlay !== "none" && <div aria-hidden="true" className={cn("absolute inset-0", overlay === "soft" ? "bg-[linear-gradient(to_top,rgba(6,19,42,0.7),rgba(6,19,42,0.1)_55%)]" : "bg-[linear-gradient(to_top,rgba(6,19,42,0.9),rgba(6,19,42,0.35))]")} />}
    </div>
  );
}

/**
 * Full bleed photograph behind a hero. A navy gradient keeps the left hand copy readable and
 * fades the image into the section below. Place as the first child of a `relative overflow-hidden` section.
 */
export function HeroBackdrop({ image, priority = true, strength = "default" }: { image: ImageKey; priority?: boolean; strength?: "default" | "light" }) {
  const s = stockImages[image];
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Image src={s.file} alt="" fill sizes="100vw" priority={priority} className="object-cover object-center" />
      <div className={cn("absolute inset-0", strength === "light" ? "bg-[linear-gradient(90deg,rgba(6,19,42,0.92)_0%,rgba(6,19,42,0.78)_50%,rgba(6,19,42,0.55)_100%)]" : "bg-[linear-gradient(90deg,rgba(6,19,42,0.96)_0%,rgba(6,19,42,0.86)_45%,rgba(6,19,42,0.62)_100%)]")} />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_bottom,transparent,var(--bg))]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_top,transparent,rgba(6,19,42,0.7))]" />
    </div>
  );
}
