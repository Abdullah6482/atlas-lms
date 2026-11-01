import { count, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { courses, enrollments, lessons, modules, quizAttempts, submissions } from "../../../db/schema";
import { requireRole, requireSameOrigin } from "../auth-session";
import { curriculumRows } from "../lms-data";

const instructorRoles = ["instructor", "admin"] as const;

export async function GET(request: Request) {
  try {
    const user = await requireRole(request, [...instructorRoles]);
    if (user instanceof Response) return user;

    const curriculum = await curriculumRows();
    const db = getDb();
    const [enrollmentCount] = await db.select({ value: count() }).from(enrollments);
    const [attemptCount] = await db.select({ value: count() }).from(quizAttempts);
    const [submissionCount] = await db.select({ value: count() }).from(submissions);
    return Response.json({
      ...curriculum,
      metrics: {
        courses: curriculum.courses.length,
        learners: enrollmentCount.value,
        attempts: attemptCount.value,
        submissions: submissionCount.value,
      },
    });
  } catch {
    return Response.json({ error: "Instructor analytics could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const user = await requireRole(request, [...instructorRoles]);
    if (user instanceof Response) return user;

    const body = await request.json() as {
      title?: unknown;
      category?: unknown;
      description?: unknown;
      level?: unknown;
      duration?: unknown;
      instructor?: unknown;
    };
    if (
      typeof body.title !== "string" ||
      typeof body.category !== "string" ||
      typeof body.description !== "string" ||
      !body.title.trim() ||
      !body.category.trim() ||
      !body.description.trim()
    ) {
      return Response.json({ error: "Title, category, and description are required." }, { status: 400 });
    }

    const db = await ensure();
    const slug = `${body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-4)}`;
    const [course] = await db.insert(courses).values({
      slug,
      title: body.title.trim(),
      description: body.description.trim(),
      category: body.category.trim(),
      level: typeof body.level === "string" && body.level.trim() ? body.level.trim() : "Beginner",
      duration: typeof body.duration === "string" && body.duration.trim() ? body.duration.trim() : "4 weeks",
      instructor: typeof body.instructor === "string" && body.instructor.trim() ? body.instructor.trim() : "Atlas Faculty",
      color: "#e7dcff",
      accent: "#7357d6",
      published: false,
    }).returning();
    const [module] = await db.insert(modules).values({ courseId: course.id, title: "Getting started", position: 1 }).returning();
    await db.insert(lessons).values({
      moduleId: module.id,
      title: "Course introduction",
      summary: "Welcome learners and set expectations.",
      content: "This draft lesson gives your new course a clear starting point. Use the course studio to refine the curriculum before publishing.",
      durationMinutes: 5,
      position: 1,
    });
    return Response.json({ course }, { status: 201 });
  } catch {
    return Response.json({ error: "Course could not be created." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const user = await requireRole(request, [...instructorRoles]);
    if (user instanceof Response) return user;

    let body: { id?: unknown; published?: unknown };
    try {
      body = await request.json() as typeof body;
    } catch {
      return Response.json({ error: "Enter a course ID and publication status." }, { status: 400 });
    }
    if (typeof body.id !== "number" || !Number.isInteger(body.id) || typeof body.published !== "boolean") {
      return Response.json({ error: "Enter a course ID and publication status." }, { status: 400 });
    }
    const [course] = await getDb().update(courses)
      .set({ published: body.published })
      .where(eq(courses.id, body.id))
      .returning();
    if (!course) return Response.json({ error: "Course not found." }, { status: 404 });
    return Response.json({ course });
  } catch {
    return Response.json({ error: "Course could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const user = await requireRole(request, [...instructorRoles]);
    if (user instanceof Response) return user;

    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) {
      return Response.json({ error: "Course ID is required." }, { status: 400 });
    }
    const [course] = await getDb().delete(courses).where(eq(courses.id, id)).returning();
    if (!course) return Response.json({ error: "Course not found." }, { status: 404 });
    return Response.json({ course });
  } catch {
    return Response.json({ error: "Course could not be deleted." }, { status: 500 });
  }
}

async function ensure() {
  await curriculumRows();
  return getDb();
}
