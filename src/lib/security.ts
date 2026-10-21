import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./db";
import { homologationAccess } from "./homologation";

export async function assertHomologationPerimeter(): Promise<void> {
  // Avoid accessing request headers when the normal mode is in use.
  const initial = homologationAccess(null);
  if (initial === "disabled") return;
  const access = homologationAccess((await headers()).get("authorization"));
  if (access !== "allowed") throw new Error("Acesso de homologação negado");
}

/** Check the browser Origin against a configured trusted origin, never Host. */
export async function assertSameOrigin(): Promise<void> {
  await assertHomologationPerimeter();
  const rawOrigin = (await headers()).get("origin");
  const configured = process.env.APP_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:3000");
  if (!rawOrigin || !configured) throw new Error("Origem não permitida");
  try {
    const origin = new URL(rawOrigin);
    const expected = new URL(configured);
    if (origin.origin !== expected.origin || rawOrigin !== origin.origin || !["http:", "https:"].includes(origin.protocol) || (process.env.NODE_ENV === "production" && expected.protocol !== "https:")) {
      throw new Error("Origem não permitida");
    }
  } catch {
    throw new Error("Origem não permitida");
  }
}

/** Uses a single atomic PostgreSQL upsert. Never trusts client-supplied IP headers. */
export async function consumeAuthAttempt(scope: "login" | "signup", email: string): Promise<boolean> {
  const digest = createHash("sha256").update(email).digest("hex");
  const key = `${scope}:${digest}`;
  const globalKey = `${scope}:global`;
  const accountLimit = scope === "login" ? 8 : 5;
  const globalLimit = scope === "login" ? 500 : 100;
  return prisma.$transaction(async (tx) => {
    // Check the global window first so a spray of different emails cannot create
    // unlimited new rows after the global threshold is reached.
    const global = await tx.$queryRaw<{ attempts: number }[]>`
      INSERT INTO "AuthAttempt" ("key", "attempts", "resetAt")
      VALUES (${globalKey}, 1, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "AuthAttempt"."resetAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "AuthAttempt"."attempts" + 1 END,
        "resetAt" = CASE WHEN "AuthAttempt"."resetAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE "AuthAttempt"."resetAt" END
      RETURNING "attempts"
    `;
    if (global[0].attempts % 50 === 0) {
      await tx.authAttempt.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, NOT: { key: { endsWith: ":global" } } } });
    }
    if (global[0].attempts > globalLimit) return false;
    const account = await tx.$queryRaw<{ attempts: number }[]>`
      INSERT INTO "AuthAttempt" ("key", "attempts", "resetAt")
      VALUES (${key}, 1, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "AuthAttempt"."resetAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "AuthAttempt"."attempts" + 1 END,
        "resetAt" = CASE WHEN "AuthAttempt"."resetAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE "AuthAttempt"."resetAt" END
      RETURNING "attempts"
    `;
    return account[0].attempts <= accountLimit;
  });
}

export function normalizeEmail(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validPassword(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && value.length >= 12 && Buffer.byteLength(value, "utf8") <= 72;
}
