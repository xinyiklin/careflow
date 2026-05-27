import { ApiError } from "../api/types";

const FALLBACK_MESSAGE = "Something went wrong.";

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.message) {
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === "string" && err.trim()) {
    return err;
  }
  return FALLBACK_MESSAGE;
}
