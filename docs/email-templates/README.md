# Email templates

These HTML files are the sign in emails the dashboard sends, exported for use in Resend or for previewing in a browser.
Regenerate them after any design change with

```
npx tsx scripts/export-email-templates.ts
```

They are built from `src/lib/email-design.ts`, the same code the site uses when it sends these emails, so the files and the real emails never drift apart.
The site sends the HTML itself through the Resend API, so nothing has to be pasted into Resend for sign in to work. Pasting them is optional, for previews or for sending from Resend directly.

## Files

| File | Subject | When it is sent |
|---|---|---|
| login-code.html | Your areniX sign in code | After a correct password, with the six digit code |
| new-sign-in.html | New sign in to your areniX dashboard | After every successful sign in |
| sign-in-blocked.html | Someone entered your areniX password | After five wrong codes cancel a sign in |

## Variables

Resend template variables use three braces. Create these in the Resend template editor with the same names.

| Variable | Example | Used in |
|---|---|---|
| `{{{CODE}}}` | 482913 | login-code |
| `{{{EXPIRES_MINUTES}}}` | 10 | login-code |
| `{{{USER_NAME}}}` | Bankole | all |
| `{{{REQUESTED_AT}}}` | Thursday 5 November 2026 at 2.03pm, Lagos time | all |
| `{{{DEVICE}}}` | Chrome on Windows | all |
| `{{{RESET_URL}}}` | https://arenix-mocha.vercel.app/admin/forgot-password | all |

`FIRST_NAME`, `LAST_NAME` and `EMAIL` are reserved by Resend, which is why the name variable is `USER_NAME`.

## Logo

The header loads `/brand/email-logo.png` from the live site. If the site moves to a new domain, export again with
`SITE_URL=https://your-domain npx tsx scripts/export-email-templates.ts`.
