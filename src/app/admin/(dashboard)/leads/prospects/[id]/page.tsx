import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, userCan } from "@/server/auth/session";
import { getProspect, sendLinks, FOLLOW_UP_GAP_DAYS } from "@/server/research/service";
import { summaryIsStale } from "@/server/research/ai-research";
import { countryIso } from "@/server/research/normalise";
import { SIGNALS, SIGNAL_LABEL } from "@/server/research/score";
import { getResearchSettings } from "@/server/ai/settings";
import { AI_PROVIDERS, ASSISTANT_PRESETS, DRAFT_KINDS, DRAFT_KIND_LABEL, REGISTRATION_LABEL, SOURCE_LABEL, VERIFICATION_LABEL } from "@/types/research";
import type { OutreachDraftDoc } from "@/server/db/models/research";
import type { SiteCheck } from "@/server/research/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Notice, KeyValue, FieldLabel, FormRow, inputClass, selectClass, btnSecondary } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ActionButton, ActionForm, Submit } from "@/components/admin/action-form";
import { AddToLeadsButton } from "@/components/admin/research/add-to-leads";
import { CopyButton } from "@/components/admin/research/copy-button";
import { FoundBy, ResearchStateChip, ScoreChip, SourceBadge, VerificationChip, WebsiteStatusChip } from "@/components/admin/research/labels";
import { ResearchNav } from "@/components/admin/research/research-nav";
import { ResearchPoller } from "@/components/admin/research/research-poller";
import {
  assistantAction,
  draftCreateAction,
  draftEditAction,
  draftSentAction,
  optOutAction,
  prospectDeleteAction,
  prospectDismissAction,
  prospectResearchAction,
  registrationCheckAction,
  sequenceAction,
} from "../../research-actions";

export const maxDuration = 300;

const STEP_LABEL = ["First message", "Follow up 1", "Follow up 2"];

function List({ items, empty = "None found" }: { items?: string[]; empty?: string }) {
  if (!items?.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
      {items.map((i) => (
        <li key={i} className="break-words">
          {i}
        </li>
      ))}
    </ul>
  );
}

