import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  level: text("level").notNull(),
  duration: text("duration").notNull(),
  instructor: text("instructor").notNull(),
  color: text("color").notNull(),
  accent: text("accent").notNull(),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const modules = sqliteTable("modules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull(),
});

export const lessons = sqliteTable("lessons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  moduleId: integer("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  position: integer("position").notNull(),
});

export const enrollments = sqliteTable("enrollments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  enrolledAt: text("enrolled_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const lessonProgress = sqliteTable("lesson_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  lessonId: integer("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const quizzes = sqliteTable("quizzes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  passingScore: integer("passing_score").notNull().default(70),
});

export const quizQuestions = sqliteTable("quiz_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  optionsJson: text("options_json").notNull(),
  correctIndex: integer("correct_index").notNull(),
});

export const quizAttempts = sqliteTable("quiz_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  attemptedAt: text("attempted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  dueLabel: text("due_label").notNull(),
  points: integer("points").notNull().default(100),
});

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  response: text("response").notNull(),
  status: text("status").notNull().default("Submitted"),
  submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
