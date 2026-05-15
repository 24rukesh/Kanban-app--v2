import { NextRequest, NextResponse } from "next/server";

import { ensureAdminRequest } from "@/lib/auth/guard";
import { ensureDatabaseReady } from "@/lib/db/init";
import { archiveTask, updateTask } from "@/lib/db/queries";
import { jsonError, parseJsonWithSchema } from "@/lib/http";
import { updateTaskSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const unauthorized = await ensureAdminRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonWithSchema(request, updateTaskSchema);
  if (!parsed.success) {
    return jsonError("Invalid task update payload.", 400);
  }

  const { id } = await context.params;
  await ensureDatabaseReady();
  const task = await updateTask(id, parsed.data);
  if (!task) {
    return jsonError("Task not found.", 404);
  }

  return NextResponse.json({ task });
}

export async function DELETE(request: NextRequest, context: Context) {
  const unauthorized = await ensureAdminRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  await ensureDatabaseReady();
  const task = await archiveTask(id);
  if (!task) {
    return jsonError("Task not found.", 404);
  }

  return NextResponse.json({ archived: true, task });
}

