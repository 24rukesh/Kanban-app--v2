import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  applyAdminSessionCookie,
  createAdminSessionToken,
  verifyAdminKey,
} from "@/lib/auth/session";
import { jsonError, parseJsonWithSchema } from "@/lib/http";
import { adminLoginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown-ip";
  const userAgent = request.headers.get("user-agent") || "unknown-agent";
  return `${ip}:${userAgent}`;
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(getClientKey(request), {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
        },
      },
    );
  }

  const parsed = await parseJsonWithSchema(request, adminLoginSchema);
  if (!parsed.success) {
    return jsonError("Invalid login payload.", 400);
  }

  try {
    const isValid = verifyAdminKey(parsed.data.key);
    if (!isValid) {
      return jsonError("Invalid admin key.", 401);
    }

    const token = await createAdminSessionToken();
    const response = NextResponse.json({ isAdmin: true });
    applyAdminSessionCookie(response, token);
    return response;
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Server configuration is invalid.",
      500,
    );
  }
}
