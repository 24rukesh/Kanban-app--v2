import { randomUUID } from "node:crypto";

import { and, asc, eq, isNull, max } from "drizzle-orm";

import type { KanbanBoard, KanbanColumn, KanbanTask, Priority } from "@/lib/kanban/types";

import { db } from "./client";
import { boardSettings, columns, tasks } from "./schema";

type CreateColumnInput = {
  title: string;
  color?: string;
  isVisible?: boolean;
};

type UpdateColumnInput = {
  title?: string;
  color?: string;
  isVisible?: boolean;
};

type CreateTaskInput = {
  columnId: string;
  title: string;
  description?: string;
  priority?: Priority;
  progress?: number;
  projectUrl?: string;
  repoUrl?: string;
  coverImage?: string;
  tags?: string[];
  agentId?: string;
  externalRef?: string;
  updatedBy?: string;
  isVisible?: boolean;
};

type UpdateTaskInput = {
  title?: string;
  description?: string;
  priority?: Priority;
  progress?: number;
  projectUrl?: string;
  repoUrl?: string;
  coverImage?: string;
  tags?: string[];
  agentId?: string;
  externalRef?: string;
  updatedBy?: string;
  isVisible?: boolean;
  columnId?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function taskRowToTask(task: typeof tasks.$inferSelect): KanbanTask {
  return {
    id: task.id,
    columnId: task.columnId,
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    progress: task.progress,
    position: task.position,
    projectUrl: task.projectUrl ?? "",
    repoUrl: task.repoUrl ?? "",
    coverImage: task.coverImage ?? "",
    tags: parseTags(task.tags),
    agentId: task.agentId ?? "",
    externalRef: task.externalRef ?? "",
    updatedBy: task.updatedBy,
    isVisible: task.isVisible,
    archivedAt: task.archivedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function columnRowToColumn(column: typeof columns.$inferSelect): KanbanColumn {
  return {
    id: column.id,
    title: column.title,
    slug: column.slug,
    position: column.position,
    color: column.color ?? "",
    isVisible: column.isVisible,
    createdAt: column.createdAt,
    updatedAt: column.updatedAt,
    tasks: [],
  };
}

export async function getBoardData(options?: {
  includeHidden?: boolean;
  includeArchived?: boolean;
}): Promise<KanbanBoard> {
  const includeHidden = options?.includeHidden ?? false;
  const includeArchived = options?.includeArchived ?? false;

  const settingsRows = await db
    .select()
    .from(boardSettings)
    .where(eq(boardSettings.id, "default"))
    .limit(1);
  const settings = settingsRows[0] ?? {
    id: "default",
    title: "Active Projects",
    description: "Current client and product builds in progress.",
    updatedAt: nowIso(),
  };

  const columnRows = includeHidden
    ? await db.select().from(columns).orderBy(asc(columns.position), asc(columns.title))
    : await db
        .select()
        .from(columns)
        .where(eq(columns.isVisible, true))
        .orderBy(asc(columns.position), asc(columns.title));

  let taskRows: typeof tasks.$inferSelect[] = [];
  if (includeHidden && includeArchived) {
    taskRows = await db
      .select()
      .from(tasks)
      .orderBy(asc(tasks.position), asc(tasks.createdAt));
  } else if (includeHidden && !includeArchived) {
    taskRows = await db
      .select()
      .from(tasks)
      .where(isNull(tasks.archivedAt))
      .orderBy(asc(tasks.position), asc(tasks.createdAt));
  } else {
    taskRows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.isVisible, true), isNull(tasks.archivedAt)))
      .orderBy(asc(tasks.position), asc(tasks.createdAt));
  }

  const columnsById = new Map<string, KanbanColumn>();
  for (const column of columnRows) {
    columnsById.set(column.id, columnRowToColumn(column));
  }

  for (const task of taskRows) {
    const column = columnsById.get(task.columnId);
    if (!column) {
      continue;
    }
    column.tasks.push(taskRowToTask(task));
  }

  const sortedColumns = [...columnsById.values()].sort(
    (left, right) => left.position - right.position,
  );
  for (const column of sortedColumns) {
    column.tasks = [...column.tasks].sort(
      (left, right) => left.position - right.position,
    );
  }

  return {
    settings: {
      title: settings.title,
      description: settings.description ?? "",
    },
    columns: sortedColumns,
  };
}

