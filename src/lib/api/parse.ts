import type { NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import { errorResponse, invalidBody } from "./responses";

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
  opts: { errorCode?: string; includeDetails?: boolean } = {},
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: errorResponse("bad_json", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    if (opts.errorCode) {
      return {
        ok: false,
        response: errorResponse(
          opts.errorCode,
          400,
          opts.includeDetails ? { details: parsed.error.flatten() } : undefined,
        ),
      };
    }
    return { ok: false, response: invalidBody() };
  }
  return { ok: true, data: parsed.data };
}
