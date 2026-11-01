import {
  createSession,
  getSessionUser,
  requireSameOrigin,
  validEmail,
  validPassword,
  verifyPassword,
} from "../../auth-session";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
    return Response.json({ user });
  } catch {
    return Response.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "Enter a valid email address and password." }, { status: 400 });
  }
  if (!validEmail(body.email) || !validPassword(body.password)) {
    return Response.json({ error: "Enter a valid email address and password." }, { status: 400 });
  }

  try {
    const user = await verifyPassword(body.email, body.password);
    if (!user) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    const cookie = await createSession(user.id);
    return Response.json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      { headers: { "Set-Cookie": cookie } },
    );
  } catch {
    return Response.json({ error: "Sign in is temporarily unavailable." }, { status: 503 });
  }
}
