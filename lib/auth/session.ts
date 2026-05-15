import { timingSafeEqual } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "portfolio_kanban_admin";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

function readSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length < 16) {
    return null;
  }
  return secret;
}

function getAdminAccessKey() {
  const key = process.env.ADMIN_ACCESS_KEY;
  if (!key || key.trim().length < 5) {
    throw new Error(
      "ADMIN_ACCESS_KEY is missing or too short. Use at least 5 characters.",
    );
  }
  return key;
}

function getSecretKey() {
  const secret = readSessionSecret();
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken() {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Use at least 16 characters.",
    );
  }

  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_LIFETIME_SECONDS}s`)
    .sign(secretKey);
}

export async function isValidAdminSession(token?: string | null) {
  const secretKey = getSecretKey();
  if (!token) {
    return false;
  }
  if (!secretKey) {
    return false;
  }

  try {
    const verified = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    return verified.payload.role === "admin";
  } catch {
    return false;
  }
}

export function applyAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_LIFETIME_SECONDS,
    path: "/",
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function requestIsAdmin(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export function verifyAdminKey(candidate: string) {
  const normalizedCandidate = candidate.trim();
  const expected = getAdminAccessKey().trim();
  const candidateBuffer = Buffer.from(normalizedCandidate);
  const expectedBuffer = Buffer.from(expected);

  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateBuffer, expectedBuffer);
}
