import { describe, expect, it } from "vitest";

import {
  buildTaskReorderPayload,
  normalizeColumnPositions,
} from "./ordering";
import type { KanbanColumn } from "./types";

const sampleColumns: KanbanColumn[] = [
  {
    id: "col-a",
    title: "Planning",
    slug: "planning",
    position: 0,
    color: "#000000",
    isVisible: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    tasks: [
      {
        id: "task-1",
        columnId: "col-a",
        title: "Task 1",
        description: "",
        priority: "medium",
        progress: 0,
        position: 0,
        projectUrl: "",
        repoUrl: "",
        coverImage: "",
        tags: [],
        agentId: "",
        externalRef: "",
        updatedBy: "admin",
        isVisible: true,
        archivedAt: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      {
        id: "task-2",
        columnId: "col-a",
        title: "Task 2",
        description: "",
        priority: "high",
        progress: 0,
        position: 1,
        projectUrl: "",
        repoUrl: "",
        coverImage: "",
        tags: [],
        agentId: "",
        externalRef: "",
        updatedBy: "admin",
        isVisible: true,
        archivedAt: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    ],
  },
  {
    id: "col-b",
    title: "Live",
    slug: "live",
    position: 1,
    color: "#ffffff",
    isVisible: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    tasks: [],
  },
];

describe("kanban ordering", () => {
  it("normalizes column and task positions", () => {
    const moved = normalizeColumnPositions([
      sampleColumns[1],
      sampleColumns[0],
    ]);

    expect(moved[0].position).toBe(0);
    expect(moved[1].position).toBe(1);
    expect(moved[1].tasks[0].position).toBe(0);
    expect(moved[1].tasks[1].position).toBe(1);
    expect(moved[1].tasks[0].columnId).toBe("col-a");
  });

  it("builds reorder payload for cross-column task changes", () => {
    const next = normalizeColumnPositions([
      {
        ...sampleColumns[0],
        tasks: [sampleColumns[0].tasks[1]],
      },
      {
        ...sampleColumns[1],
        tasks: [{ ...sampleColumns[0].tasks[0], columnId: "col-b" }],
      },
    ]);
    const payload = buildTaskReorderPayload(next);

    expect(payload.tasks).toEqual([
      {
        id: "task-2",
        columnId: "col-a",
        position: 0,
      },
      {
        id: "task-1",
        columnId: "col-b",
        position: 0,
      },
    ]);
  });
});
