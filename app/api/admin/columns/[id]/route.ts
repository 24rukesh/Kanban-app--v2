import { NextRequest, NextResponse } from "next/server";

import { ensureAdminRequest } from "@/lib/auth/guard";
import { ensureDatabaseReady } from "@/lib/db/init";
import { deleteColumn, updateColumn } from "@/lib/db/queries";
import { jsonError, parseJsonWithSchema } from "@/lib/http";
import { updateColumnSchema } from "@/lib/validation";

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

  const parsed = await parseJsonWithSchema(request, updateColumnSchema);
  if (!parsed.success) {
    return jsonError("Invalid column update payload.", 400);
  }

  const { id } = await context.params;
  await ensureDatabaseReady();
  const column = await updateColumn(id, parsed.data);
  if (!column) {
    return jsonError("Column not found.", 404);
  }

  return NextResponse.json({ column });
}

export async function DELETE(request: NextRequest, context: Context) {
  const unauthorized = await ensureAdminRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  await ensureDatabaseReady();
  const deleted = await deleteColumn(id);
  if (!deleted) {
    return jsonError("Column not found.", 404);
  }

  return NextResponse.json({ deleted: true });
}

