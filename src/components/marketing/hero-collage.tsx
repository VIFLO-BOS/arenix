import {
  BrowserFrame,
  PhoneFrame,
  ProjectMediaImage,
} from "@/components/portfolio/browser-frame";
import type { PortfolioProject } from "@/types/content";
import { TopicImage } from "@/components/media/topic-image";

/**
 * Layered composition for the home hero. A software dashboard illustration sits behind the
 * authentic screens of public projects. Entrance uses CSS keyframes (server rendered,
 * hydration safe, disabled by reduced motion). Depth on scroll comes from the parent Parallax.
 */
export function HeroCollage({ projects }: { projects: PortfolioProject[] }) {
  const withMedia = projects.filter(
    (p) => p.coverMedia?.approvedForPublication,
  );
  const a = withMedia[0] ?? projects[0];
  const b = withMedia[1] ?? projects[1];
  const mobile = withMedia.flatMap((p) =>
    p.gallery
      .filter((g) => g.device === "mobile" && g.approvedForPublication)
      .map((g) => ({ media: g, project: p })),
  )[0];
  if (!a) return null;

  return (
    <div
      className="relative mx-auto w-full max-w-[560px] pb-8 pt-6 lg:max-w-none"
      aria-label="Software interfaces and authentic project screens"
      role="group"
    >
      <div
        className="enter-up drift-slow absolute -right-4 -top-2 z-0 w-[72%] opacity-90 sm:-right-8"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.8)]">
          <TopicImage
            image="analytics"
            className="aspect-[16/10] rounded-[inherit]"
            sizes="40vw"
          />
        </div>
      </div>
      <div
        className="enter-up relative z-10 mt-10 w-[82%]"
        style={{ animationDelay: "0.3s" }}
      >
        <BrowserFrame url={a.isLiveUrlPublic ? a.liveUrl : undefined}>
          <div className="relative aspect-[16/10]">
            <ProjectMediaImage
              media={a.coverMedia}
              title={a.title}
              status={a.status}
              sizes="(max-width: 1024px) 80vw, 40vw"
              priority
            />
          </div>
        </BrowserFrame>
      </div>
      {b && (
        <div
          className="enter-up absolute -bottom-2 right-0 z-20 w-[48%] sm:right-2"
          style={{ animationDelay: "0.5s" }}
        >
          <BrowserFrame url={b.isLiveUrlPublic ? b.liveUrl : undefined}>
            <div className="relative aspect-[16/10]">
              <ProjectMediaImage
                media={b.coverMedia}
                title={b.title}
                status={b.status}
                sizes="(max-width: 1024px) 40vw, 22vw"
              />
            </div>
          </BrowserFrame>
        </div>
      )}
      {mobile && (
        <div
          className="enter-up absolute -left-2 bottom-10 z-30 hidden w-[22%] xs:block sm:-left-6"
          style={{ animationDelay: "0.65s" }}
        >
          <PhoneFrame className="p-1.5">
            <div className="relative aspect-[390/760]">
              <ProjectMediaImage
                media={mobile.media}
                title={mobile.project.title}
                status={mobile.project.status}
                sizes="160px"
              />
            </div>
          </PhoneFrame>
        </div>
      )}
      <p className="sr-only">
        Screenshots of {a.title}
        {b ? ` and ${b.title}` : ""} alongside a photograph of an analytics
        dashboard.
      </p>
    </div>
  );
}
