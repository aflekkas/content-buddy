import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "unauthorized"
  | "invalid_body"
  | "invalid_payload"
  | "invalid_path"
  | "invalid_format"
  | "bad_json"
  | "not_found"
  | "missing_key"
  | "missing_file"
  | "key_required"
  | "unknown_provider"
  | "unknown_model"
  | "wrong_prefix"
  | "invalid_key"
  | "invalid_key_format"
  | "rate_limited"
  | "insufficient_profile"
  | "generation_failed"
  | "empty_artifact"
  | "create_failed"
  | "update_failed"
  | "upload_failed"
  | "sign_failed"
  | "unsupported_type"
  | "file_too_large";

type ErrorExtras = Record<string, unknown> & { message?: string };

export function errorResponse(
  code: ApiErrorCode | string,
  status: number,
  extras?: ErrorExtras,
  init?: ResponseInit,
) {
  const body = extras ? { error: code, ...extras } : { error: code };
  return NextResponse.json(body, { status, ...init });
}

export function jsonResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export const unauthorized = (init?: ResponseInit) =>
  errorResponse("unauthorized", 401, undefined, init);

export const invalidBody = (extras?: ErrorExtras) =>
  errorResponse("invalid_body", 400, extras);

export const notFound = (init?: ResponseInit) =>
  errorResponse("not_found", 404, undefined, init);
