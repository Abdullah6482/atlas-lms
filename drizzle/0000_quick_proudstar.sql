CREATE TABLE `assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`title` text NOT NULL,
	`brief` text NOT NULL,
	`due_label` text NOT NULL,
	`points` integer DEFAULT 100 NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`level` text NOT NULL,
	`duration` text NOT NULL,
	`instructor` text NOT NULL,
	`color` text NOT NULL,
	`accent` text NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_unique` ON `courses` (`slug`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`course_id` integer NOT NULL,
	`enrolled_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`lesson_id` integer NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`module_id` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`content` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`quiz_id` integer NOT NULL,
	`score` integer NOT NULL,
	`passed` integer NOT NULL,
	`attempted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quiz_id` integer NOT NULL,
	`prompt` text NOT NULL,
	`options_json` text NOT NULL,
	`correct_index` integer NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`title` text NOT NULL,
	`passing_score` integer DEFAULT 70 NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`assignment_id` integer NOT NULL,
	`response` text NOT NULL,
	`status` text DEFAULT 'Submitted' NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade
);
