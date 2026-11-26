import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ──────────────────────────── Enums ──────────────────────────── */

export const userRoleEnum = pgEnum("user_role", ["teacher", "student"]);
export const questionTypeEnum = pgEnum("question_type", ["mcq", "short", "essay"]);
export const notificationKindEnum = pgEnum("notification_kind", [
  "info",
  "announcement",
  "subscription",
  "lecture",
  "exam",
]);
export const codeStatusEnum = pgEnum("code_status", ["active", "used", "revoked"]);

/* ──────────────────────────── Users & auth ──────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("student"),
    phone: text("phone"),
    gradeId: integer("grade_id").references(() => grades.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    // brute-force protection for activation codes
    codeAttempts: integer("code_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), index("users_role_idx").on(t.role)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    deviceLabel: text("device_label"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]
);

/* ──────────────────────────── Curriculum ──────────────────────────── */

export const grades = pgTable("grades", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  stage: text("stage").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const modules = pgTable(
  "modules",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    gradeId: integer("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("modules_grade_idx").on(t.gradeId)]
);

export const lectures = pgTable(
  "lectures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary"),
    videoUrl: text("video_url"),
    pdfUrl: text("pdf_url"),
    durationMinutes: integer("duration_minutes"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lectures_module_idx").on(t.moduleId)]
);

export const lectureProgress = pgTable(
  "lecture_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lectureId: uuid("lecture_id")
      .notNull()
      .references(() => lectures.id, { onDelete: "cascade" }),
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lectureId] })]
);

/* ──────────────────────────── Subscriptions ──────────────────────────── */

export const activationCodes = pgTable(
  "activation_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codeHash: text("code_hash").notNull(),
    codeLast4: text("code_last4").notNull(),
    gradeId: integer("grade_id").references(() => grades.id, { onDelete: "set null" }),
    durationDays: integer("duration_days").notNull().default(30),
    status: codeStatusEnum("status").notNull().default("active"),
    note: text("note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    usedByUserId: uuid("used_by_user_id").references(() => users.id, { onDelete: "set null" }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("codes_hash_idx").on(t.codeHash), index("codes_status_idx").on(t.status)]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gradeId: integer("grade_id").references(() => grades.id, { onDelete: "set null" }),
    source: text("source").notNull().default("code"),
    codeId: uuid("code_id").references(() => activationCodes.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subs_user_idx").on(t.userId), index("subs_end_idx").on(t.endsAt)]
);

/* ──────────────────────────── Exams & assignments ──────────────────────────── */

export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  gradeId: integer("grade_id").references(() => grades.id, { onDelete: "set null" }),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull().default(45),
  maxAttempts: integer("max_attempts").notNull().default(1),
  allowReview: boolean("allow_review").notNull().default(true),
  opensAt: timestamp("opens_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id").references(() => exams.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull().default("mcq"),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<string[] | null>(),
    correctAnswer: text("correct_answer"),
    marks: integer("marks").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("questions_exam_idx").on(t.examId)]
);

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
    score: integer("score"),
    maxScore: integer("max_score"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    isGraded: boolean("is_graded").notNull().default(false),
  },
  (t) => [index("attempts_user_idx").on(t.userId), index("attempts_exam_idx").on(t.examId)]
);

export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  gradeId: integer("grade_id").references(() => grades.id, { onDelete: "set null" }),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body"),
    fileUrl: text("file_url"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    grade: integer("grade"),
    feedback: text("feedback"),
  },
  (t) => [uniqueIndex("submissions_unique").on(t.assignmentId, t.userId)]
);

/* ──────────────────────────── Messaging ──────────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)]
);

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_action_idx").on(t.action)]
);

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});

/* ──────────────────────────── Relations ──────────────────────────── */

export const usersRelations = relations(users, ({ one, many }) => ({
  grade: one(grades, { fields: [users.gradeId], references: [grades.id] }),
  sessions: many(sessions),
  subscriptions: many(subscriptions),
  attempts: many(examAttempts),
}));

export const gradesRelations = relations(grades, ({ many }) => ({
  modules: many(modules),
  users: many(users),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  grade: one(grades, { fields: [modules.gradeId], references: [grades.id] }),
  lectures: many(lectures),
}));

export const lecturesRelations = relations(lectures, ({ one }) => ({
  module: one(modules, { fields: [lectures.moduleId], references: [modules.id] }),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  exam: one(exams, { fields: [questions.examId], references: [exams.id] }),
}));

export const examAttemptsRelations = relations(examAttempts, ({ one }) => ({
  exam: one(exams, { fields: [examAttempts.examId], references: [exams.id] }),
  user: one(users, { fields: [examAttempts.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  grade: one(grades, { fields: [subscriptions.gradeId], references: [grades.id] }),
}));
