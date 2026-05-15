"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import {
  Eye,
  EyeOff,
  GripVertical,
  LogOut,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import {
  buildColumnReorderPayload,
  buildTaskReorderPayload,
  normalizeColumnPositions,
  normalizeTaskPositions,
} from "@/lib/kanban/ordering";
import type { KanbanBoard, KanbanColumn, KanbanTask, Priority } from "@/lib/kanban/types";

type KanbanAppProps = {
  initialBoard: KanbanBoard;
  initialAdmin: boolean;
  mode: "public" | "admin";
};

const priorityTone: Record<Priority, string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-900",
  high: "bg-orange-100 text-orange-900",
  critical: "bg-rose-100 text-rose-900",
};

const COLUMN_PREFIX = "column::";
const TASK_PREFIX = "task::";

function columnDragId(columnId: string) {
  return `${COLUMN_PREFIX}${columnId}`;
}

function taskDragId(taskId: string) {
  return `${TASK_PREFIX}${taskId}`;
}

function parseDragId(value: string): { type: "column" | "task"; id: string } | null {
  if (value.startsWith(COLUMN_PREFIX)) {
    return { type: "column", id: value.slice(COLUMN_PREFIX.length) };
  }
  if (value.startsWith(TASK_PREFIX)) {
    return { type: "task", id: value.slice(TASK_PREFIX.length) };
  }
  return null;
}

function findColumnByTaskId(columns: KanbanColumn[], taskId: string) {
  return columns.find((column) => column.tasks.some((task) => task.id === taskId));
}

function replaceTask(
  columns: KanbanColumn[],
  taskId: string,
  updater: (task: KanbanTask) => KanbanTask,
) {
  return columns.map((column) => ({
    ...column,
    tasks: column.tasks.map((task) =>
      task.id === taskId ? updater(task) : task,
    ),
  }));
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      typeof body?.error === "string" ? body.error : "Request failed.";
    throw new Error(errorMessage);
  }
  return body as T;
}

