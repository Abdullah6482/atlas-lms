import { and, eq, gt, lt } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../db";
import { sessions, users } from "../../db/schema";

export const SESSION_COOKIE = "__Host-atlas_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 600_000;

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: "learner" | "instructor" | "admin";
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string): Uint8Array {
  return new Uint8Array(value.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

function randomHex(length: number): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(length)));
}

async function digestToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

async function passwordHash(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const saltBytes = hexToBytes(salt);
  const saltBuffer = new ArrayBuffer(saltBytes.byteLength);
  new Uint8Array(saltBuffer).set(saltBytes);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index++) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export function validEmail(email: unknown): email is string {
  return typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validPassword(password: unknown): password is string {
  return typeof password === "string" &&
    password.length >= 12 &&
    password.length <= 256;
}

export function validName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= 100;
}

export function requireSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "This request must come from the same origin." }, { status: 403 });
  }
  return null;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomHex(32);
  const db = getDb();
  await db.delete(sessions).where(lt(sessions.expiresAt, Date.now()));
  await db.insert(sessions).values({
    tokenHash: await digestToken(token),
    userId,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function sessionToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const pair = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = pair?.slice(SESSION_COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export async function getSessionUser(request: Request): Promise<AppUser | null> {
  const token = sessionToken(request);
  if (!token) return null;
  const [record] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, await digestToken(token)), gt(sessions.expiresAt, Date.now())))
    .limit(1);
  if (!record) return null;
  return { id: record.id, email: record.email, name: record.name, role: record.role };
}

export async function requireRole(
  request: Request,
  allowedRoles: AppUser["role"][],
): Promise<AppUser | Response> {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (!allowedRoles.includes(user.role)) {
    return Response.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }
  return user;
}

export async function revokeSession(request: Request): Promise<void> {
  const token = sessionToken(request);
  if (token) {
    await getDb().delete(sessions).where(eq(sessions.tokenHash, await digestToken(token)));
  }
}

export async function verifyPassword(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await getDb().select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  const salt = user?.passwordSalt ?? "61746c61732d6d697373696e672d75736572";
  const calculatedHash = await passwordHash(password, salt);
  const matches = constantTimeEqual(calculatedHash, user?.passwordHash ?? "0".repeat(64));
  return matches ? user : null;
}

export async function passwordCredentials(email: string, password: string) {
  const salt = randomHex(16);
  return { salt, hash: await passwordHash(password, salt) };
}

export function bootstrapSecretMatches(request: Request): boolean {
  const configuredSecret = env.AUTH_BOOTSTRAP_SECRET;
  const providedSecret = request.headers.get("x-atlas-bootstrap-secret");
  return Boolean(
    configuredSecret &&
      configuredSecret.length >= 32 &&
      providedSecret &&
      constantTimeEqual(providedSecret, configuredSecret),
  );
}
