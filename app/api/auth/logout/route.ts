import { clearSessionCookie, requireSameOrigin, revokeSession } from "../../auth-session";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    await revokeSession(request);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
  } catch {
    return Response.json({ error: "Sign out is temporarily unavailable." }, { status: 503 });
  }
}
