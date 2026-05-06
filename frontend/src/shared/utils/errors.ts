type ErrorLike = {
  data?: unknown;
  message?: unknown;
};

export type FieldErrors = Record<string, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMessage(value: unknown): string {
  if (value == null) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeMessage(item))
      .filter(Boolean)
      .join(" ");
  }

  if (isRecord(value)) {
    return Object.values(value)
      .map((item) => normalizeMessage(item))
      .filter(Boolean)
      .join(" ");
  }

  return String(value).trim();
}

function asErrorLike(error: unknown): ErrorLike {
  return isRecord(error) ? error : {};
}

export function getFieldErrors(error: unknown): FieldErrors {
  const data = asErrorLike(error).data;
  if (!isRecord(data)) return {};

  return Object.fromEntries(
    Object.entries(data)
      .filter(
        ([key]) => !["detail", "message", "non_field_errors"].includes(key)
      )
      .map(([key, value]) => [key, normalizeMessage(value)])
      .filter(([, value]) => value)
  );
}

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong."
): string {
  const errorLike = asErrorLike(error);
  const data = isRecord(errorLike.data) ? errorLike.data : {};
  const fieldErrors = getFieldErrors(error);
  const message =
    normalizeMessage(data.detail) ||
    normalizeMessage(data.message) ||
    normalizeMessage(data.non_field_errors) ||
    normalizeMessage(errorLike.message);

  if (message && message !== "API request failed") return message;

  if (Object.keys(fieldErrors).length) {
    return "Some information needs attention before saving.";
  }

  return message || fallback;
}
