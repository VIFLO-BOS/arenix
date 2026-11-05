import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { WhatsAppSticky } from "@/components/layout/whatsapp-button";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { RouteCurtain } from "@/components/motion/route-curtain";
import { Spotlight } from "@/components/motion/spotlight";
import { Cursor } from "@/components/motion/cursor";
import { getPublicSettings } from "@/server/repositories/content";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  return (
    <>
      <SmoothScroll />
      <RouteCurtain />
      <Spotlight />
      <Cursor />
      <SiteHeader whatsappDigits={settings.contact.whatsappDigits} />
      {/* mobile-center (globals.css) centres content on phones. Desktop layout is unchanged. */}
      <main id="main" className="mobile-center min-h-dvh">
        {children}
      </main>
      <SiteFooter settings={settings} />
      <WhatsAppSticky digits={settings.contact.whatsappDigits} />
    </>
  );
}
