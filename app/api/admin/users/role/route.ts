import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { users } from "../../../../../db/schema";
import { requireRole, requireSameOrigin } from "../../../auth-session";

export async function PUT(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const user = await requireRole(request, ["admin"]);
    if (user instanceof Response) return user;

    let body: { email?: unknown; role?: unknown };
    try {
      body = await request.json() as typeof body;
    } catch {
      return Response.json({ error: "Enter an email address and a supported role." }, { status: 400 });
    }
    if (
      typeof body.email !== "string" ||
      (body.role !== "learner" && body.role !== "instructor")
    ) {
      return Response.json({ error: "Enter an email address and a supported role." }, { status: 400 });
    }
    const [updated] = await getDb()
      .update(users)
      .set({ role: body.role })
      .where(and(eq(users.email, body.email.trim().toLowerCase()), ne(users.role, "admin")))
      .returning({ email: users.email, role: users.role });
    if (!updated) return Response.json({ error: "A non-administrator account with that email was not found." }, { status: 404 });
    return Response.json({ user: updated });
  } catch {
    return Response.json({ error: "The account role could not be updated." }, { status: 503 });
  }
}
