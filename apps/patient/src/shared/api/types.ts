/**
 * Compile-time guard that every field a hand-written portal response type reads
 * still exists (under the same name) in the backend's OpenAPI-generated schema.
 *
 * Usage: `type _Assert = AssertSchemaKeys<Schema, keyof HandWritten>`.
 *
 * This is intentionally a *key-coverage* check, not a structural equality check.
 * The portal types are deliberately more permissive than the generated schema
 * (extra `| null`, mutable vs `readonly`, full nested objects where the schema
 * exposes PK lists), so a bidirectional `extends` assertion would fail on those
 * benign differences. Key-coverage instead flags the drift that actually breaks
 * the portal at runtime — a backend field being renamed or removed — while
 * tolerating a stale `generated.ts` (which is gitignored and not yet rebuilt in
 * CI). If this errors, a field the portal depends on is gone from the schema.
 */
export type AssertSchemaKeys<Schema, Keys extends keyof Schema> = Keys;

export type ApiParamValue = string | number | boolean | null | undefined;

export type ApiParams = Record<string, ApiParamValue>;

export type EntityId = string | number;

export type ApiPayload = Record<string, unknown>;

export type ApiHeaders = Record<string, string>;

export type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  params?: ApiParams;
  headers?: ApiHeaders;
};

export type ApiErrorData = Record<string, unknown> | null;

export class ApiError extends Error {
  status: number;
  data: ApiErrorData;

  constructor(message: string, status: number, data: ApiErrorData = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type ApiBlobResponse = {
  blob: Blob;
  contentDisposition: string;
  contentType: string;
};
