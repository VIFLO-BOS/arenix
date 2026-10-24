# Deployment & operations

## Environments

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB Community (local `mongodb://127.0.0.1:27017/arenix`) or any MongoDB-compatible URI. For managed hosting, a replica-set URI works unchanged. |
| `AUTH_SECRET` | yes | ≥32 random chars. Rotating it invalidates all sessions and pending invitation/reset links. |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical https URL (used in emails, sitemap, metadata). |
| `RESEND_API_KEY`, `EMAIL_FROM` | for real email | Domain must be verified in Resend before claiming delivery. Without the key: demo-log mode. |
| `ADMIN_NOTIFICATION_EMAIL` | recommended | Always receives inquiry/booking alerts (plus recipients set in Settings). |
| `NEXT_PUBLIC_WHATSAPP_E164_DIGITS` | optional | Official areniX number, digits only. Can also be set in Settings → Contact (DB value wins when set). |
| `NEXT_PUBLIC_BUSINESS_EMAIL/PHONE` | optional | Published once set. |
| `SCHEDULER_PROVIDER`, `SCHEDULER_PUBLIC_EVENT_LINK`, `SCHEDULER_WEBHOOK_SECRET` | optional | `calcom` enables the embed; the webhook refuses to run without the secret. |
| `MEDIA_STORAGE_DRIVER` | optional | `local` (default). `s3` requires an adapter + `S3_*`; the boundary is in `services/storage.ts`. |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | optional | Privacy-aware analytics domain; dashboard shows "not configured" otherwise. |
| `BOOTSTRAP_ADMIN_*` | first run only | Consumed by `npm run db:create-admin`; never read by the web app. |

## First deployment checklist

1. Provision MongoDB (Community on a VM, or a managed MongoDB service). Enable authentication and backups. Put the URI in `MONGODB_URI`.
2. `npm ci && npm run build` (also runs typecheck implicitly via Next; run `npm run typecheck && npm run lint` in CI).
3. `npm run db:seed` once to load starter content and indexes; `npm run db:create-admin` once for the first super admin.
4. Start with `npm run start` behind a reverse proxy (or deploy to Vercel/Node host). Set `NODE_ENV=production` so cookies are `Secure`.
5. Sign in at `/admin/login`, change the bootstrap password via **Forgot password**, and invite the team from **Team**.
6. Fill **Settings** (contact, WhatsApp, booking, notification recipients, SEO, legal review flags) and approve portfolio media.
7. Configure Resend and verify the sender domain; watch **Notifications → Email delivery log** for `SENT`.
8. (Optional) Cal.com: create the event type, set `SCHEDULER_*`, add a webhook pointing at `/api/webhooks/calcom` for `BOOKING_CREATED/RESCHEDULED/CANCELLED` with the same secret.

## Hosting notes

- **Vercel**: works out of the box; uploads with the `local` driver are ephemeral there — use the S3 adapter boundary for production media, or host on a Node server with a persistent disk.
- **Node/VM/Docker**: `npm run build && npm run start`; mount `public/uploads` on persistent storage; run MongoDB Community with `--auth` and daily `mongodump`.
- Rate limiting is in-memory per instance. For multiple instances replace the store in `src/lib/rate-limit.ts` with Redis.

## Backups & restore

```bash
mongodump --uri "$MONGODB_URI" --out backups/$(date +%F)
mongorestore --uri "$MONGODB_URI" --drop backups/2026-10-19/arenix
```

Also back up `public/uploads` (attachments and media).

## Monitoring

- Server logs are structured by prefix (`[email:demo]`, `[audit]`, `[content]`, `[contact]`, `[start-project]`).
- `/admin/audit` records logins, denied access, role changes, publication and workflow changes.
- `/admin/notifications` shows failed/pending email with retry.
- Add an error-monitoring SDK (e.g. Sentry) in `src/app/error.tsx` / `instrumentation.ts` when an account exists; none is pre-wired to avoid fake configuration.

## Free vs billable

| Service | Cost |
|---|---|
| MongoDB Community | free (self-hosted) |
| Resend | free tier available; sender domain required |
| Cal.com | hosted free tier for individuals; webhooks available |
| Vercel | hobby free / pro billable |
| Object storage | billable (any S3-compatible) |