export function KanbanApp({ initialBoard, initialAdmin, mode }: KanbanAppProps) {
  const [columns, setColumns] = useState(initialBoard.columns);
  const [settings] = useState(initialBoard.settings);
  const [isAdmin, setIsAdmin] = useState(initialAdmin);
  const [unlockKey, setUnlockKey] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const columnIds = useMemo(
    () => columns.map((column) => columnDragId(column.id)),
    [columns],
  );

  function showStatus(message: string) {
    setStatusMessage(message);
    setErrorMessage("");
  }

  function showError(message: string) {
    setErrorMessage(message);
    setStatusMessage("");
  }

  async function handleUnlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUnlocking(true);
    setErrorMessage("");
    try {
      await requestJson<{ isAdmin: boolean }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ key: unlockKey }),
      });
      setIsAdmin(true);
      window.location.reload();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to unlock admin mode.");
    } finally {
      setIsUnlocking(false);
    }
  }

  async function handleLogout() {
    try {
      await requestJson<{ isAdmin: boolean }>("/api/admin/logout", {
        method: "POST",
      });
      setIsAdmin(false);
      window.location.reload();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to log out.");
    }
  }

  async function addColumn() {
    const title = window.prompt("Column name");
    if (!title) {
      return;
    }
    const color = window.prompt("Column accent color (hex)", "#dbeafe") ?? "#dbeafe";
    try {
      const response = await requestJson<{ column: KanbanColumn }>(
        "/api/admin/columns",
        {
          method: "POST",
          body: JSON.stringify({ title, color, isVisible: true }),
        },
      );
      setColumns((previous) =>
        normalizeColumnPositions([...previous, { ...response.column, tasks: [] }]),
      );
      showStatus("Column created.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not create column.");
    }
  }

  async function renameColumn(column: KanbanColumn) {
    const title = window.prompt("Rename column", column.title);
    if (!title) {
      return;
    }
    try {
      const response = await requestJson<{ column: KanbanColumn }>(
        `/api/admin/columns/${column.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ title }),
        },
      );
      setColumns((previous) =>
        previous.map((item) =>
          item.id === column.id ? { ...item, ...response.column } : item,
        ),
      );
      showStatus("Column renamed.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not rename column.");
    }
  }

  async function toggleColumnVisibility(column: KanbanColumn) {
    const nextVisibility = !column.isVisible;
    const previous = columns;
    setColumns((current) =>
      current.map((item) =>
        item.id === column.id ? { ...item, isVisible: nextVisibility } : item,
      ),
    );
    try {
      await requestJson<{ column: KanbanColumn }>(`/api/admin/columns/${column.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isVisible: nextVisibility }),
      });
      showStatus("Column visibility updated.");
    } catch (error) {
      setColumns(previous);
      showError(error instanceof Error ? error.message : "Could not update visibility.");
    }
  }

  async function removeColumn(column: KanbanColumn) {
    const confirmed = window.confirm(
      `Delete "${column.title}" and all tasks inside it?`,
    );
    if (!confirmed) {
      return;
    }
    const previous = columns;
    setColumns((current) => current.filter((item) => item.id !== column.id));
    try {
      await requestJson<{ deleted: boolean }>(`/api/admin/columns/${column.id}`, {
        method: "DELETE",
      });
      showStatus("Column deleted.");
    } catch (error) {
      setColumns(previous);
      showError(error instanceof Error ? error.message : "Could not delete column.");
    }
  }

  async function addTask(column: KanbanColumn) {
    const title = window.prompt("Task title");
    if (!title) {
      return;
    }
    const description = window.prompt("Task description", "") ?? "";
    const priorityPrompt =
      (window.prompt(
        "Priority (low | medium | high | critical)",
        "medium",
      ) ?? "medium") as Priority;
    const progressPrompt = Number(window.prompt("Progress 0-100", "0") ?? "0");
    const tagsPrompt = window.prompt("Comma-separated tags", "") ?? "";
    const projectUrl = window.prompt("Project URL", "") ?? "";
    const repoUrl = window.prompt("Repo URL", "") ?? "";

    const payload = {
      columnId: column.id,
      title,
      description,
      priority: priorityPrompt,
      progress: Number.isNaN(progressPrompt) ? 0 : progressPrompt,
      tags: tagsPrompt
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      projectUrl,
      repoUrl,
      isVisible: true,
    };

    try {
      const response = await requestJson<{ task: KanbanTask }>("/api/admin/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setColumns((current) =>
        current.map((item) =>
          item.id === column.id
            ? { ...item, tasks: normalizeTaskPositions([...item.tasks, response.task]) }
            : item,
        ),
      );
      showStatus("Task created.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not create task.");
    }
  }

  async function patchTask(task: KanbanTask, patch: Partial<KanbanTask>) {
    const previous = columns;
    const next = replaceTask(columns, task.id, (item) => ({ ...item, ...patch }));
    setColumns(next);
    try {
      await requestJson<{ task: KanbanTask }>(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    } catch (error) {
      setColumns(previous);
      showError(error instanceof Error ? error.message : "Could not update task.");
    }
  }

  async function editTask(task: KanbanTask) {
    const title = window.prompt("Task title", task.title);
    if (!title) {
      return;
    }
    const description = window.prompt("Description", task.description) ?? "";
    const projectUrl = window.prompt("Project URL", task.projectUrl) ?? "";
    const repoUrl = window.prompt("Repo URL", task.repoUrl) ?? "";
    const tagsPrompt = window.prompt("Comma-separated tags", task.tags.join(", ")) ?? "";
    const payload = {
      title,
      description,
      projectUrl,
      repoUrl,
      tags: tagsPrompt
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    };

    const previous = columns;
    setColumns((current) =>
      replaceTask(current, task.id, (item) => ({ ...item, ...payload })),
    );
    try {
      await requestJson<{ task: KanbanTask }>(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      showStatus("Task updated.");
    } catch (error) {
      setColumns(previous);
      showError(error instanceof Error ? error.message : "Could not update task.");
    }
  }

  async function archiveTaskById(task: KanbanTask) {
    const confirmed = window.confirm(`Archive "${task.title}"?`);
    if (!confirmed) {
      return;
    }
    const previous = columns;
    setColumns((current) =>
      current.map((column) => ({
        ...column,
        tasks: column.tasks.filter((item) => item.id !== task.id),
      })),
    );
    try {
      await requestJson<{ archived: boolean }>(`/api/admin/tasks/${task.id}`, {
        method: "DELETE",
      });
      showStatus("Task archived.");
    } catch (error) {
      setColumns(previous);
      showError(error instanceof Error ? error.message : "Could not archive task.");
    }
  }

  async function persistColumnOrder(nextColumns: KanbanColumn[], fallback: KanbanColumn[]) {
    try {
      await requestJson<{ reordered: boolean }>("/api/admin/columns/reorder", {
        method: "PATCH",
        body: JSON.stringify(buildColumnReorderPayload(nextColumns)),
      });
      showStatus("Column order saved.");
    } catch (error) {
      setColumns(fallback);
      showError(error instanceof Error ? error.message : "Could not save column order.");
    }
  }

  async function persistTaskOrder(nextColumns: KanbanColumn[], fallback: KanbanColumn[]) {
    try {
      await requestJson<{ reordered: boolean }>("/api/admin/tasks/reorder", {
        method: "PATCH",
        body: JSON.stringify(buildTaskReorderPayload(nextColumns)),
      });
      showStatus("Task order saved.");
    } catch (error) {
      setColumns(fallback);
      showError(error instanceof Error ? error.message : "Could not save task order.");
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (!isAdmin || !event.over) {
      return;
    }

    const activeMeta = parseDragId(String(event.active.id));
    const overMeta = parseDragId(String(event.over.id));
    if (!activeMeta || !overMeta || activeMeta.type !== "task") {
      return;
    }

    const activeColumn = findColumnByTaskId(columns, activeMeta.id);
    if (!activeColumn) {
      return;
    }

    const overColumn =
      overMeta.type === "column"
        ? columns.find((column) => column.id === overMeta.id)
        : findColumnByTaskId(columns, overMeta.id);
    if (!overColumn || activeColumn.id === overColumn.id) {
      return;
    }

    setColumns((current) => {
      const next = current.map((column) => ({
        ...column,
        tasks: [...column.tasks],
      }));

      const sourceColumn = next.find((column) => column.id === activeColumn.id);
      const targetColumn = next.find((column) => column.id === overColumn.id);
      if (!sourceColumn || !targetColumn) {
        return current;
      }

      const sourceTaskIndex = sourceColumn.tasks.findIndex(
        (task) => task.id === activeMeta.id,
      );
      if (sourceTaskIndex < 0) {
        return current;
      }

      const [moved] = sourceColumn.tasks.splice(sourceTaskIndex, 1);
      moved.columnId = targetColumn.id;

      const targetIndex =
        overMeta.type === "task"
          ? targetColumn.tasks.findIndex((task) => task.id === overMeta.id)
          : targetColumn.tasks.length;
      const insertIndex = targetIndex < 0 ? targetColumn.tasks.length : targetIndex;
      targetColumn.tasks.splice(insertIndex, 0, moved);

      for (const column of next) {
        column.tasks = normalizeTaskPositions(
          column.tasks.map((task) => ({ ...task, columnId: column.id })),
        );
      }
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!isAdmin || !event.over) {
      return;
    }

    const activeMeta = parseDragId(String(event.active.id));
    const overMeta = parseDragId(String(event.over.id));
    if (!activeMeta || !overMeta) {
      return;
    }

    if (activeMeta.type === "column" && overMeta.type === "column") {
      if (activeMeta.id === overMeta.id) {
        return;
      }
      const previous = columns;
      const oldIndex = columns.findIndex((column) => column.id === activeMeta.id);
      const newIndex = columns.findIndex((column) => column.id === overMeta.id);
      if (oldIndex < 0 || newIndex < 0) {
        return;
      }
      const next = normalizeColumnPositions(arrayMove(columns, oldIndex, newIndex));
      setColumns(next);
      void persistColumnOrder(next, previous);
      return;
    }

    if (activeMeta.type === "task") {
      const previous = columns;
      const activeColumn = findColumnByTaskId(columns, activeMeta.id);
      if (!activeColumn) {
        return;
      }
      const overColumn =
        overMeta.type === "column"
          ? columns.find((column) => column.id === overMeta.id)
          : findColumnByTaskId(columns, overMeta.id);
      if (!overColumn) {
        return;
      }

      let next = columns.map((column) => ({
        ...column,
        tasks: [...column.tasks],
      }));

      if (activeColumn.id === overColumn.id && overMeta.type === "task") {
        const column = next.find((item) => item.id === activeColumn.id);
        if (!column) {
          return;
        }
        const fromIndex = column.tasks.findIndex((task) => task.id === activeMeta.id);
        const toIndex = column.tasks.findIndex((task) => task.id === overMeta.id);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
          return;
        }
        column.tasks = normalizeTaskPositions(arrayMove(column.tasks, fromIndex, toIndex));
      } else {
        next = normalizeColumnPositions(next);
      }

      setColumns(next);
      void persistTaskOrder(next, previous);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--kanban-bg)] text-[var(--kanban-text)]">
      <main className="flex w-full flex-col px-4 py-8 sm:px-6 lg:px-10">
        <header className="mb-6 flex flex-col gap-4 border-b border-[var(--kanban-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--kanban-muted)]">
              Rukesh Dasari / Portfolio Kanban
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{settings.title}</h1>
            <p className="max-w-2xl text-sm text-[var(--kanban-muted)]">
              {settings.description || "Current projects and live builds in motion."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mode === "public" && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--kanban-border)] px-4 py-2 text-sm font-medium text-[var(--kanban-text)] transition hover:bg-[var(--kanban-surface)]"
              >
                <ShieldCheck className="size-4" />
                Admin Mode
              </Link>
            )}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={addColumn}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--kanban-accent)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-95"
                >
                  <Plus className="size-4" />
                  Add Column
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--kanban-border)] px-4 py-2 text-sm font-medium text-[var(--kanban-text)] transition hover:bg-[var(--kanban-surface)]"
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </>
            )}
          </div>
        </header>

        {mode === "admin" && !isAdmin && (
          <section className="mb-6 rounded-[var(--kanban-radius)] border border-[var(--kanban-border)] bg-[var(--kanban-surface)] p-5 shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-[var(--kanban-accent)]" />
              Unlock Admin Mode
            </div>
            <p className="mb-4 text-sm text-[var(--kanban-muted)]">
              Enter the admin key from your server environment to enable editing.
            </p>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleUnlockSubmit}>
              <input
                type="password"
                value={unlockKey}
                onChange={(event) => setUnlockKey(event.target.value)}
                placeholder="Admin access key"
                className="h-11 flex-1 rounded-full border border-[var(--kanban-border)] bg-white px-4 text-sm text-[var(--kanban-text)] outline-none ring-[var(--kanban-accent)] transition focus:ring-2"
              />
              <button
                type="submit"
                disabled={isUnlocking}
                className="h-11 rounded-full bg-[var(--kanban-accent)] px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUnlocking ? "Unlocking..." : "Unlock"}
              </button>
            </form>
          </section>
        )}

        {statusMessage && (
          <p className="mb-4 rounded-[var(--kanban-radius)] border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {statusMessage}
          </p>
        )}
        {errorMessage && (
          <p className="mb-4 rounded-[var(--kanban-radius)] border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
            {errorMessage}
          </p>
        )}

        <section className="overflow-x-auto pb-6">
          {isAdmin ? (
            <DndContext
              sensors={sensors}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columnIds}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:min-w-max sm:items-start">
                  {columns.map((column) => (
                    <SortableColumn
                      key={column.id}
                      column={column}
                      isAdmin={isAdmin}
                      onAddTask={addTask}
                      onRename={renameColumn}
                      onRemove={removeColumn}
                      onToggleVisibility={toggleColumnVisibility}
                      onEditTask={editTask}
                      onPatchTask={patchTask}
                      onArchiveTask={archiveTaskById}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:min-w-max sm:items-start">
              {columns.map((column) => (
                <StaticColumn key={column.id} column={column} />
              ))}
            </div>
          )}
        </section>

        <footer className="mt-2 flex flex-col items-start justify-between gap-3 border-t border-[var(--kanban-border)] pt-6 text-sm text-[var(--kanban-muted)] sm:flex-row sm:items-center">
          <p>Built for public transparency with private admin control.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://rukesh.in"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--kanban-text)] underline-offset-4 hover:underline"
            >
              View Portfolio
            </a>
            <a
              href="https://rukesh.in/contact"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--kanban-text)] underline-offset-4 hover:underline"
            >
              Book a Strategy Call
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

