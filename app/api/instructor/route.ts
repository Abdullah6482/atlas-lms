import { count, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { courses, enrollments, lessons, modules, quizAttempts, submissions } from "../../../db/schema";
import { curriculumRows } from "../lms-data";

export async function GET() {
  try {
    const curriculum = await curriculumRows(); const db = getDb();
    const [enrollmentCount] = await db.select({ value: count() }).from(enrollments); const [attemptCount] = await db.select({ value: count() }).from(quizAttempts); const [submissionCount] = await db.select({ value: count() }).from(submissions);
    return Response.json({ ...curriculum, metrics: { courses: curriculum.courses.length, learners: enrollmentCount.value, attempts: attemptCount.value, submissions: submissionCount.value } });
  } catch { return Response.json({ error: "Instructor analytics could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { title?: string; category?: string; description?: string; level?: string; duration?: string; instructor?: string };
    if (!body.title?.trim() || !body.category?.trim() || !body.description?.trim()) return Response.json({ error: "Title, category, and description are required." }, { status: 400 });
    const db = await ensure(); const slug = `${body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-4)}`;
    const [course] = await db.insert(courses).values({ slug, title: body.title.trim(), description: body.description.trim(), category: body.category.trim(), level: body.level || "Beginner", duration: body.duration || "4 weeks", instructor: body.instructor || "Atlas Faculty", color: "#e7dcff", accent: "#7357d6", published: false }).returning();
    const [module] = await db.insert(modules).values({ courseId: course.id, title: "Getting started", position: 1 }).returning();
    await db.insert(lessons).values({ moduleId: module.id, title: "Course introduction", summary: "Welcome learners and set expectations.", content: "This draft lesson gives your new course a clear starting point. Use the course studio to refine the curriculum before publishing.", durationMinutes: 5, position: 1 });
    return Response.json({ course }, { status: 201 });
  } catch { return Response.json({ error: "Course could not be created." }, { status: 409 }); }
}

async function ensure() { await curriculumRows(); return getDb(); }

export async function PUT(request: Request) {
  const body = await request.json() as { id?: number; published?: boolean }; if (!body.id) return Response.json({ error: "Course ID is required." }, { status: 400 });
  const [course] = await getDb().update(courses).set({ published: Boolean(body.published) }).where(eq(courses.id, body.id)).returning(); return Response.json({ course });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id")); if (!Number.isInteger(id)) return Response.json({ error: "Course ID is required." }, { status: 400 });
  const [course] = await getDb().delete(courses).where(eq(courses.id, id)).returning(); return Response.json({ course });
}
