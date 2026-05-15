import { NextResponse } from "next/server";

import { clearAdminSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ isAdmin: false });
  clearAdminSessionCookie(response);
  return response;
}