type SortableColumnProps = {
  column: KanbanColumn;
  isAdmin: boolean;
  onAddTask: (column: KanbanColumn) => void;
  onRename: (column: KanbanColumn) => void;
  onRemove: (column: KanbanColumn) => void;
  onToggleVisibility: (column: KanbanColumn) => void;
  onEditTask: (task: KanbanTask) => void;
  onPatchTask: (task: KanbanTask, patch: Partial<KanbanTask>) => Promise<void>;
  onArchiveTask: (task: KanbanTask) => void;
};

function SortableColumn({
  column,
  isAdmin,
  onAddTask,
  onRename,
  onRemove,
  onToggleVisibility,
  onEditTask,
  onPatchTask,
  onArchiveTask,
}: SortableColumnProps) {
  const dragId = columnDragId(column.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dragId });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={clsx(
        "w-full sm:w-[320px] shrink-0 rounded-[var(--kanban-radius)] border border-[var(--kanban-border)] bg-[var(--kanban-surface)] p-4 shadow-[0_6px_20px_rgba(15,23,42,0.05)]",
        isDragging && "opacity-80",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full p-1 text-[var(--kanban-muted)] hover:bg-slate-100"
            title="Drag column"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: column.color || "#bfdbfe" }}
          />
          <h2 className="text-sm font-semibold">{column.title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAddTask(column)}
            title="Add task"
            className="rounded-full p-1.5 text-[var(--kanban-muted)] transition hover:bg-slate-100 hover:text-[var(--kanban-text)]"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onRename(column)}
            title="Rename column"
            className="rounded-full p-1.5 text-[var(--kanban-muted)] transition hover:bg-slate-100 hover:text-[var(--kanban-text)]"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleVisibility(column)}
            title={column.isVisible ? "Hide column" : "Show column"}
            className="rounded-full p-1.5 text-[var(--kanban-muted)] transition hover:bg-slate-100 hover:text-[var(--kanban-text)]"
          >
            {column.isVisible ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onRemove(column)}
            title="Delete column"
            className="rounded-full p-1.5 text-rose-500 transition hover:bg-rose-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      <SortableContext
        items={column.tasks.map((task) => taskDragId(task.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {column.tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              onEditTask={onEditTask}
              onPatchTask={onPatchTask}
              onArchiveTask={onArchiveTask}
            />
          ))}
          {column.tasks.length === 0 && (
            <div className="rounded-[var(--kanban-radius)] border border-dashed border-[var(--kanban-border)] px-3 py-4 text-center text-sm text-[var(--kanban-muted)]">
              Drag tasks here or add a new card.
            </div>
          )}
        </div>
      </SortableContext>
    </article>
  );
}