const SourceLink = ({ url }: { url?: string }) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" className="break-all text-accent-deep hover:underline">
      {url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
    </a>
  ) : (
    <span className="text-slate-400">Not recorded</span>
  );

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("leads:read");
  const { id } = await params;
  const data = await getProspect(id);
  if (!data) notFound();
  const { prospect: p, drafts, lead, openTasks } = data;
  const settings = await getResearchSettings();
  const canWrite = userCan(user, "leads:write");
  const canRun = userCan(user, "prospecting:run");
  const stale = summaryIsStale(p);
  const audit = (p.website.audit ?? {}) as Partial<Pick<SiteCheck, "https" | "hasViewport" | "copyrightYear" | "pageBytes" | "technology" | "legacyTechnology" | "brokenLinks" | "finalUrl" | "redirects" | "speed" | "basics">>;
  const iso = countryIso(p.location?.country);
  const checkedBy = p.registration?.checkedBy as unknown as { name?: string } | undefined;

  // Drafts grouped by sequence, first message first.
  const sequences = new Map<string, OutreachDraftDoc[]>();
  for (const d of drafts) {
    const key = d.sequenceId ?? d._id.toString();
    sequences.set(key, [...(sequences.get(key) ?? []), d].sort((a, b) => a.step - b.step));
  }

  return (
    <>
      <PageHeader
        eyebrow="Research profile"
        title={p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <FoundBy sources={[...new Set(p.foundBy.map((f) => f.provider))]} />
            <VerificationChip level={p.verification} />
            <WebsiteStatusChip status={p.website.status} />
            {p.score && <ScoreChip value={p.score.value} band={p.score.band} />}
            <ResearchStateChip state={p.research?.state ?? "IDLE"} step={p.research?.step} />
            {p.optedOutAt && <StatusBadge status="Opted out" />}
          </span>
        }
        actions={
          <>
            {canWrite && !p.optedOutAt && <AddToLeadsButton prospectId={id} leadId={lead?._id.toString()} />}
            {canRun && !p.optedOutAt && (
              <>
                <ActionButton action={prospectResearchAction} fields={{ "ids[]": id, op: "research" }}>
                  Research website
                </ActionButton>
                <ActionButton action={prospectResearchAction} fields={{ "ids[]": id, op: "analyse" }} variant="accent">
                  {p.summary ? "Refresh AI summary" : "Write AI summary"}
                </ActionButton>
              </>
            )}
          </>
        }
      />
      <ResearchNav current="/admin/leads/prospects" showSettings={userCan(user, "settings:write")} />

      <div className="mb-4 flex flex-col gap-2">
        <ResearchPoller active={openTasks.length > 0} prospectId={id} />
        {p.research?.state === "FAILED" && <Notice tone="danger">The last research step failed. {p.research.error ?? ""}</Notice>}
        {p.optedOutAt && <Notice tone="warning">This business asked not to be contacted on {formatDate(p.optedOutAt)}. Its contact details were removed and it will not be researched again.</Notice>}
        {lead && (
          <Notice tone="info">
            In Leads as{" "}
            <Link href={`/admin/leads/${lead._id.toString()}`} className="font-medium underline">
              {lead.title}
            </Link>{" "}
            ({lead.status.toLowerCase().replace(/_/g, " ")}).
          </Notice>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Overview">
          <KeyValue
            items={[
              ["Industry", p.industry],
              ["Location", [p.location?.city, p.location?.region, p.location?.country].filter(Boolean).join(", ")],
              ["Address", p.address],
              ["Website", p.website.url ? <SourceLink key="w" url={p.website.url} /> : "None known"],
              ["Describes itself as", p.description],
              ["Size", p.sizeHint],
              ["First found", formatDateTime(p.createdAt)],
              ["Last researched", p.lastResearchedAt ? formatDateTime(p.lastResearchedAt) : "Not yet"],
              ["Research step", p.research?.step],
            ]}
          />
        </Card>

        <Card title="Lead score" description="Plain rules from stored evidence, plus at most 10 points either way from AI, and only for reasons that cite evidence.">
          {p.score ? (
            <>
              <div className="mb-3 flex items-center gap-3">
                <ScoreChip value={p.score.value} band={p.score.band} />
                <span className="text-xs text-slate-500">
                  Base {p.score.base ?? p.score.value - p.score.aiAdjustment}, AI adjustment {p.score.aiAdjustment > 0 ? `+${p.score.aiAdjustment}` : p.score.aiAdjustment}
                </span>
              </div>
              <Table head={["Signal", "Points", "Why"]} caption="Score breakdown" className="text-xs">
                {SIGNALS.map((s) => (
                  <tr key={s}>
                    <Td>{SIGNAL_LABEL[s]}</Td>
                    <Td muted>
                      {p.score?.breakdown?.[s] ?? 0} of {settings.scoring[s]}
                    </Td>
                    <Td muted>{p.score?.explanations?.[s] ?? ""}</Td>
                  </tr>
                ))}
              </Table>
              {p.score.reasons.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-slate-700">AI reasons (evidence ids refer to the research below)</p>
                  <List items={p.score.reasons} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">Not scored yet. Scores appear once research runs.</p>
          )}
        </Card>

        <Card title="AI research summary" description={p.summary ? `Written by ${p.summary.model ?? "AI"} on ${formatDateTime(p.summary.generatedAt)}. Facts cite evidence, observations and assumptions are labelled.` : "Written by AI from the stored research only, when you ask for it."} className="xl:col-span-2">
          {p.summary ? (
            <div className="grid gap-4 md:grid-cols-2">
              {stale && (
                <div className="md:col-span-2">
                  <Notice tone="warning">The research changed after this summary was written. Refresh the AI summary to bring it up to date.</Notice>
                </div>
              )}
              <div className="space-y-3">
                <KeyValue className="sm:grid-cols-1" items={[["What it does", p.summary.whatTheyDo], ["Digital presence", p.summary.digitalPresence], ["Why approach", p.summary.whyApproach], ["Suggested approach", p.summary.outreachStrategy], ["areniX services that fit", p.summary.services.join(", ") || "None chosen"]]} />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">Verified facts</p>
                  <List items={p.summary.facts} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-sky-700">AI observations</p>
                  <List items={p.summary.observations} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">Assumptions</p>
                  <List items={p.summary.assumptions} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">Likely challenges</p>
                  <List items={p.summary.challenges} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">Opportunities</p>
                  <List items={p.summary.opportunities} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No AI summary yet.</p>
          )}
        </Card>

        <Card title="Website analysis">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <WebsiteStatusChip status={p.website.status} />
            {p.website.checkedAt && <span className="text-xs text-slate-500">Checked {formatDateTime(p.website.checkedAt)}</span>}
          </div>
          <p className="mb-1 text-xs font-medium text-slate-700">Evidence</p>
          <List items={p.website.evidence} empty="No evidence yet" />
          <KeyValue
            className="mt-3"
            items={[
              ["Final address", audit.finalUrl ? <SourceLink key="f" url={audit.finalUrl} /> : undefined],
              ["HTTPS", audit.https === undefined ? undefined : audit.https ? "Yes" : "No"],
              ["Mobile viewport", audit.hasViewport === undefined ? undefined : audit.hasViewport ? "Yes" : "No"],
              ["Copyright year", audit.copyrightYear],
              ["Home page size", audit.pageBytes ? `${Math.round(audit.pageBytes / 1024)} KB` : undefined],
              ["Technology", audit.technology?.join(", ")],
              ["Legacy technology", audit.legacyTechnology?.length ? audit.legacyTechnology.join(", ") : undefined],
              ["Broken links", audit.brokenLinks ? `${audit.brokenLinks.broken.length} of ${audit.brokenLinks.checked} sampled` : undefined],
              ["Pages read", p.website.pagesCrawled],
              ["Speed (our own check)", audit.speed ? `Arrived in ${(audit.speed.responseMs / 1000).toFixed(1)} seconds. HTML ${audit.speed.htmlKb} KB${audit.speed.compressed ? ", compressed" : ", not compressed"}. ${audit.speed.scripts} scripts, ${audit.speed.styles} stylesheets, ${audit.speed.images} images${audit.speed.sampled ? `, about ${(audit.speed.estimatedPageKb / 1024).toFixed(1)} MB in total` : ""}.` : undefined],
              ["Basics", audit.basics ? `Title ${audit.basics.title ? "yes" : "missing"}. Search description ${audit.basics.metaDescription ? "yes" : "missing"}. ${audit.basics.h1Count} main heading${audit.basics.h1Count === 1 ? "" : "s"}. Language ${audit.basics.lang ? "set" : "not set"}. ${audit.basics.imagesWithoutAlt} of ${audit.basics.images} images without alt text.` : undefined],
              ["PageSpeed (mobile)", p.website.pagespeed ? `Performance ${p.website.pagespeed.performance ?? "?"}, accessibility ${p.website.pagespeed.accessibility ?? "?"}, best practices ${p.website.pagespeed.bestPractices ?? "?"}, SEO ${p.website.pagespeed.seo ?? "?"}` : undefined],
              ["Sources listing no website", p.website.noWebsiteSources?.join(", ")],
            ]}
          />
        </Card>

        <Card title="Registration">
          <KeyValue
            items={[
              ["Status", REGISTRATION_LABEL[p.registration?.status ?? "NOT_CHECKED"]],
              ["Registry", p.registration?.registry],
              ["Number", p.registration?.number],
              ["Company status", p.registration?.companyStatus],
              ["Record", p.registration?.sourceUrl ? <SourceLink key="r" url={p.registration.sourceUrl} /> : undefined],
              ["Note", p.registration?.note],
              ["Checked", p.registration?.checkedAt ? `${formatDateTime(p.registration.checkedAt)}${checkedBy?.name ? ` by ${checkedBy.name}` : ""}` : undefined],
            ]}
          />
          {iso === "NG" && (
            <p className="mt-3 text-xs text-slate-600">
              The Corporate Affairs Commission has no public API, so Nigerian registration is checked by hand on the{" "}
              <a href="https://search.cac.gov.ng/" target="_blank" rel="noreferrer" className="text-accent-deep underline">
                CAC public search
              </a>
              . Record what you find below.
            </p>
          )}
          {iso === "GB" && (
            <p className="mt-3 text-xs text-slate-600">
              UK companies are matched on Companies House automatically when its key is configured. You can also{" "}
              <a href={`https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(p.name)}`} target="_blank" rel="noreferrer" className="text-accent-deep underline">
                search Companies House
              </a>
              .
            </p>
          )}
          {canWrite && (
            <ActionForm action={registrationCheckAction} className="mt-3 border-t border-slate-200 pt-3">
              <input type="hidden" name="id" value={id} />
              <div className="grid gap-2 sm:grid-cols-3">
                <FormRow>
                  <FieldLabel htmlFor="rg-status">Result</FieldLabel>
                  <select id="rg-status" name="status" defaultValue="VERIFIED" className={selectClass}>
                    <option value="VERIFIED">Registered</option>
                    <option value="NOT_FOUND">Not found</option>
                    <option value="NOT_CHECKED">Not checked</option>
                  </select>
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="rg-registry">Registry</FieldLabel>
                  <input id="rg-registry" name="registry" defaultValue={iso === "GB" ? "Companies House" : "CAC"} className={inputClass} />
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="rg-number">Number</FieldLabel>
                  <input id="rg-number" name="number" placeholder="RC 1234567" className={inputClass} />
                </FormRow>
              </div>
              <FormRow>
                <FieldLabel htmlFor="rg-note">Note</FieldLabel>
                <input id="rg-note" name="note" maxLength={300} className={inputClass} />
              </FormRow>
              <div>
                <Submit variant="secondary">Record check</Submit>
              </div>
            </ActionForm>
          )}
        </Card>

        <Card title="Public contacts" description="Business contact details from public pages, with where each came from.">
          {p.contacts.length ? (
            <Table head={["Kind", "Value", "Verification", "Source", "Seen"]} caption="Public contacts" className="text-xs">
              {p.contacts.map((c) => (
                <tr key={`${c.kind}${c.value}`}>
                  <Td>{c.kind === "WHATSAPP" ? "WhatsApp" : c.kind === "EMAIL" ? "Email" : "Phone"}</Td>
                  <Td className="break-all font-mono">{c.value}</Td>
                  <Td muted>{VERIFICATION_LABEL[c.verification]}</Td>
                  <Td muted>
                    <SourceLink url={c.sourceUrl} />
                  </Td>
                  <Td muted>{formatDate(c.seenAt)}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-sm text-slate-400">No public contact details found yet.</p>
          )}
        </Card>

        <Card title="Decision makers" description="Named only when a public page shows them. LinkedIn links come only from the business's own site or cited pages.">
          {p.people.length ? (
            <Table head={["Name", "Title", "LinkedIn", "Verification", "Source"]} caption="Decision makers" className="text-xs">
              {p.people.map((x) => (
                <tr key={x.name}>
                  <Td>{x.name}</Td>
                  <Td muted>{x.title ?? "Not stated"}</Td>
                  <Td muted>{x.linkedinUrl ? <SourceLink url={x.linkedinUrl} /> : "None"}</Td>
                  <Td muted>{VERIFICATION_LABEL[x.verification]}</Td>
                  <Td muted>
                    <SourceLink url={x.sourceUrl} />
                  </Td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-sm text-slate-400">No decision makers found.</p>
          )}
        </Card>

        <Card title="Products, services and signals">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-700">Products and services</p>
              <List items={p.offerings.slice(0, 15)} />
            </div>
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-700">Hiring</p>
                <List items={p.hiringSignals} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-700">Technology</p>
                <List items={p.technologyHints} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-700">Social profiles</p>
                {p.socials.length ? (
                  <ul className="space-y-1 text-sm">
                    {p.socials.map((s) => (
                      <li key={s.url}>
                        <span className="mr-1 text-xs text-slate-500">{s.platform}</span>
                        <SourceLink url={s.url} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">None found</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Sources and verification" description="Who found the business, the pages they cited, and which pages were fetched and really mention it.">
          <ul className="space-y-3">
            {p.foundBy.map((f, i) => (
              <li key={`${f.provider}${i}`} className="rounded-lg border border-slate-200 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge source={f.provider} />
                  <span className="text-slate-500">{formatDateTime(f.at)}</span>
                  {f.searchId && (
                    <Link href={`/admin/leads/discover/${f.searchId.toString()}`} className="text-accent-deep hover:underline">
                      Open search
                    </Link>
                  )}
                </div>
                {f.evidence && <p className="mt-1 text-slate-700">{f.evidence}</p>}
                <ul className="mt-1 space-y-0.5">
                  {f.sourceUrls.map((u) => (
                    <li key={u} className="flex items-start gap-1">
                      <span aria-hidden="true" className={f.confirmedUrls?.includes(u) ? "text-emerald-600" : "text-slate-400"}>
                        {f.confirmedUrls?.includes(u) ? "✓" : "•"}
                      </span>
                      <SourceLink url={u} />
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-slate-500">{f.checkedAt ? `Source pages checked ${formatDateTime(f.checkedAt)}. ${f.confirmedUrls?.length ?? 0} confirmed.` : (AI_PROVIDERS as readonly string[]).includes(f.provider) ? "Source pages not checked yet." : `Listed by ${SOURCE_LABEL[f.provider] ?? f.provider}.`}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Research assistant" description="Answers only from the stored research above. When something is not there it says so." className="xl:col-span-2">
          {canRun ? (
            <ActionForm action={assistantAction} refresh>
              <input type="hidden" name="id" value={id} />
              <div className="flex flex-wrap gap-2">
                {ASSISTANT_PRESETS.map((q) => (
                  <button key={q.id} type="submit" name="preset" value={q.id} className={`${btnSecondary} min-h-8 px-2.5 text-xs`}>
                    {q.label}
                  </button>
                ))}
              </div>
              <FormRow>
                <FieldLabel htmlFor="as-q">Or ask your own question</FieldLabel>
                <textarea id="as-q" name="question" rows={2} maxLength={500} className={inputClass} />
              </FormRow>
              <div>
                <Submit variant="secondary" pendingLabel="Thinking">
                  Ask
                </Submit>
              </div>
            </ActionForm>
          ) : (
            <p className="text-sm text-slate-400">Asking the assistant needs the prospecting permission.</p>
          )}
          {p.assistantLog?.length > 0 && (
            <ul className="mt-4 space-y-3">
              {[...p.assistantLog].reverse().slice(0, 8).map((a, i) => (
                <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-900">{a.question}</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{a.answer}</p>
                  <p className="mt-1 text-[0.7rem] text-slate-400">
                    {formatDateTime(a.at)} {a.model ? `with ${a.model}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Outreach drafts" description={`Drafts only. Nothing is sent by the system. Scheduled follow ups appear under Follow ups on their date, ${FOLLOW_UP_GAP_DAYS[0]} and then ${FOLLOW_UP_GAP_DAYS[1]} days after the message before is sent, and stop when a reply comes in, the lead moves on or the business opts out.`} className="xl:col-span-2">
          {canRun && !p.optedOutAt && (
            <div className="mb-4 flex flex-wrap gap-2">
              {DRAFT_KINDS.map((k) => (
                <ActionButton key={k} action={draftCreateAction} fields={{ id, kind: k }}>
                  {DRAFT_KIND_LABEL[k]}
                </ActionButton>
              ))}
            </div>
          )}
          {sequences.size === 0 ? (
            <EmptyState title="No drafts yet" body="Ask for a draft above. Each one uses only the research on this page." />
          ) : (
            <div className="space-y-4">
              {[...sequences.entries()].map(([seq, items]) => {
                const first = items[0] as OutreachDraftDoc;
                const isSeq = items.length > 1 || first.step > 0;
                const pending = items.some((d) => d.status === "DRAFT" || d.status === "APPROVED");
                return (
                  <section key={seq} className="rounded-xl border border-slate-200 p-3">
                    <header className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{first.channel === "EMAIL" ? "Email" : first.channel === "WHATSAPP" ? "WhatsApp" : "LinkedIn"}</span>
                      <span className="text-slate-500">{formatDateTime(first.createdAt)}</span>
                      {canWrite && pending && first.sequenceId && (
                        <span className="ml-auto flex flex-wrap gap-2">
                          {first.status === "DRAFT" && (
                            <ActionButton action={sequenceAction} fields={{ sequenceId: first.sequenceId, op: "schedule" }} variant="accent">
                              {isSeq ? "Schedule sequence" : "Schedule"}
                            </ActionButton>
                          )}
                          <ActionButton action={sequenceAction} fields={{ sequenceId: first.sequenceId, op: "reply" }}>
                            Reply received
                          </ActionButton>
                          <ActionButton action={sequenceAction} fields={{ sequenceId: first.sequenceId, op: "stop" }} variant="danger">
                            Stop
                          </ActionButton>
                        </span>
                      )}
                    </header>
                    <div className="grid gap-3 lg:grid-cols-3">
                      {items.map((d) => (
                        <div key={d._id.toString()} className="rounded-lg bg-slate-50 p-3">
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-medium">{STEP_LABEL[d.step] ?? `Step ${d.step}`}</span>
                            <StatusBadge status={d.status} />
                            {d.dueAt && d.status === "APPROVED" && <span className="text-slate-500">Due {formatDate(d.dueAt)}</span>}
                            {d.sentAt && <span className="text-slate-500">Sent {formatDate(d.sentAt)}</span>}
                          </div>
                          {d.stoppedReason && <p className="mb-2 text-xs text-slate-500">Stopped. {d.stoppedReason}.</p>}
                          {canWrite && (d.status === "DRAFT" || d.status === "APPROVED") ? (
                            <ActionForm action={draftEditAction}>
                              <input type="hidden" name="id" value={d._id.toString()} />
                              <input name="to" defaultValue={d.to ?? ""} placeholder={d.channel === "EMAIL" ? "Email address" : d.channel === "WHATSAPP" ? "WhatsApp number" : "LinkedIn profile link"} aria-label="Send to" className={inputClass} />
                              {d.channel === "EMAIL" && <input name="subject" defaultValue={d.subject ?? ""} placeholder="Subject" aria-label="Subject" className={inputClass} />}
                              <textarea name="body" defaultValue={d.body} rows={8} aria-label="Message" className={inputClass} />
                              <div className="flex flex-wrap gap-2">
                                <Submit variant="secondary">Save</Submit>
                              </div>
                            </ActionForm>
                          ) : (
                            <>
                              {d.subject && <p className="text-xs font-medium">{d.subject}</p>}
                              <p className="whitespace-pre-wrap text-sm text-slate-700">{d.body}</p>
                            </>
                          )}
                          {(d.status === "DRAFT" || d.status === "APPROVED") && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {sendLinks(d).map((l) => (
                                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={`${btnSecondary} min-h-8 px-2.5 text-xs`}>
                                  {l.label}
                                </a>
                              ))}
                              <CopyButton text={d.subject ? `${d.subject}\n\n${d.body}` : d.body} />
                              {canWrite && (
                                <ActionButton action={draftSentAction} fields={{ id: d._id.toString() }}>
                                  I sent it
                                </ActionButton>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </Card>

        {canWrite && (
          <Card title="Manage" className="xl:col-span-2">
            <div className="flex flex-wrap items-start gap-4">
              <ActionButton action={prospectDismissAction} fields={{ "ids[]": id, op: p.dismissedAt ? "restore" : "dismiss" }}>
                {p.dismissedAt ? "Restore" : "Dismiss"}
              </ActionButton>
              {!p.optedOutAt && (
                <ActionForm action={optOutAction} className="max-w-sm">
                  <input type="hidden" name="id" value={id} />
                  <FormRow>
                    <FieldLabel htmlFor="oo-reason" hint="(when the business asks not to be contacted)">
                      Opt out
                    </FieldLabel>
                    <input id="oo-reason" name="reason" maxLength={200} placeholder="How they asked, for example by email" className={inputClass} />
                  </FormRow>
                  <div>
                    <Submit variant="danger" pendingLabel="Recording">
                      Record opt out
                    </Submit>
                  </div>
                </ActionForm>
              )}
              <ActionButton action={prospectDeleteAction} fields={{ id }} confirm="Delete this business and its drafts? This cannot be undone." variant="danger">
                Delete
              </ActionButton>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
