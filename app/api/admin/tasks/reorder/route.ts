import { NextRequest, NextResponse } from "next/server";

import { ensureAdminRequest } from "@/lib/auth/guard";
import { ensureDatabaseReady } from "@/lib/db/init";
import { reorderTasks } from "@/lib/db/queries";
import { jsonError, parseJsonWithSchema } from "@/lib/http";
import { reorderTasksSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const unauthorized = await ensureAdminRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonWithSchema(request, reorderTasksSchema);
  if (!parsed.success) {
    return jsonError("Invalid task reorder payload.", 400);
  }

  await ensureDatabaseReady();
  await reorderTasks(parsed.data.tasks);
  return NextResponse.json({ reordered: true });
}

