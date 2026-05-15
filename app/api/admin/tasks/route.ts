import { NextRequest, NextResponse } from "next/server";

import { ensureAdminRequest } from "@/lib/auth/guard";
import { ensureDatabaseReady } from "@/lib/db/init";
import { createTask } from "@/lib/db/queries";
import { jsonError, parseJsonWithSchema } from "@/lib/http";
import { createTaskSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonWithSchema(request, createTaskSchema);
  if (!parsed.success) {
    return jsonError("Invalid task payload.", 400);
  }

  await ensureDatabaseReady();
  const task = await createTask(parsed.data);
  return NextResponse.json({ task }, { status: 201 });
}

