import { NextResponse } from "next/server";

import { ensureDatabaseReady } from "@/lib/db/init";
import { getBoardData } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureDatabaseReady();
  const board = await getBoardData({
    includeHidden: false,
    includeArchived: false,
  });
  return NextResponse.json(board, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

