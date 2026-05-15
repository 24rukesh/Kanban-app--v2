import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { db, sqlite } from "./client";
import { boardSettings, columns } from "./schema";

const tableSqlStatements = [
  `CREATE TABLE IF NOT EXISTS board_settings (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT 'Active Projects',
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    position INTEGER NOT NULL,
    color TEXT,
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    column_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    progress INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,
    project_url TEXT,
    repo_url TEXT,
    cover_image TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    agent_id TEXT,
    external_ref TEXT,
    updated_by TEXT NOT NULL DEFAULT 'admin',
    is_visible INTEGER NOT NULL DEFAULT 1,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES columns (id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS tasks_column_position_idx
    ON tasks (column_id, position);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS tasks_external_ref_uidx
    ON tasks (external_ref)
    WHERE external_ref IS NOT NULL AND external_ref != '';`,
];

const starterColumns = [
  { title: "Planning", color: "#93c5fd" },
  { title: "Building", color: "#fcd34d" },
  { title: "Testing", color: "#c4b5fd" },
  { title: "Live", color: "#6ee7b7" },
];

let initialized = false;
let initializingPromise: Promise<void> | null = null;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function applyInitialState() {
  for (const statement of tableSqlStatements) {
    sqlite.exec(statement);
  }

  // Backward-compatible additive migrations for existing SQLite files.
  const taskColumnInfo = sqlite
    .prepare("PRAGMA table_info(tasks);")
    .all() as Array<{ name: string }>;
  const taskColumns = new Set(taskColumnInfo.map((column) => column.name));
  if (!taskColumns.has("agent_id")) {
    sqlite.exec("ALTER TABLE tasks ADD COLUMN agent_id TEXT;");
  }
  if (!taskColumns.has("external_ref")) {
    sqlite.exec("ALTER TABLE tasks ADD COLUMN external_ref TEXT;");
  }
  if (!taskColumns.has("updated_by")) {
    sqlite.exec(
      "ALTER TABLE tasks ADD COLUMN updated_by TEXT NOT NULL DEFAULT 'admin';",
    );
  }
  sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS tasks_external_ref_uidx
    ON tasks (external_ref)
    WHERE external_ref IS NOT NULL AND external_ref != '';`);

  const existingSettings = await db
    .select()
    .from(boardSettings)
    .where(eq(boardSettings.id, "default"))
    .limit(1);
  if (existingSettings.length === 0) {
    await db.insert(boardSettings).values({
      id: "default",
      title: "Active Projects",
      description: "Current client and product builds in progress.",
      updatedAt: new Date().toISOString(),
    });
  }

  const existingColumns = await db.select().from(columns).limit(1);
  if (existingColumns.length === 0) {
    await db.insert(columns).values(
      starterColumns.map((column, index) => ({
        id: randomUUID(),
        title: column.title,
        slug: slugify(column.title),
        position: index,
        color: column.color,
        isVisible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    );
  }
}

export async function ensureDatabaseReady() {
  if (initialized) {
    return;
  }
  if (!initializingPromise) {
    initializingPromise = applyInitialState().then(() => {
      initialized = true;
    });
  }
  await initializingPromise;
}
