import mongoose, { Schema, Types, type Model } from "mongoose";

/**
 * Explicit document interfaces (instead of InferSchemaType) keep the TypeScript checker fast:
 * Mongoose's schema inference on large schemas is extremely expensive at compile time.
 */

export const ROLES = ["SUPER_ADMIN", "ADMIN", "BUSINESS_DEVELOPMENT", "CONTENT_MANAGER", "PROJECT_MANAGER"] as const;
export type Role = (typeof ROLES)[number];

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date;
  failedLoginCount: number;
  lockedUntil?: Date;
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipHash?: string;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenDoc {
  _id: Types.ObjectId;
  type: "INVITATION" | "PASSWORD_RESET";
  email: string;
  tokenHash: string;
  role?: Role;
  name?: string;
  createdBy?: Types.ObjectId;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Second sign in step. Created after a correct password, it holds a hashed six digit code
 * that was emailed to the user. The browser proves it started the sign in with a separate
 * random token in a short lived cookie, so a code alone is useless on another device.
 */
export interface LoginChallengeDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  codeHash: string;
  attempts: number;
  sends: number;
  lastSentAt: Date;
  expiresAt: Date;
  next?: string;
  userAgent?: string;
  ipHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Fixed window counter shared by every server instance (the in memory limiter is per instance). */
export interface RateLimitDoc {
  _id: Types.ObjectId;
  key: string;
  count: number;
  resetAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: "CONTENT_MANAGER" },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const SessionSchema = new Schema<SessionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    userAgent: { type: String },
    ipHash: { type: String },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

const AuthTokenSchema = new Schema<AuthTokenDoc>(
  {
    type: { type: String, enum: ["INVITATION", "PASSWORD_RESET"], required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    role: { type: String, enum: ROLES },
    name: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 60 * 60 * 24 * 7 } },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

const LoginChallengeSchema = new Schema<LoginChallengeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    sends: { type: Number, default: 1 },
    lastSentAt: { type: Date, required: true },
    // Removed by MongoDB shortly after it expires.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    next: { type: String },
    userAgent: { type: String },
    ipHash: { type: String },
  },
  { timestamps: true },
);

const RateLimitSchema = new Schema<RateLimitDoc>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  resetAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const User = model<UserDoc>("User", UserSchema);
export const Session = model<SessionDoc>("Session", SessionSchema);
export const AuthToken = model<AuthTokenDoc>("AuthToken", AuthTokenSchema);
export const LoginChallenge = model<LoginChallengeDoc>("LoginChallenge", LoginChallengeSchema);
export const RateLimit = model<RateLimitDoc>("RateLimit", RateLimitSchema);
