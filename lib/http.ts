import { ZodSchema } from "zod";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function parseJsonWithSchema<TSchema extends ZodSchema>(
  request: Request,
  schema: TSchema,
) {
  try {
    const payload = await request.json();
    return schema.safeParse(payload);
  } catch {
    return schema.safeParse(undefined);
  }
}
