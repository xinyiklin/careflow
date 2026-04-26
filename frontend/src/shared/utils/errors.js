function normalizeMessage(value) {
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

  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => normalizeMessage(item))
      .filter(Boolean)
      .join(" ");
  }

  return String(value).trim();
}

export function getFieldErrors(error) {
  const data = error?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};

  return Object.fromEntries(
    Object.entries(data)
      .filter(
        ([key]) => !["detail", "message", "non_field_errors"].includes(key)
      )
      .map(([key, value]) => [key, normalizeMessage(value)])
      .filter(([, value]) => value)
  );
}

export function getErrorMessage(error, fallback = "Something went wrong.") {
  const fieldErrors = getFieldErrors(error);
  const message =
    normalizeMessage(error?.data?.detail) ||
    normalizeMessage(error?.data?.message) ||
    normalizeMessage(error?.data?.non_field_errors) ||
    normalizeMessage(error?.message);

  if (message && message !== "API request failed") return message;

  if (Object.keys(fieldErrors).length) {
    return "Some information needs attention before saving.";
  }

  return message || fallback;
}