function StaticColumn({ column }: { column: KanbanColumn }) {
  return (
    <article className="w-full sm:w-[320px] shrink-0 rounded-[var(--kanban-radius)] border border-[var(--kanban-border)] bg-[var(--kanban-surface)] p-4 shadow-[0_6px_20px_rgba(15,23,42,0.05)]">
      <header className="mb-3 flex items-center gap-2">
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: column.color || "#bfdbfe" }}
        />
        <h2 className="text-sm font-semibold">{column.title}</h2>
      </header>
      <div className="space-y-3">
        {column.tasks.length > 0 ? (
          column.tasks.map((task) => <TaskCard key={task.id} task={task} isAdmin={false} />)
        ) : (
          <div className="rounded-[var(--kanban-radius)] border border-dashed border-[var(--kanban-border)] px-3 py-4 text-center text-sm text-[var(--kanban-muted)]">
            No visible tasks yet.
          </div>
        )}
      </div>
    </article>
  );
}

type SortableTaskCardProps = {
  task: KanbanTask;
  isAdmin: boolean;
  onEditTask: (task: KanbanTask) => void;
  onPatchTask: (task: KanbanTask, patch: Partial<KanbanTask>) => Promise<void>;
  onArchiveTask: (task: KanbanTask) => void;
};

function SortableTaskCard({
  task,
  isAdmin,
  onEditTask,
  onPatchTask,
  onArchiveTask,
}: SortableTaskCardProps) {
  const dragId = taskDragId(task.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dragId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={clsx(isDragging && "opacity-75")}
    >
      <TaskCard
        task={task}
        isAdmin={isAdmin}
        dragAttributes={attributes}
        dragListeners={listeners}
        onEditTask={onEditTask}
        onPatchTask={onPatchTask}
        onArchiveTask={onArchiveTask}
      />
    </div>
  );
}

