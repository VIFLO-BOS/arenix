/**
 * Writes the sign in emails as standalone HTML files you can paste into Resend
 * (Templates, then Create template, then HTML) or open in a browser to preview.
 *
 *   npx tsx scripts/export-email-templates.ts
 *   SITE_URL=https://www.your-domain.com npx tsx scripts/export-email-templates.ts
 *
 * The files are generated from src/lib/email-design.ts, the same code the site uses to send
 * these emails, so they always match. Values the site fills in are written as Resend
 * template variables, for example {{{CODE}}}.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { codeLockoutEmail, loginCodeEmail, newSignInEmail, type EmailBrand } from "../src/lib/email-design";

const brand: EmailBrand = {
  siteUrl: (process.env.SITE_URL ?? "https://arenix-mocha.vercel.app").replace(/\/$/, ""),
  legalName: "areniX Technologies Limited",
};

const vars = {
  name: "{{{USER_NAME}}}",
  when: "{{{REQUESTED_AT}}}",
  device: "{{{DEVICE}}}",
  resetUrl: "{{{RESET_URL}}}",
};

const files = [
  { file: "login-code.html", email: loginCodeEmail(brand, { ...vars, code: "{{{CODE}}}", minutes: "{{{EXPIRES_MINUTES}}}" }) },
  { file: "new-sign-in.html", email: newSignInEmail(brand, { ...vars, dashboardUrl: `${brand.siteUrl}/admin` }) },
  { file: "sign-in-blocked.html", email: codeLockoutEmail(brand, vars) },
];

async function main() {
  const dir = path.join(process.cwd(), "docs", "email-templates");
  await mkdir(dir, { recursive: true });
  for (const { file, email } of files) {
    await writeFile(path.join(dir, file), email.html);
    console.log(`wrote docs/email-templates/${file}  (subject "${email.subject}")`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
