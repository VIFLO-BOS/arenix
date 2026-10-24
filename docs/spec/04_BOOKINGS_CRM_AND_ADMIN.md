# Booking, WhatsApp, Client CRM, Admin Dashboard & Client Journey

## Core system idea

Visitors discover services and portfolio projects on the cinematic marketing site; they contact areniX by official WhatsApp, book real consultation slots, or submit service requirements. Every **site-submitted** lead is saved in the protected business workspace, where staff can qualify, follow up, quote, and manage delivery. Ordinary WhatsApp click-to-chat opens WhatsApp and **does not automatically ingest the chat**.

## Visitor journey (public)

### A. Chat on WhatsApp

- Official business WhatsApp number is configurable in settings/env; do not borrow any CleNest number.
- Buttons on header/footer/contact, relevant services and project inquiry success screen.
- Use URL format `https://wa.me/<E164_DIGITS>?text=<URL_ENCODED_MESSAGE>` (digits only, no `+`), with copy such as “Hello areniX, I’d like to discuss [service]…”; encode safely.
- Track only privacy-appropriate click events and optional lead-source parameters; never imply message was delivered or received.
- Phase-two official WhatsApp Business Platform two-way integration only after approved Meta configuration, permissions, webhook verification and privacy review.

### B. Book consultation — `/book-consultation`

Bookable meeting types: discovery, website development, custom software, enterprise/business systems, mobile app, technical consulting. Configure descriptions, durations and operating hours through approved scheduling service or admin controls.

Actual workflow:
1. Choose meeting type, optional related service/project.
2. Read what to expect, meeting duration, whether call is free/paid **only if verified**.
3. See **real current** availability from chosen scheduling source; display user timezone and Africa/Lagos team timezone appropriately.
4. Select and reserve slot via provider, including buffers and conflicts.
5. Supply identity, valid email, summary, consent; optional phone/WhatsApp.
6. Receive **provider-confirmed** booking and reference; send approved transactional email.
7. Reschedule/cancel via secure provider or signed user-specific link.
8. Sync webhook to internal Booking record, handling at least created/rescheduled/cancelled; verify signing, idempotency and raw request handling as required by provider.

Preferred v1 implementation: embed or integrate Cal.com when the owner configures it; choose integration depth based on available access/API/webhooks. If not configured, provide an honest `Request a Consultation` form in a distinct **REQUESTED** status. Do **not** show imaginary slots or “Booking Confirmed” for unconfirmed requests.

### C. Request a service / project quote — `/start-project`

Fields:
- Name, verified format email
- Company optional
- Phone/WhatsApp optional
- Service category (context-prefilled from clicked page)
- Business goal and project description
- Features/deliverables optional
- Budget range optional (configurable, can skip)
- Desired timeline optional
- Supporting documents optional, allowed MIME/size limits
- Preferred reply method
- Privacy/contact consent

Server Zod validation; spam-rate protection, safe file upload, storage record, timestamp and unique reference ID. Show success only after authoritative DB persistence; send internal notification/autoack via reliable email provider with retries. Use queue/outbox if needed so an email outage does not falsely mark the inquiry lost.

### D. General contact — `/contact`

Simple form: name/email/subject/message/consent; persistent inquiry and confirmation. Email/web social channels must be verified. Add FAQ and click-to-chat/booking buttons.

## CRM domain workflow

Suggested pipeline:

`NEW -> CONTACTED -> QUALIFIED -> PROPOSAL_SENT -> WON`

Additional outcomes `LOST`, `ARCHIVED`; `ON_HOLD` optional. Keep status history and actor. Support manual reassignment, priorities, due follow-ups, notes, linked bookings and proposal drafts. Do not automatically promote an inquiry to `WON` when a client merely opens a proposal.

## Private dashboard sitemap

