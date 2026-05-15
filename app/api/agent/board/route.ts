import { NextRequest, NextResponse } from "next/server";

import { ensureAgentRequest } from "@/lib/auth/agent";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getBoardData } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = ensureAgentRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  await ensureDatabaseReady();
  const board = await getBoardData({
    includeHidden: true,
    includeArchived: false,
  });
  return NextResponse.json(board, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

