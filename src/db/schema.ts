import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const time = (name: string) => timestamp(name, { withTimezone: true });
export const roleEnum = pgEnum("account_role", ["student", "teacher", "staff"]);
export const examKindEnum = pgEnum("exam_kind", ["exam", "homework"]);
export const questionKindEnum = pgEnum("question_kind", ["mcq", "text"]);
export const attemptStatusEnum = pgEnum("attempt_status", ["in_progress", "pending_review", "graded"]);

export const grades = pgTable("grades", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 120 }).notNull(),
  stage: varchar("stage", { length: 120 }).notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("grades_sort_idx").on(t.sortOrder)]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: text("password_hash"),
  googleId: varchar("google_id", { length: 255 }),
  studentCode: varchar("student_code", { length: 12 }),
  parentPhone: varchar("parent_phone", { length: 20 }),
  avatar: text("avatar"),
  role: roleEnum("role").notNull().default("student"),
  gradeId: uuid("grade_id").references(() => grades.id, { onDelete: "set null" }),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_google_idx").on(t.googleId), uniqueIndex("users_student_code_idx").on(t.studentCode), index("users_grade_idx").on(t.gradeId)]);

export const sessions = pgTable("sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  expiresAt: time("expires_at").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)]);

export const passwordResets = pgTable("password_resets", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: time("expires_at").notNull(),
  usedAt: time("used_at"),
});

export const authAttempts = pgTable("auth_attempts", {
  key: varchar("key", { length: 64 }).primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStartedAt: time("window_started_at").notNull().defaultNow(),
});

export const terms = pgTable("terms", {
  id: uuid("id").primaryKey().defaultRandom(),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 120 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [index("terms_grade_idx").on(t.gradeId)]);

export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  termId: uuid("term_id").notNull().references(() => terms.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [index("units_term_idx").on(t.termId)]);

export const lectures = pgTable("lectures", {
  id: uuid("id").primaryKey().defaultRandom(),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  termId: uuid("term_id").references(() => terms.id, { onDelete: "set null" }),
  unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  videoUrl: text("video_url"),
  published: boolean("published").notNull().default(false),
  freePreview: boolean("free_preview").notNull().default(false),
  homeworkId: uuid("homework_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("lectures_grade_idx").on(t.gradeId, t.published), index("lectures_created_idx").on(t.createdAt)]);

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  lectureId: uuid("lecture_id").references(() => lectures.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  data: text("data").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("assets_lecture_idx").on(t.lectureId), index("assets_owner_idx").on(t.ownerId)]);

export const progress = pgTable("lecture_progress", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lectureId: uuid("lecture_id").notNull().references(() => lectures.id, { onDelete: "cascade" }),
  seconds: integer("seconds").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  updatedAt: time("updated_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.lectureId] })]);

export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  kind: examKindEnum("kind").notNull().default("exam"),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  maxAttempts: integer("max_attempts").notNull().default(1),
  startsAt: time("starts_at"),
  endsAt: time("ends_at"),
  published: boolean("published").notNull().default(false),
  showReview: boolean("show_review").notNull().default(false),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("exams_grade_idx").on(t.gradeId, t.published)]);

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  kind: questionKindEnum("kind").notNull().default("mcq"),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  correctIndex: integer("correct_index"),
  points: integer("points").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [index("questions_exam_idx").on(t.examId, t.sortOrder)]);

export const attempts = pgTable("exam_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: time("started_at").notNull().defaultNow(),
  submittedAt: time("submitted_at"),
  status: attemptStatusEnum("status").notNull().default("in_progress"),
  score: integer("score"),
  maxScore: integer("max_score"),
}, (t) => [index("attempts_user_idx").on(t.userId), index("attempts_exam_user_idx").on(t.examId, t.userId)]);

export const attemptAnswers = pgTable("attempt_answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  value: text("value").notNull().default(""),
  awarded: integer("awarded"),
  feedback: text("feedback"),
}, (t) => [uniqueIndex("answer_unique_idx").on(t.attemptId, t.questionId)]);

export const activationCodes = pgTable("activation_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  durationDays: integer("duration_days").notNull(),
  expiresAt: time("expires_at"),
  usedAt: time("used_at"),
  usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
  revokedAt: time("revoked_at"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("codes_grade_idx").on(t.gradeId)]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  startsAt: time("starts_at").notNull().defaultNow(),
  endsAt: time("ends_at").notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  codeId: uuid("code_id").references(() => activationCodes.id, { onDelete: "set null" }),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("subs_user_grade_idx").on(t.userId, t.gradeId, t.endsAt), index("subs_end_idx").on(t.endsAt)]);

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  published: boolean("published").notNull().default(true),
  createdAt: time("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]);

export const notificationReads = pgTable("notification_reads", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  readAt: time("read_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.notificationId] })]);

export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull().default(""),
});

export const labSaves = pgTable("lab_saves", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  data: jsonb("data").$type<unknown>().notNull(),
  updatedAt: time("updated_at").notNull().defaultNow(),
}, (t) => [index("lab_saves_user_idx").on(t.userId)]);

export const adminLogs = pgTable("admin_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details").notNull().default(""),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("admin_logs_created_idx").on(t.createdAt)]);

export const lectureUnlocks = pgTable("lecture_unlocks", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lectureId: uuid("lecture_id").notNull().references(() => lectures.id, { onDelete: "cascade" }),
  grantedBy: uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.lectureId] })]);
