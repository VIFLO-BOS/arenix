# Admin guide — areniX business dashboard

Sign in at `/admin/login`. Accounts are created by invitation only (Team → Invite). Your role decides which sections you see; every action is also checked on the server.

| Role | Can do |
|---|---|
| Super admin | Everything, including creating other super admins |
| Admin | Everything except granting the super-admin role |
| Business development | Inquiries, leads, clients, bookings, proposals (create/send; approval needs an admin), read projects |
| Content manager | Portfolio, content, media (no CRM, no settings) |
| Project manager | Internal projects they own or belong to, read clients/bookings/proposals |

## Daily flow

1. **Overview** — new inquiries, overdue follow-ups, upcoming consultations, email delivery health. Use the range switch (7d/30d/90d/all).
2. **Inquiries** — open a record, read the message/attachments, add internal notes, set status (`NEW → REVIEWED → QUALIFIED → CONVERTED`, or `SPAM`/`CLOSED`) and assign a teammate. Qualifying also qualifies the linked lead; marking spam archives it.
3. **Leads** — table or board view. Log calls/emails/meetings (a logged contact moves `NEW → CONTACTED` and records first-response time), set priority, value, follow-up date and owner. Use **Send due follow-up reminders** to email owners of overdue leads.
4. **Bookings** — in request-only mode a visitor's request arrives as `REQUESTED`. Open it, pick date/time, duration and meeting link, set `CONFIRMED` — the visitor receives the confirmation email. Provider-owned (Cal.com) bookings are updated by webhook; use local statuses only for `COMPLETED`/`NO_SHOW`.
5. **Proposals** — create from a lead (`/admin/proposals/new?leadId=…`). Versions are immutable: editing after approval creates `v+1` and returns to `DRAFT`. Workflow: `DRAFT → IN_REVIEW → APPROVED (admin) → SENT (emails the client) → ACCEPTED / REJECTED / EXPIRED`. Recording acceptance moves the lead to `WON`; nothing is inferred from the client merely opening an email.
6. **Projects** — internal delivery register with milestones (progress is computed from milestones), notes and owner/members. Confidential by default; never shown publicly.

## Website content

- **Portfolio** — each public project. Required for publication: content *approved* **and** *published*. `Visit Website` appears only when the live URL is https **and** "Live URL is public" is ticked. Add screenshots in the right-hand panel: choose a path from the media library (or `/screenshots/<slug>/…` from the capture script), write alt text describing the screen, tick *Authentic screenshot* and *Approved* only when the owner has approved a sanitised image, set a cover.
  - Private systems (Paylio, Branch Manager…) stay without approved media until the owner supplies sanitised captures — the public card shows a labelled placeholder, never a fake.
- **Content** — tabs for services, solutions, technologies, insights (markdown), careers, testimonials (publish only wording the person approved), FAQs. Slugs are URLs; renaming a slug changes the public URL.
- **Media** — upload PNG/JPEG/WebP/AVIF (≤10 MB). Alt text is mandatory. Approve before use. Files used by a project cannot be deleted.
- **Settings** — brand (logo path, accent colour), contact & WhatsApp (digits only), socials (https), booking mode (request vs Cal.com), notification recipients, SEO, homepage headline/showcase, legal text with "reviewed" flags (removes the Draft banner).

The badge in the top bar says whether the public site is reading **database** or **fixture** content. Run `npm run db:seed` once so the dashboard can edit what visitors see.

## Team & security

- **Team** — invite by email with a role (72-hour single-use link; in demo email mode the link is shown on screen). Change roles (signs that user out), deactivate/reactivate, revoke invitations.
- **Audit log** — who did what and when, including denied attempts (`SECURITY`). IPs are stored hashed.
- Passwords: 12+ characters with upper/lower/number; 6 failed attempts lock the account for 15 minutes; reset links expire after one hour and sign out other sessions.

## What the dashboard does *not* do (by design)

- It does not read WhatsApp chats. Click-to-chat only opens WhatsApp; only website forms create records.
- It does not show fake availability. Without a scheduling provider, consultations are requests you confirm manually.
- It does not report email as sent unless the provider accepted it (see Notifications → Email delivery log).