export async function createColumn(input: CreateColumnInput) {
  const [positionResult] = await db
    .select({ value: max(columns.position) })
    .from(columns);

  const title = input.title.trim();
  const baseSlug = slugify(title) || "column";
  const id = randomUUID();
  const position = (positionResult.value ?? -1) + 1;
  const timestamp = Date.now();

  const record = {
    id,
    title,
    slug: `${baseSlug}-${timestamp}`,
    position,
    color: input.color?.trim() || "#dbeafe",
    isVisible: input.isVisible ?? true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await db.insert(columns).values(record);
  return columnRowToColumn({ ...record, color: record.color ?? "" });
}

export async function updateColumn(id: string, input: UpdateColumnInput) {
  const updates: Partial<typeof columns.$inferInsert> = {
    updatedAt: nowIso(),
  };

  if (typeof input.title === "string") {
    const title = input.title.trim();
    updates.title = title;
    updates.slug = `${slugify(title) || "column"}-${Date.now()}`;
  }
  if (typeof input.color === "string") {
    updates.color = input.color.trim();
  }
  if (typeof input.isVisible === "boolean") {
    updates.isVisible = input.isVisible;
  }

  const [updated] = await db
    .update(columns)
    .set(updates)
    .where(eq(columns.id, id))
    .returning();

  return updated ? columnRowToColumn(updated) : null;
}

export async function deleteColumn(id: string) {
  const deleted = await db.delete(columns).where(eq(columns.id, id)).returning();
  return deleted.length > 0;
}

export async function reorderColumns(
  updates: { id: string; position: number }[],
) {
  const updatedAt = nowIso();
  for (const update of updates) {
    await db
      .update(columns)
      .set({ position: update.position, updatedAt })
      .where(eq(columns.id, update.id));
  }
}

export async function createTask(input: CreateTaskInput) {
  const [positionResult] = await db
    .select({ value: max(tasks.position) })
    .from(tasks)
    .where(eq(tasks.columnId, input.columnId));

  const record = {
    id: randomUUID(),
    columnId: input.columnId,
    title: input.title.trim(),
    description: input.description?.trim() || "",
    priority: input.priority ?? ("medium" satisfies Priority),
    progress: input.progress ?? 0,
    position: (positionResult.value ?? -1) + 1,
    projectUrl: input.projectUrl?.trim() || "",
    repoUrl: input.repoUrl?.trim() || "",
    coverImage: input.coverImage?.trim() || "",
    tags: JSON.stringify(input.tags ?? []),
    agentId: input.agentId?.trim() || "",
    externalRef: input.externalRef?.trim() || "",
    updatedBy: input.updatedBy?.trim() || "admin",
    isVisible: input.isVisible ?? true,
    archivedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await db.insert(tasks).values(record);
  return taskRowToTask(record);
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const updates: Partial<typeof tasks.$inferInsert> = {
    updatedAt: nowIso(),
  };

  if (typeof input.columnId === "string") {
    updates.columnId = input.columnId;
  }
  if (typeof input.title === "string") {
    updates.title = input.title.trim();
  }
  if (typeof input.description === "string") {
    updates.description = input.description.trim();
  }
  if (typeof input.priority === "string") {
    updates.priority = input.priority;
  }
  if (typeof input.progress === "number") {
    updates.progress = input.progress;
  }
  if (typeof input.projectUrl === "string") {
    updates.projectUrl = input.projectUrl.trim();
  }
  if (typeof input.repoUrl === "string") {
    updates.repoUrl = input.repoUrl.trim();
  }
  if (typeof input.coverImage === "string") {
    updates.coverImage = input.coverImage.trim();
  }
  if (Array.isArray(input.tags)) {
    updates.tags = JSON.stringify(input.tags);
  }
  if (typeof input.agentId === "string") {
    updates.agentId = input.agentId.trim();
  }
  if (typeof input.externalRef === "string") {
    updates.externalRef = input.externalRef.trim();
  }
  if (typeof input.updatedBy === "string") {
    updates.updatedBy = input.updatedBy.trim() || "admin";
  }
  if (typeof input.isVisible === "boolean") {
    updates.isVisible = input.isVisible;
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning();
  return updated ? taskRowToTask(updated) : null;
}

export async function archiveTask(id: string) {
  const [updated] = await db
    .update(tasks)
    .set({
      isVisible: false,
      archivedAt: nowIso(),
      updatedAt: nowIso(),
    })
    .where(eq(tasks.id, id))
    .returning();
  return updated ? taskRowToTask(updated) : null;
}

export async function reorderTasks(updates: {
  id: string;
  columnId: string;
  position: number;
}[]) {
  const updatedAt = nowIso();
  for (const update of updates) {
    await db
      .update(tasks)
      .set({
        columnId: update.columnId,
        position: update.position,
        updatedAt,
      })
      .where(eq(tasks.id, update.id));
  }
}

export async function getColumnBySlug(slug: string) {
  const [column] = await db
    .select()
    .from(columns)
    .where(eq(columns.slug, slug))
    .limit(1);
  return column ?? null;
}

export async function getTaskByExternalRef(externalRef: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.externalRef, externalRef))
    .limit(1);
  return task ? taskRowToTask(task) : null;
}
