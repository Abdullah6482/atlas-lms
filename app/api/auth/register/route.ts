import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  createSession,
  passwordCredentials,
  requireSameOrigin,
  validEmail,
  validName,
  validPassword,
} from "../../auth-session";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  let body: { email?: unknown; name?: unknown; password?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "Enter your name, a valid email address, and a password." }, { status: 400 });
  }
  if (!validEmail(body.email) || !validPassword(body.password) || !validName(body.name)) {
    return Response.json(
      { error: "Enter your name, a valid email, and a password of at least 12 characters." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const [administrator] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
    if (!administrator) {
      return Response.json(
        { error: "Atlas is not ready for registration. An administrator must first complete account setup." },
        { status: 503 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const { hash, salt } = await passwordCredentials(email, body.password);
    const id = crypto.randomUUID();
    const [user] = await db.insert(users).values({
      id,
      email,
      name: body.name.trim(),
      passwordHash: hash,
      passwordSalt: salt,
      role: "learner",
    }).returning({ id: users.id, email: users.email, name: users.name, role: users.role });
    const cookie = await createSession(user.id);
    return Response.json({ user }, { status: 201, headers: { "Set-Cookie": cookie } });
  } catch (error) {
    if (error instanceof Error && /unique|constraint/i.test(error.message)) {
      return Response.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    return Response.json({ error: "Registration is temporarily unavailable." }, { status: 503 });
  }
}
