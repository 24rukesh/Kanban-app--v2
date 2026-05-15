import type { NextRequest } from "next/server";

import { requestIsAdmin } from "./session";

export async function ensureAdminRequest(request: NextRequest) {
  const isAdmin = await requestIsAdmin(request);
  if (!isAdmin) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

