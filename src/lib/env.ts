import "server-only";

/**
 * Server-side environment access with explicit "configured" flags.
 * Nothing here is ever sent to the client bundle.
 */
function read(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === null ? fallback : String(v).trim();
}

export const env = {
  mongodbUri: read("MONGODB_URI", "mongodb://127.0.0.1:27017/arenix"),
  authSecret: read("AUTH_SECRET"),
  siteUrl: read("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").replace(/\/$/, ""),
  resendApiKey: read("RESEND_API_KEY"),
  emailFrom: read("EMAIL_FROM", "areniX <no-reply@example.com>"),
  adminNotificationEmail: read("ADMIN_NOTIFICATION_EMAIL"),
  schedulerProvider: (read("SCHEDULER_PROVIDER", "none").toLowerCase() as "none" | "calcom"),
  schedulerPublicEventLink: read("SCHEDULER_PUBLIC_EVENT_LINK"),
  schedulerWebhookSecret: read("SCHEDULER_WEBHOOK_SECRET"),
  mediaStorageDriver: (read("MEDIA_STORAGE_DRIVER", "local").toLowerCase() as "local" | "s3"),
  s3: {
    endpoint: read("S3_ENDPOINT"),
    region: read("S3_REGION"),
    bucket: read("S3_BUCKET"),
    accessKeyId: read("S3_ACCESS_KEY_ID"),
    secretAccessKey: read("S3_SECRET_ACCESS_KEY"),
    publicBaseUrl: read("S3_PUBLIC_BASE_URL"),
  },
  isProduction: process.env.NODE_ENV === "production",
};

export const integrations = {
  email: {
    configured: env.resendApiKey.length > 0,
    mode: env.resendApiKey.length > 0 ? ("resend" as const) : ("demo-log" as const),
  },
  scheduler: {
    configured: env.schedulerProvider === "calcom" && env.schedulerPublicEventLink.length > 0,
    provider: env.schedulerProvider,
    webhookVerifiable: env.schedulerWebhookSecret.length > 0,
  },
  media: {
    driver: env.mediaStorageDriver,
    configured: env.mediaStorageDriver === "local" || (env.s3.bucket.length > 0 && env.s3.accessKeyId.length > 0),
  },
};

export function assertAuthSecret() {
  if (!env.authSecret || env.authSecret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return env.authSecret;
}
