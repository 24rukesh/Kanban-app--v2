import { NextRequest, NextResponse } from "next/server";

import { requestIsAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const isAdmin = await requestIsAdmin(request);
  return NextResponse.json({ isAdmin });
}
