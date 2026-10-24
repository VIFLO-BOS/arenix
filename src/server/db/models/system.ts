import mongoose, { Schema, Types, type Model } from "mongoose";

export interface NotificationDoc {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  roles: string[];
  type: string;
  title: string;
  body?: string;
  link?: string;
  readBy: Types.ObjectId[];
  entityType?: string;
  entityId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const EMAIL_STATUSES = ["PENDING", "SENT", "FAILED", "DEMO_LOGGED"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export interface EmailDispatchDoc {
  _id: Types.ObjectId;
  to: string[];
  subject: string;
  template: string;
  html: string;
  text?: string;
  status: EmailStatus;
  provider: string;
  providerMessageId?: string;
  attempts: number;
  lastError?: string;
  nextAttemptAt?: Date;
  sentAt?: Date;
  entityType?: string;
  entityId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogDoc {
  _id: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorLabel?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
  severity: "INFO" | "WARN" | "SECURITY";
  createdAt: Date;
}

export interface ClickEventDoc {
  _id: Types.ObjectId;
  kind: string;
  context?: string;
  path?: string;
  day: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<NotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    roles: [{ type: String }],
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String },
    link: { type: String },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    entityType: { type: String },
    entityId: { type: String },
  },
  { timestamps: true },
);
NotificationSchema.index({ createdAt: -1 });

const EmailDispatchSchema = new Schema<EmailDispatchDoc>(
  {
    to: [{ type: String, required: true }],
    subject: { type: String, required: true },
    template: { type: String, required: true },
    html: { type: String, required: true },
    text: { type: String },
    status: { type: String, enum: EMAIL_STATUSES, default: "PENDING", index: true },
    provider: { type: String, default: "demo-log" },
    providerMessageId: { type: String },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    nextAttemptAt: { type: Date },
    sentAt: { type: Date },
    entityType: { type: String },
    entityId: { type: String },
  },
  { timestamps: true },
);
EmailDispatchSchema.index({ createdAt: -1 });

const AuditLogSchema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorLabel: { type: String },
    action: { type: String, required: true, index: true },
    entityType: { type: String, index: true },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ipHash: { type: String },
    severity: { type: String, enum: ["INFO", "WARN", "SECURITY"], default: "INFO" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuditLogSchema.index({ createdAt: -1 });

const ClickEventSchema = new Schema<ClickEventDoc>(
  {
    kind: { type: String, required: true, index: true },
    context: { type: String },
    path: { type: String },
    day: { type: String, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const Notification = model<NotificationDoc>("Notification", NotificationSchema);
export const EmailDispatch = model<EmailDispatchDoc>("EmailDispatch", EmailDispatchSchema);
export const AuditLog = model<AuditLogDoc>("AuditLog", AuditLogSchema);
export const ClickEvent = model<ClickEventDoc>("ClickEvent", ClickEventSchema);
