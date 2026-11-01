import { env } from "cloudflare:workers";
import {
  bootstrapSecretMatches,
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
  if (!bootstrapSecretMatches(request)) {
    return Response.json({ error: "Administrator setup is not authorized." }, { status: 403 });
  }

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
  if (!env.DB) {
    return Response.json({ error: "Administrator setup is temporarily unavailable." }, { status: 503 });
  }

  let failureStage = "password-hash";
  try {
    const email = body.email.trim().toLowerCase();
    const { hash, salt } = await passwordCredentials(email, body.password, (stage) => {
      failureStage = stage;
    });
    const id = crypto.randomUUID();
    failureStage = "account-insert";
    const result = await env.DB.prepare(
      "INSERT INTO users (id, email, name, password_hash, password_salt, role) SELECT ?, ?, ?, ?, ?, 'admin' WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1)",
    ).bind(id, email, body.name.trim(), hash, salt).run();
    if (!result.success) throw new Error("The administrator account could not be created.");
    if (result.meta.changes !== 1) {
      return Response.json({ error: "Initial administrator setup has already been completed." }, { status: 409 });
    }

    failureStage = "session-create";
    const cookie = await createSession(id);
    return Response.json(
      { user: { id, email, name: body.name.trim(), role: "admin" } },
      { status: 201, headers: { "Set-Cookie": cookie } },
    );
  } catch (error) {
    console.error("Atlas administrator bootstrap failed", {
      stage: failureStage,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Administrator setup is temporarily unavailable." }, { status: 503 });
  }
}
