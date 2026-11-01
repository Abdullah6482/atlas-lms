import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  courses,
  enrollments,
  lessonProgress,
  lessons,
  modules,
  quizAttempts,
  submissions,
} from "../../../db/schema";
import { getSessionUser, requireSameOrigin } from "../auth-session";
import { curriculumRows } from "../lms-data";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });

    const curriculum = await curriculumRows();
    const db = getDb();
    const visibleCourses = curriculum.courses.filter((course) => course.published);
    const visibleCourseIds = new Set(visibleCourses.map((course) => course.id));
    const visibleModules = curriculum.modules.filter((module) => visibleCourseIds.has(module.courseId));
    const visibleModuleIds = new Set(visibleModules.map((module) => module.id));
    const visibleLessons = curriculum.lessons.filter((lesson) => visibleModuleIds.has(lesson.moduleId));
    const visibleQuizzes = curriculum.quizzes.filter((quiz) => visibleCourseIds.has(quiz.courseId));
    const visibleQuizIds = new Set(visibleQuizzes.map((quiz) => quiz.id));
    const visibleAssignments = curriculum.assignments.filter((assignment) => visibleCourseIds.has(assignment.courseId));
    const enrolled = (await db.select().from(enrollments).where(eq(enrollments.userId, user.id)))
      .filter((enrollment) => visibleCourseIds.has(enrollment.courseId));
    const progress = (await db.select().from(lessonProgress).where(eq(lessonProgress.userId, user.id)))
      .filter((item) => visibleLessons.some((lesson) => lesson.id === item.lessonId));
    const attempts = (await db.select().from(quizAttempts).where(eq(quizAttempts.userId, user.id)))
      .filter((item) => visibleQuizIds.has(item.quizId));
    const submissionRows = (await db.select().from(submissions).where(eq(submissions.userId, user.id)))
      .filter((item) => visibleAssignments.some((assignment) => assignment.id === item.assignmentId));

    return Response.json({
      user,
      courses: visibleCourses,
      modules: visibleModules,
      lessons: visibleLessons,
      quizzes: visibleQuizzes,
      questions: curriculum.questions
        .filter((question) => visibleQuizIds.has(question.quizId))
        .map(({ id, quizId, prompt, optionsJson }) => ({ id, quizId, prompt, optionsJson })),
      assignments: visibleAssignments,
      enrollments: enrolled,
      progress,
      attempts,
      submissions: submissionRows,
    });
  } catch {
    return Response.json({ error: "Your learning dashboard could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const user = await getSessionUser(request);
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });

    const body = await request.json() as {
      action?: string;
      courseId?: number;
      lessonId?: number;
      quizId?: number;
      answers?: number[];
      assignmentId?: number;
      response?: string;
    };
    const curriculum = await curriculumRows();
    const db = getDb();

    if (body.action === "enroll" && Number.isInteger(body.courseId)) {
      const [course] = await db.select({ id: courses.id }).from(courses)
        .where(and(eq(courses.id, body.courseId!), eq(courses.published, true))).limit(1);
      if (!course) return Response.json({ error: "Course not found." }, { status: 404 });

      const existing = await db.select({ id: enrollments.id }).from(enrollments)
        .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, course.id))).limit(1);
      if (!existing.length) await db.insert(enrollments).values({ userId: user.id, courseId: course.id });
      return Response.json({ ok: true });
    }

    if (body.action === "completeLesson" && Number.isInteger(body.lessonId)) {
      const [lesson] = await db.select({ id: lessons.id, courseId: modules.courseId })
        .from(lessons).innerJoin(modules, eq(lessons.moduleId, modules.id))
        .where(eq(lessons.id, body.lessonId!)).limit(1);
      if (!lesson) return Response.json({ error: "Lesson not found." }, { status: 404 });
      if (!(await isEnrolled(user.id, lesson.courseId))) {
        return Response.json({ error: "Enrol in this course before recording lesson progress." }, { status: 403 });
      }

      const existing = await db.select({ id: lessonProgress.id }).from(lessonProgress)
        .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id))).limit(1);
      if (!existing.length) await db.insert(lessonProgress).values({ userId: user.id, lessonId: lesson.id });
      return Response.json({ ok: true });
    }

    if (body.action === "submitQuiz" && Number.isInteger(body.quizId) && Array.isArray(body.answers)) {
      const quiz = curriculum.quizzes.find((item) => item.id === body.quizId);
      const questions = curriculum.questions.filter((item) => item.quizId === body.quizId);
      if (!quiz || !questions.length) return Response.json({ error: "Quiz not found." }, { status: 404 });
      if (!(await isEnrolled(user.id, quiz.courseId))) {
        return Response.json({ error: "Enrol in this course before submitting a quiz." }, { status: 403 });
      }
      if (body.answers.length !== questions.length || body.answers.some((answer, index) => {
        const options: unknown = JSON.parse(questions[index].optionsJson);
        return !Array.isArray(options) || !Number.isInteger(answer) || answer < 0 || answer >= options.length;
      })) {
        return Response.json({ error: "Submit one valid answer for every question." }, { status: 400 });
      }

      const correct = questions.filter((question, index) => question.correctIndex === body.answers?.[index]).length;
      const score = Math.round((correct / questions.length) * 100);
      const [attempt] = await db.insert(quizAttempts)
        .values({ userId: user.id, quizId: quiz.id, score, passed: score >= quiz.passingScore }).returning();
      return Response.json({ attempt });
    }

    if (
      body.action === "submitAssignment" &&
      Number.isInteger(body.assignmentId) &&
      typeof body.response === "string" &&
      body.response.trim().length > 0 &&
      body.response.length <= 20_000
    ) {
      const assignment = curriculum.assignments.find((item) => item.id === body.assignmentId);
      if (!assignment) return Response.json({ error: "Assignment not found." }, { status: 404 });
      if (!(await isEnrolled(user.id, assignment.courseId))) {
        return Response.json({ error: "Enrol in this course before submitting an assignment." }, { status: 403 });
      }
      const [submission] = await db.insert(submissions).values({
        userId: user.id,
        assignmentId: assignment.id,
        response: body.response.trim(),
      }).returning();
      return Response.json({ submission });
    }

    return Response.json({ error: "Unknown learning action." }, { status: 400 });
  } catch {
    return Response.json({ error: "Your learning update could not be saved." }, { status: 500 });
  }
}

async function isEnrolled(userId: string, courseId: number): Promise<boolean> {
  const [enrollment] = await getDb().select({ id: enrollments.id }).from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(
      eq(enrollments.userId, userId),
      eq(enrollments.courseId, courseId),
      eq(courses.published, true),
    )).limit(1);
  return Boolean(enrollment);
}
