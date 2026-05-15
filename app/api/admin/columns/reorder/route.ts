import { NextRequest, NextResponse } from "next/server";

import { ensureAdminRequest } from "@/lib/auth/guard";
import { ensureDatabaseReady } from "@/lib/db/init";
import { reorderColumns } from "@/lib/db/queries";
import { jsonError, parseJsonWithSchema } from "@/lib/http";
import { reorderColumnsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const unauthorized = await ensureAdminRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonWithSchema(request, reorderColumnsSchema);
  if (!parsed.success) {
    return jsonError("Invalid column reorder payload.", 400);
  }

  await ensureDatabaseReady();
  await reorderColumns(parsed.data.columns);
  return NextResponse.json({ reordered: true });
}

