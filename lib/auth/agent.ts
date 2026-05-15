import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

function getExpectedAgentApiKey() {
  const apiKey = process.env.AGENT_API_KEY;
  if (!apiKey || apiKey.trim().length < 16) {
    return null;
  }
  return apiKey.trim();
}

function readSuppliedAgentApiKey(request: NextRequest) {
  const directHeader = request.headers.get("x-agent-api-key")?.trim();
  if (directHeader) {
    return directHeader;
  }
  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearerPrefix = "Bearer ";
  if (authorization.startsWith(bearerPrefix)) {
    return authorization.slice(bearerPrefix.length).trim();
  }
  return "";
}

export function requestHasValidAgentKey(request: NextRequest) {
  const expected = getExpectedAgentApiKey();
  const supplied = readSuppliedAgentApiKey(request);
  if (!expected || !supplied) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function ensureAgentRequest(request: NextRequest) {
  if (!requestHasValidAgentKey(request)) {
    return Response.json(
      {
        error:
          "Unauthorized. Provide a valid x-agent-api-key or Bearer token.",
      },
      { status: 401 },
    );
  }
  return null;
}

