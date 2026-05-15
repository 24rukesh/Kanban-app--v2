import { NextRequest, NextResponse } from "next/server";

import { ensureAgentRequest } from "@/lib/auth/agent";
import { ensureDatabaseReady } from "@/lib/db/init";
import { archiveTask, getColumnBySlug, updateTask } from "@/lib/db/queries";
import { jsonError, parseJsonWithSchema } from "@/lib/http";
import { agentTaskPatchSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const unauthorized = ensureAgentRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonWithSchema(request, agentTaskPatchSchema);
  if (!parsed.success) {
    return jsonError("Invalid agent task patch payload.", 400);
  }

  await ensureDatabaseReady();
  const { id } = await context.params;

  let columnId: string | undefined;
  if (parsed.data.columnSlug) {
    const column = await getColumnBySlug(parsed.data.columnSlug);
    if (!column) {
      return jsonError(
        `Column slug "${parsed.data.columnSlug}" was not found.`,
        400,
      );
    }
    columnId = column.id;
  }

  const task = await updateTask(id, {
    columnId,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    progress: parsed.data.progress,
    projectUrl: parsed.data.projectUrl,
    repoUrl: parsed.data.repoUrl,
    coverImage: parsed.data.coverImage,
    tags: parsed.data.tags,
    isVisible: parsed.data.isVisible,
    updatedBy: "agent",
  });

  if (!task) {
    return jsonError("Task not found.", 404);
  }

  return NextResponse.json({ task });
}

export async function DELETE(request: NextRequest, context: Context) {
  const unauthorized = ensureAgentRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  await ensureDatabaseReady();
  const { id } = await context.params;
  const task = await archiveTask(id);
  if (!task) {
    return jsonError("Task not found.", 404);
  }

  return NextResponse.json({ archived: true, task });
}

