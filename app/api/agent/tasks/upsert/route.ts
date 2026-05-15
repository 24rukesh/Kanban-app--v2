import { NextRequest, NextResponse } from "next/server";

import { ensureAgentRequest } from "@/lib/auth/agent";
import { ensureDatabaseReady } from "@/lib/db/init";
import {
  createTask,
  getColumnBySlug,
  getTaskByExternalRef,
  updateTask,
} from "@/lib/db/queries";
import { jsonError, parseJsonWithSchema } from "@/lib/http";
import { agentTaskUpsertSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const defaultColumnSlug = "planning";

export async function POST(request: NextRequest) {
  const unauthorized = ensureAgentRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonWithSchema(request, agentTaskUpsertSchema);
  if (!parsed.success) {
    return jsonError("Invalid agent task payload.", 400);
  }

  await ensureDatabaseReady();

  const payload = parsed.data;
  const targetColumnSlug = payload.columnSlug ?? defaultColumnSlug;
  const targetColumn = await getColumnBySlug(targetColumnSlug);
  if (!targetColumn) {
    return jsonError(
      `Column slug "${targetColumnSlug}" was not found. Create it first or use an existing slug.`,
      400,
    );
  }

  const existingTask = await getTaskByExternalRef(payload.externalRef);
  if (existingTask) {
    const updatedTask = await updateTask(existingTask.id, {
      columnId: targetColumn.id,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      progress: payload.progress,
      projectUrl: payload.projectUrl,
      repoUrl: payload.repoUrl,
      coverImage: payload.coverImage,
      tags: payload.tags,
      agentId: payload.agentId,
      externalRef: payload.externalRef,
      updatedBy: "agent",
      isVisible: payload.isVisible,
    });

    if (!updatedTask) {
      return jsonError("Task not found for update.", 404);
    }
    return NextResponse.json({ created: false, task: updatedTask });
  }

  const createdTask = await createTask({
    columnId: targetColumn.id,
    title: payload.title,
    description: payload.description,
    priority: payload.priority,
    progress: payload.progress,
    projectUrl: payload.projectUrl,
    repoUrl: payload.repoUrl,
    coverImage: payload.coverImage,
    tags: payload.tags,
    agentId: payload.agentId,
    externalRef: payload.externalRef,
    updatedBy: "agent",
    isVisible: payload.isVisible ?? true,
  });

  return NextResponse.json({ created: true, task: createdTask }, { status: 201 });
}

