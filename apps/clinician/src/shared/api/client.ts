import { ApiError } from "./types";

import type {
  ApiBlobResponse,
  ApiErrorData,
  ApiHeaders,
  ApiParamValue,
  ApiParams,
  ApiRequestOptions,
} from "./types";

const LOCAL_API_BASE = "http://localhost:8000";
const PRODUCTION_APP_HOST = "careflow.xinyiklin.com";
const PRODUCTION_API_HOST = "api.careflow.xinyiklin.com";
const PRODUCTION_API_BASE = `https://${PRODUCTION_API_HOST}`;
export const API_PREFIX = "/v1";

let inMemoryAccessToken: string | null = null;
let inMemoryCsrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;

type AuthTokens = {
  access?: string | null;
  refresh?: string | null;
};

function normalizeApiBase(rawBase: string | undefined): string | undefined {
  if (!rawBase) return rawBase;

  const trimmedBase = rawBase.replace(/\/+$/, "");
  return trimmedBase.endsWith(API_PREFIX)
    ? trimmedBase.slice(0, -API_PREFIX.length)
    : trimmedBase;
}

function resolveApiBase(): string {
  if (import.meta.env.VITE_API_URL) {
    return normalizeApiBase(import.meta.env.VITE_API_URL) ?? "";
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    if (hostname === PRODUCTION_APP_HOST) {
      return PRODUCTION_API_BASE;
    }

    if (hostname === PRODUCTION_API_HOST) {
      return normalizeApiBase(`${protocol}//${hostname}`) ?? "";
    }
  }

  return (
    normalizeApiBase(
      import.meta.env.DEV ? LOCAL_API_BASE : PRODUCTION_API_BASE
    ) ?? ""
  );
}

const API_BASE = resolveApiBase();

function getStoredAccessToken(): string | null {
  return inMemoryAccessToken;
}

function clearLegacyStoredTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

function setStoredTokens({ access }: AuthTokens) {
  if (access) {
    inMemoryAccessToken = access;
  }
  clearLegacyStoredTokens();
}

function clearStoredTokens() {
  inMemoryAccessToken = null;
  clearLegacyStoredTokens();
}

export function setAuthTokens({
  access = null,
  refresh = null,
}: AuthTokens = {}) {
  if (access === null && refresh === null) {
    clearStoredTokens();
    return;
  }

  setStoredTokens({ access, refresh });
}

function isUnsafeMethod(method = "GET") {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase());
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  return (
    document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.slice(name.length + 1) || ""
  );
}

function readErrorData(value: unknown): ApiErrorData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function pickErrorMessage(data: ApiErrorData, fallback: string) {
  const detail = data?.detail;
  const message = data?.message;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallback;
}

async function ensureCsrfToken(): Promise<string> {
  if (inMemoryCsrfToken) {
    return inMemoryCsrfToken;
  }

  const existingCookieToken = decodeURIComponent(getCookie("csrftoken"));
  if (existingCookieToken) {
    inMemoryCsrfToken = existingCookieToken;
    return inMemoryCsrfToken;
  }

  if (!csrfTokenRequest) {
    csrfTokenRequest = fetch(`${API_BASE}${API_PREFIX}/users/csrf/`, {
      method: "GET",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to initialize CSRF protection.");
        }

        const data = readErrorData(await response.json());
        const cookieToken = decodeURIComponent(getCookie("csrftoken"));
        const csrfToken =
          typeof data?.csrfToken === "string" ? data.csrfToken : cookieToken;
        inMemoryCsrfToken = csrfToken;

        if (!inMemoryCsrfToken) {
          throw new Error("CSRF token was not returned.");
        }

        return inMemoryCsrfToken;
      })
      .finally(() => {
        csrfTokenRequest = null;
      });
  }

  return csrfTokenRequest;
}

async function buildCsrfHeaders(
  method: string,
  customHeaders: ApiHeaders = {}
): Promise<ApiHeaders> {
  if (!isUnsafeMethod(method) || customHeaders["X-CSRFToken"]) {
    return {};
  }

  return { "X-CSRFToken": await ensureCsrfToken() };
}

