import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const columns = sqliteTable("columns", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  position: integer("position").notNull(),
  color: text("color"),
  isVisible: integer("is_visible", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  columnId: text("column_id")
    .notNull()
    .references(() => columns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", {
    enum: ["low", "medium", "high", "critical"],
  })
    .notNull()
    .default("medium"),
  progress: integer("progress").notNull().default(0),
  position: integer("position").notNull(),
  projectUrl: text("project_url"),
  repoUrl: text("repo_url"),
  coverImage: text("cover_image"),
  tags: text("tags").notNull().default("[]"),
  agentId: text("agent_id"),
  externalRef: text("external_ref"),
  updatedBy: text("updated_by").notNull().default("admin"),
  isVisible: integer("is_visible", { mode: "boolean" })
    .notNull()
    .default(true),
  archivedAt: text("archived_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const boardSettings = sqliteTable("board_settings", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Active Projects"),
  description: text("description"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type ColumnRow = typeof columns.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type BoardSettingsRow = typeof boardSettings.$inferSelect;
