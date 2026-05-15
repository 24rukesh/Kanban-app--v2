import { describe, expect, it } from "vitest";

import {
  agentTaskUpsertSchema,
  createTaskSchema,
  updateTaskSchema,
} from "./validation";

describe("task validation", () => {
  it("rejects progress values above 100", () => {
    const parsed = createTaskSchema.safeParse({
      columnId: "col-1",
      title: "Bad task",
      progress: 120,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts valid priority updates", () => {
    const parsed = updateTaskSchema.safeParse({
      priority: "critical",
      progress: 80,
    });

    expect(parsed.success).toBe(true);
  });

  it("requires externalRef for agent upsert", () => {
    const parsed = agentTaskUpsertSchema.safeParse({
      title: "Agent task",
      columnSlug: "building",
    });

    expect(parsed.success).toBe(false);
  });
});
