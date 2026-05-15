import { NextRequest, NextResponse } from "next/server";

import { ensureAdminRequest } from "@/lib/auth/guard";
import { ensureDatabaseReady } from "@/lib/db/init";
import { createColumn } from "@/lib/db/queries";
import { jsonError, parseJsonWithSchema } from "@/lib/http";
import { createColumnSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = await parseJsonWithSchema(request, createColumnSchema);
  if (!parsed.success) {
    return jsonError("Invalid column payload.", 400);
  }

  await ensureDatabaseReady();
  const column = await createColumn(parsed.data);
  return NextResponse.json({ column }, { status: 201 });
}