async function requestNewAccessToken(): Promise<string> {
  const csrfHeaders = await buildCsrfHeaders("POST");
  const response = await fetch(
    `${API_BASE}${API_PREFIX}/users/token/refresh/`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...csrfHeaders,
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    clearStoredTokens();
    throw new Error("Session expired. Please sign in again.");
  }

  const data = readErrorData(await response.json());
  const access = typeof data?.access === "string" ? data.access : "";
  setStoredTokens({ access });

  return access;
}

export async function restoreAuthSession() {
  return requestNewAccessToken();
}

function appendParams(url: URL, params: ApiParams = {}) {
  Object.entries(params).forEach(([key, value]: [string, ApiParamValue]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
}

function buildUrl(path: string, params: ApiParams = {}) {
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    appendParams(url, params);
    return url.toString();
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const pathWithPrefix =
    normalizedPath.startsWith(`${API_PREFIX}/`) || normalizedPath === API_PREFIX
      ? normalizedPath
      : `${API_PREFIX}${normalizedPath}`;
  const url = new URL(`${API_BASE}${pathWithPrefix}`);

  appendParams(url, params);

  return url.toString();
}

function emitAuthLogout() {
  window.dispatchEvent(new Event("auth:logout"));
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
  retry = true
): Promise<T | null> {
  const {
    params,
    headers: customHeaders = {},
    includeFacilityId: _includeFacilityId,
    ...restOptions
  } = options;

  const url = buildUrl(path, params);
  const accessToken = getStoredAccessToken();
  const isFormData =
    typeof FormData !== "undefined" && restOptions.body instanceof FormData;
  const method = restOptions.method || "GET";
  const csrfHeaders = await buildCsrfHeaders(method, customHeaders);

  const response = await fetch(url, {
    ...restOptions,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...csrfHeaders,
      ...customHeaders,
    },
  });

  if (response.status === 401 && retry) {
    try {
      const newAccessToken = await requestNewAccessToken();

      return apiRequest(
        path,
        {
          ...restOptions,
          params,
          headers: {
            ...customHeaders,
            Authorization: `Bearer ${newAccessToken}`,
          },
        },
        false
      );
    } catch (error) {
      clearStoredTokens();
      emitAuthLogout();
      throw error;
    }
  }

  if (!response.ok) {
    let errorData: ApiErrorData = null;
    let errorMessage = "API request failed";

    try {
      errorData = readErrorData(await response.json());
      errorMessage = pickErrorMessage(
        errorData,
        response.statusText || errorMessage
      );
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiError(errorMessage, response.status, errorData);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json() as Promise<T>;
}

export async function apiBlobRequest(
  path: string,
  options: ApiRequestOptions = {},
  retry = true
): Promise<ApiBlobResponse> {
  const {
    params,
    headers: customHeaders = {},
    includeFacilityId: _includeFacilityId,
    ...restOptions
  } = options;
  const url = buildUrl(path, params);
  const accessToken = getStoredAccessToken();
  const method = restOptions.method || "GET";
  const csrfHeaders = await buildCsrfHeaders(method, customHeaders);

  const response = await fetch(url, {
    ...restOptions,
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...csrfHeaders,
      ...customHeaders,
    },
  });

  if (response.status === 401 && retry) {
    try {
      const newAccessToken = await requestNewAccessToken();
      return apiBlobRequest(
        path,
        {
          ...restOptions,
          params,
          headers: {
            ...customHeaders,
            Authorization: `Bearer ${newAccessToken}`,
          },
        },
        false
      );
    } catch (error) {
      clearStoredTokens();
      emitAuthLogout();
      throw error;
    }
  }

  if (!response.ok) {
    let errorMessage = response.statusText || "API request failed";
    try {
      const errorData = readErrorData(await response.json());
      errorMessage = pickErrorMessage(errorData, errorMessage);
    } catch {
      // Binary endpoints may not return JSON on failure.
    }
    throw new ApiError(errorMessage, response.status);
  }

  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get("Content-Disposition") || "",
    contentType: response.headers.get("Content-Type") || "",
  };
}

export function logoutUser() {
  clearStoredTokens();
  ensureCsrfToken()
    .then((csrfToken) =>
      fetch(`${API_BASE}${API_PREFIX}/users/logout/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": csrfToken },
      })
    )
    .catch(() => {});
  emitAuthLogout();
}

export default API_BASE;
