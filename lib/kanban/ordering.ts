import type { KanbanColumn } from "./types";

export function normalizeColumnPositions(columns: KanbanColumn[]): KanbanColumn[] {
  return columns.map((column, index) => ({
    ...column,
    position: index,
    tasks: normalizeTaskPositions(column.tasks).map((task) => ({
      ...task,
      columnId: column.id,
    })),
  }));
}

export function normalizeTaskPositions<T extends { position: number }>(
  tasks: T[],
): T[] {
  return tasks.map((task, index) => ({ ...task, position: index }));
}

export function buildColumnReorderPayload(columns: KanbanColumn[]) {
  return {
    columns: columns.map((column, index) => ({
      id: column.id,
      position: index,
    })),
  };
}

export function buildTaskReorderPayload(columns: KanbanColumn[]) {
  return {
    tasks: columns.flatMap((column) =>
      column.tasks.map((task, index) => ({
        id: task.id,
        columnId: column.id,
        position: index,
      })),
    ),
  };
}

