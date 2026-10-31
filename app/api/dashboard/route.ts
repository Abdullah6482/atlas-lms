import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { enrollments, lessonProgress, quizAttempts, submissions } from "../../../db/schema";
import { curriculumRows, requestUser } from "../lms-data";

export async function GET(request: Request) {
  try {
    const user = requestUser(request);
    const curriculum = await curriculumRows();
    const db = getDb();
    let enrolled = await db.select().from(enrollments).where(eq(enrollments.userId, user.id));
    if (!enrolled.length && curriculum.courses.length >= 2) {
      enrolled = await db.insert(enrollments).values(curriculum.courses.slice(0, 2).map((course) => ({ userId: user.id, courseId: course.id }))).returning();
      const firstLesson = curriculum.lessons.find((lesson) => curriculum.modules.find((module) => module.id === lesson.moduleId)?.courseId === curriculum.courses[0].id);
      if (firstLesson) await db.insert(lessonProgress).values({ userId: user.id, lessonId: firstLesson.id });
    }
    return Response.json({ user, ...curriculum, enrollments: enrolled, progress: await db.select().from(lessonProgress).where(eq(lessonProgress.userId, user.id)), attempts: await db.select().from(quizAttempts).where(eq(quizAttempts.userId, user.id)), submissions: await db.select().from(submissions).where(eq(submissions.userId, user.id)) });
  } catch { return Response.json({ error: "Your learning dashboard could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const user = requestUser(request); const body = await request.json() as { action?: string; courseId?: number; lessonId?: number; quizId?: number; answers?: number[]; assignmentId?: number; response?: string };
    const curriculum = await curriculumRows(); const db = getDb();
    if (body.action === "enroll" && body.courseId) {
      const existing = await db.select().from(enrollments).where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, body.courseId))).limit(1);
      if (!existing.length) await db.insert(enrollments).values({ userId: user.id, courseId: body.courseId });
      return Response.json({ ok: true });
    }
    if (body.action === "completeLesson" && body.lessonId) {
      const existing = await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, body.lessonId))).limit(1);
      if (!existing.length) await db.insert(lessonProgress).values({ userId: user.id, lessonId: body.lessonId });
      return Response.json({ ok: true });
    }
    if (body.action === "submitQuiz" && body.quizId && body.answers) {
      const quiz = curriculum.quizzes.find((item) => item.id === body.quizId); const questions = curriculum.questions.filter((item) => item.quizId === body.quizId);
      if (!quiz || !questions.length) return Response.json({ error: "Quiz not found." }, { status: 404 });
      const correct = questions.filter((question, index) => question.correctIndex === body.answers?.[index]).length; const score = Math.round((correct / questions.length) * 100); const passed = score >= quiz.passingScore;
      const [attempt] = await db.insert(quizAttempts).values({ userId: user.id, quizId: quiz.id, score, passed }).returning();
      return Response.json({ attempt });
    }
    if (body.action === "submitAssignment" && body.assignmentId && body.response?.trim()) {
      const [submission] = await db.insert(submissions).values({ userId: user.id, assignmentId: body.assignmentId, response: body.response.trim() }).returning();
      return Response.json({ submission });
    }
    return Response.json({ error: "Unknown learning action." }, { status: 400 });
  } catch { return Response.json({ error: "Your learning update could not be saved." }, { status: 500 }); }
}
