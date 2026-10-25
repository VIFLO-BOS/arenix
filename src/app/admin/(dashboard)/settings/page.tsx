import { requirePermission } from "@/server/auth/session";
import { getSettingsDoc } from "@/server/services/cms";
import { listPortfolioSlugs } from "@/server/services/pickers";
import { integrations } from "@/lib/env";
import { toPlain } from "@/lib/utils";
import { PageHeader, Card, FieldLabel, FormRow, inputClass, selectClass, Notice } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/action-form";
import { settingsAction } from "../actions";

type Settings = {
  brand: Record<string, string>;
  contact: Record<string, string | boolean>;
  socials: Record<string, string>;
  booking: Record<string, string>;
  notifications: { inquiryEmails: string[]; bookingEmails: string[] };
  seo: Record<string, string | boolean>;
  home: Record<string, string | string[]>;
  legal: Record<string, string | boolean>;
};

export default async function SettingsPage() {
  await requirePermission("settings:write");
  const [doc, slugs] = await Promise.all([getSettingsDoc(), listPortfolioSlugs()]);
  const s = toPlain(doc) as unknown as Settings;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const bool = (v: unknown) => v === true;
  const lines = (v: unknown) => (Array.isArray(v) ? v.join("\n") : "");
  return (
    <>
      <PageHeader title="Settings" description="Brand, contact channels, WhatsApp, booking provider, notification recipients, SEO, homepage and legal text. Values are published only when filled." />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Notice tone={integrations.email.configured ? "success" : "warning"}>Email {integrations.email.configured ? "Resend configured" : "demo log mode"}</Notice>
        <Notice tone={integrations.scheduler.configured ? "success" : "info"}>Scheduler {integrations.scheduler.configured ? "Cal.com configured" : "request-only"}</Notice>
        <Notice tone="info">Media storage {integrations.media.driver}</Notice>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Brand">
          <ActionForm action={settingsAction}>
            <input type="hidden" name="section" value="brand" />
            <FormRow>
              <FieldLabel htmlFor="b-legal">Legal name</FieldLabel>
              <input id="b-legal" name="legalName" defaultValue={str(s.brand?.legalName)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="b-short">Short brand</FieldLabel>
              <input id="b-short" name="shortName" defaultValue={str(s.brand?.shortName)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="b-tag">Tagline</FieldLabel>
              <input id="b-tag" name="tagline" defaultValue={str(s.brand?.tagline)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="b-desc">Description</FieldLabel>
              <textarea id="b-desc" name="description" rows={2} defaultValue={str(s.brand?.description)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="b-logo" hint="(path or https URL to official SVG/PNG)">
                Logo
              </FieldLabel>
              <input id="b-logo" name="logoUrl" defaultValue={str(s.brand?.logoUrl)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="b-accent" hint="(hex, from official palette)">
                Accent colour
              </FieldLabel>
              <input id="b-accent" name="accentColor" defaultValue={str(s.brand?.accentColor)} className={inputClass} placeholder="#FC8F2D" />
            </FormRow>
            <div>
              <Submit>Save brand</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Contact and WhatsApp" description="Leave a field empty to hide that channel on the site.">
          <ActionForm action={settingsAction}>
            <input type="hidden" name="section" value="contact" />
            <FormRow>
              <FieldLabel htmlFor="c-email">Business email</FieldLabel>
              <input id="c-email" name="email" type="email" defaultValue={str(s.contact?.email)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="c-phone">Phone</FieldLabel>
              <input id="c-phone" name="phone" defaultValue={str(s.contact?.phone)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="c-wa" hint="(E.164 digits only, e.g. 2348012345678, the official areniX number)">
                WhatsApp
              </FieldLabel>
              <input id="c-wa" name="whatsappDigits" inputMode="numeric" defaultValue={str(s.contact?.whatsappDigits)} className={`${inputClass} font-mono`} />
            </FormRow>
            <div className="grid gap-2 sm:grid-cols-3">
              <FormRow>
                <FieldLabel htmlFor="c-addr">Address line</FieldLabel>
                <input id="c-addr" name="addressLine" defaultValue={str(s.contact?.addressLine)} className={inputClass} />
              </FormRow>
              <FormRow>
                <FieldLabel htmlFor="c-city">City</FieldLabel>
                <input id="c-city" name="city" defaultValue={str(s.contact?.city)} className={inputClass} />
              </FormRow>
              <FormRow>
                <FieldLabel htmlFor="c-country">Country</FieldLabel>
                <input id="c-country" name="country" defaultValue={str(s.contact?.country)} className={inputClass} />
              </FormRow>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="showLocation" defaultChecked={bool(s.contact?.showLocation)} className="accent-[var(--color-accent)]" /> Show location publicly
            </label>
            <div>
              <Submit>Save contact</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Social links" description="https URLs only. Rendered only when valid.">
          <ActionForm action={settingsAction}>
            <input type="hidden" name="section" value="socials" />
            {(["linkedin", "github", "x", "instagram", "youtube"] as const).map((k) => (
              <FormRow key={k}>
                <FieldLabel htmlFor={`soc-${k}`}>{k}</FieldLabel>
                <input id={`soc-${k}`} name={k} type="url" defaultValue={str(s.socials?.[k])} className={inputClass} placeholder="https://" />
              </FormRow>
            ))}
            <div>
              <Submit>Save socials</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Booking provider" description="Request only mode never shows fake availability. Live mode embeds a Cal.com event link and needs SCHEDULER_WEBHOOK_SECRET.">
          <ActionForm action={settingsAction}>
            <input type="hidden" name="section" value="booking" />
            <FormRow>
              <FieldLabel htmlFor="bk-mode">Mode</FieldLabel>
              <select id="bk-mode" name="mode" defaultValue={str(s.booking?.mode) || "request"} className={selectClass}>
                <option value="request">Request a consultation (no live calendar)</option>
                <option value="calcom">Cal.com live availability</option>
              </select>
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="bk-link">Public Cal.com event link</FieldLabel>
              <input id="bk-link" name="publicEventLink" type="url" defaultValue={str(s.booking?.publicEventLink)} className={inputClass} placeholder="https://cal.com/…" />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="bk-hours">Operating hours note</FieldLabel>
              <input id="bk-hours" name="operatingHoursNote" defaultValue={str(s.booking?.operatingHoursNote)} className={inputClass} />
            </FormRow>
            <div>
              <Submit>Save booking</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Notification recipients" description="Staff emails that receive new inquiry / booking alerts (plus ADMIN_NOTIFICATION_EMAIL from the environment).">
          <ActionForm action={settingsAction}>
            <input type="hidden" name="section" value="notifications" />
            <FormRow>
              <FieldLabel htmlFor="n-inq" hint="(one per line)">
                Inquiry alerts
              </FieldLabel>
              <textarea id="n-inq" name="inquiryEmails" rows={3} defaultValue={lines(s.notifications?.inquiryEmails)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="n-bk" hint="(one per line)">
                Booking alerts
              </FieldLabel>
              <textarea id="n-bk" name="bookingEmails" rows={3} defaultValue={lines(s.notifications?.bookingEmails)} className={inputClass} />
            </FormRow>
            <div>
              <Submit>Save recipients</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="SEO">
          <ActionForm action={settingsAction}>
            <input type="hidden" name="section" value="seo" />
            <FormRow>
              <FieldLabel htmlFor="seo-title">Default title</FieldLabel>
              <input id="seo-title" name="defaultTitle" defaultValue={str(s.seo?.defaultTitle)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="seo-tpl">Title template</FieldLabel>
              <input id="seo-tpl" name="titleTemplate" defaultValue={str(s.seo?.titleTemplate)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="seo-desc">Default description</FieldLabel>
              <textarea id="seo-desc" name="defaultDescription" rows={2} defaultValue={str(s.seo?.defaultDescription)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="seo-og">Open Graph image</FieldLabel>
              <input id="seo-og" name="ogImageUrl" defaultValue={str(s.seo?.ogImageUrl)} className={inputClass} />
            </FormRow>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="indexable" defaultChecked={s.seo?.indexable !== false} className="accent-[var(--color-accent)]" /> Allow search engines to index the public site
            </label>
            <div>
              <Submit>Save SEO</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Homepage">
          <ActionForm action={settingsAction}>
            <input type="hidden" name="section" value="home" />
            <FormRow>
              <FieldLabel htmlFor="h-head">Hero headline</FieldLabel>
              <input id="h-head" name="heroHeadline" defaultValue={str(s.home?.heroHeadline)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="h-sup">Hero supporting copy</FieldLabel>
              <textarea id="h-sup" name="heroSupport" rows={2} defaultValue={str(s.home?.heroSupport)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="h-video" hint="(real footage only. Leave empty for the screenshot showreel)">
                Showreel video URL
              </FieldLabel>
              <input id="h-video" name="showreelVideoUrl" defaultValue={str(s.home?.showreelVideoUrl)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="h-poster">Showreel poster</FieldLabel>
              <input id="h-poster" name="showreelPosterUrl" defaultValue={str(s.home?.showreelPosterUrl)} className={inputClass} />
            </FormRow>
            <FormRow>
              <FieldLabel htmlFor="h-show" hint="(slugs, one per line, for the software showcase)">
                Showcase projects
              </FieldLabel>
              <textarea id="h-show" name="showcaseProjectSlugs" rows={3} defaultValue={lines(s.home?.showcaseProjectSlugs)} className={`${inputClass} font-mono text-xs`} />
              <p className="text-xs text-slate-500">Available: {slugs.map((x) => x.slug).join(", ") || ",  (seed the database)"}</p>
            </FormRow>
            <div>
              <Submit>Save homepage</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Legal pages" description="Markdown. Keep the Draft banner until a legal professional has reviewed the text." className="lg:col-span-2">
          <ActionForm action={settingsAction}>
            <input type="hidden" name="section" value="legal" />
            <div className="grid gap-3 lg:grid-cols-2">
              <FormRow>
                <FieldLabel htmlFor="l-priv">Privacy policy</FieldLabel>
                <textarea id="l-priv" name="privacyMarkdown" rows={14} defaultValue={str(s.legal?.privacyMarkdown)} className={`${inputClass} font-mono text-xs`} />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="privacyReviewed" defaultChecked={bool(s.legal?.privacyReviewed)} className="accent-[var(--color-accent)]" /> Reviewed by owner / legal (removes Draft banner)
                </label>
              </FormRow>
              <FormRow>
                <FieldLabel htmlFor="l-terms">Terms of use</FieldLabel>
                <textarea id="l-terms" name="termsMarkdown" rows={14} defaultValue={str(s.legal?.termsMarkdown)} className={`${inputClass} font-mono text-xs`} />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="termsReviewed" defaultChecked={bool(s.legal?.termsReviewed)} className="accent-[var(--color-accent)]" /> Reviewed by owner / legal (removes Draft banner)
                </label>
              </FormRow>
            </div>
            <div>
              <Submit>Save legal text</Submit>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