| Route (proposed) | Scope / operations |
|---|---|
| `/admin` | Overview KPI cards with valid time filters, overdue actions, recent activity |
| `/admin/inquiries` | New inquiries, detail panel, qualification, attachments, assignment |
| `/admin/leads` | CRM kanban + table, search, filters, stage history |
| `/admin/clients` | People and organizations, contact/activity profiles |
| `/admin/bookings` | Calendar/list, provider sync state, filters, cancel/reschedule through appropriate pathway |
| `/admin/proposals` | Drafts, versions, review/approved send, statuses, optional PDF export |
| `/admin/projects` | Internal delivery register, milestones, ownership, notes |
| `/admin/portfolio` | Public portfolio editor, screenshot gallery, publishing and project URL approvals |
| `/admin/content` | Home/Services/Solutions/Insights/FAQs/Careers/Testimonials with draft states |
| `/admin/media` | Asset library, alt text, publication rights and file deletion lifecycle |
| `/admin/notifications` | Alert center, unread and delivery status |
| `/admin/analytics` | Site and funnel analytics with actual data, conversion funnel |
| `/admin/team` | Invitations and RBAC role assignments |
| `/admin/settings` | Brand, contact info, WhatsApp, booking provider, notification addresses, SEO |
| `/admin/audit` | Security/relevant business action history, privileged only |

### Dashboard design

- Sidebar + topbar; compact, readable SaaS layout; responsive drawer on mobile.
- High contrast, human-scale type, fast tables, sorting/filtering/pagination, real empty states.
- Context actions; keyboard shortcuts only where safe; dialogs for risky changes.
- State color used meaningfully, accessible screen reader labels, clear errors.
- No giant looping showreels, full-page 3D, scroll-hijack or massive entrance sequences inside CRM.
- Shared areniX logo and accent treatment, but dashboards prioritize legibility and work.

## User accounts & permissions

- No public admin signup; accounts provisioned by an authorized administrator through secure invitations.
- Initial roles: `SUPER_ADMIN`, `ADMIN`, `BUSINESS_DEVELOPMENT`, `CONTENT_MANAGER`, `PROJECT_MANAGER`.
- Enforce object-level and route/server authorization; content editors cannot read confidential quotes by default; project managers only see records authorized for them.
- Secure login/session management, account disable, invitation expiry, password reset or approved external authentication, session invalidation and auditable role changes.
- Public visitor contact submissions are **not** admin registrations.

## Proposal and project workflow

- Inquiry -> qualified lead -> proposal draft -> review -> send -> client accept/reject recorded via secure flow -> won opportunity -> internal project.
- A draft quote can include scope, deliverables, estimates, fees/taxes as configured, proposal validity, and version number. Never invent prices or auto-send without authorized approval.
- PDF generation optional but if provided use consistent legal branding and server-rendered safe content.
- Projects include owners, milestones, status, deadline, progress notes, linked client/quote; keep separate from public portfolio records unless editor deliberately publishes a sanitized case study.

## Communications

- Resend (or configured provider) for transactional emails: inquiry acknowledgment, booking confirmation (when booking provider confirms), booking changes, admin lead assignment, due follow-ups, proposal send.
- Real sender domain must be verified before claiming emails work.
- Template system with preview mode, provider return status and safe retry handling.
- Keep unsubscribe/preferences appropriate for optional marketing messages; transactional email is distinct from marketing consent.

## Client portal — future phase

Architect role separation to permit a future `/portal` for authenticated clients to review **only their own** approved proposals, project milestones, documents, support requests and consultations. Do not launch fake client pages or allow client access to `/admin`.

## Analytics and operating metrics

Show only real counts and attributed sources: new leads, first response time if measured, qualified leads, inquiries by service, confirmed bookings, no-shows if recorded, proposals, win rates, pipeline value with proper currency, overdue followups. Use date filters that match the actual server timestamps/timezones. Distinguish unconfigured analytics from `0` counts.

## Failure states and edge cases

- WhatsApp not configured: don't render broken link; prompt admin.
- Scheduling provider unavailable: fail transparently, offer consultation request (not instant confirmation).
- Duplicate booking webhook: process idempotently; never double-create or double-notify.
- Email provider down: retain DB inquiry, record pending notification.
- Invalid/malicious attachment: reject server-side with explanation.
- Lost network during form submission: safe retry without duplicate create where possible.
- Unauthorized admin access: deny server-side and record relevant event.
- CMS project unpublished: remove from public query/cache, preserve admin preview.
- Private client project: no public live link, screenshots subject to explicit approval.

## Definition of functional

A feature is complete only when the real workflow succeeds end-to-end and is independently tested; a polished button or form UI alone is insufficient.