type TaskCardProps = {
  task: KanbanTask;
  isAdmin: boolean;
  dragAttributes?: object;
  dragListeners?: object;
  onEditTask?: (task: KanbanTask) => void;
  onPatchTask?: (task: KanbanTask, patch: Partial<KanbanTask>) => Promise<void>;
  onArchiveTask?: (task: KanbanTask) => void;
};

function TaskCard({
  task,
  isAdmin,
  dragAttributes,
  dragListeners,
  onEditTask,
  onPatchTask,
  onArchiveTask,
}: TaskCardProps) {
  return (
    <article className="rounded-[var(--kanban-radius)] border border-[var(--kanban-border)] bg-white p-3 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={clsx(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
            priorityTone[task.priority],
          )}
        >
          {task.priority}
        </span>
        {isAdmin && (
          <button
            type="button"
            className="rounded-full p-1 text-[var(--kanban-muted)] hover:bg-slate-100"
            title="Drag task"
            {...(dragAttributes ?? {})}
            {...(dragListeners ?? {})}
          >
            <GripVertical className="size-4" />
          </button>
        )}
      </div>

      <h3 className="mb-1 text-sm font-semibold leading-5">{task.title}</h3>
      {task.description && (
        <p className="mb-2 text-sm leading-5 text-[var(--kanban-muted)]">{task.description}</p>
      )}

      {task.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {task.tags.map((tag) => (
            <span
              key={`${task.id}-${tag}`}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-[var(--kanban-muted)]">
        <span>Progress</span>
        <span>{task.progress}%</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[var(--kanban-accent)]"
          style={{ width: `${task.progress}%` }}
        />
      </div>

      {(task.projectUrl || task.repoUrl) && (
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          {task.projectUrl && (
            <a
              href={task.projectUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--kanban-text)] underline-offset-4 hover:underline"
            >
              View Project
            </a>
          )}
          {task.repoUrl && (
            <a
              href={task.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--kanban-text)] underline-offset-4 hover:underline"
            >
              View Repo
            </a>
          )}
        </div>
      )}

      {(task.externalRef || task.agentId) && (
        <div className="mb-3 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
          {task.externalRef && <span>ref: {task.externalRef}</span>}
          {task.externalRef && task.agentId && <span> · </span>}
          {task.agentId && <span>agent: {task.agentId}</span>}
        </div>
      )}

      {isAdmin && onPatchTask && onEditTask && onArchiveTask && (
        <div className="grid grid-cols-2 gap-2 border-t border-[var(--kanban-border)] pt-3">
          <select
            className="h-9 rounded-lg border border-[var(--kanban-border)] bg-white px-2 text-xs font-medium capitalize outline-none ring-[var(--kanban-accent)] transition focus:ring-2"
            value={task.priority}
            onChange={(event) =>
              void onPatchTask(task, { priority: event.target.value as Priority })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            type="number"
            min={0}
            max={100}
            value={task.progress}
            onChange={(event) =>
              void onPatchTask(task, {
                progress: Number(event.target.value),
              })
            }
            className="h-9 rounded-lg border border-[var(--kanban-border)] px-2 text-xs outline-none ring-[var(--kanban-accent)] transition focus:ring-2"
          />
          <button
            type="button"
            className="h-9 rounded-lg border border-[var(--kanban-border)] text-xs font-semibold transition hover:bg-slate-50"
            onClick={() => onEditTask(task)}
          >
            Edit
          </button>
          <button
            type="button"
            className="h-9 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            onClick={() => onArchiveTask(task)}
          >
            Archive
          </button>
          <label className="col-span-2 flex items-center gap-2 text-xs text-[var(--kanban-muted)]">
            <input
              type="checkbox"
              checked={task.isVisible}
              onChange={(event) =>
                void onPatchTask(task, { isVisible: event.target.checked })
              }
              className="size-3.5 rounded border-[var(--kanban-border)]"
            />
            Visible on public board
          </label>
        </div>
      )}
    </article>
  );
}
