import { ApiError } from "./types";

import type {
  ApiErrorData,
  ApiHeaders,
  ApiParamValue,
  ApiParams,
  ApiRequestOptions,
} from "./types";

const LOCAL_API_BASE = "http://localhost:8000";
const PRODUCTION_APP_HOST = "patient.xinyiklin.com";
const PRODUCTION_API_HOST = "api.careflow.xinyiklin.com";
const PRODUCTION_API_BASE = `https://${PRODUCTION_API_HOST}`;
export const API_PREFIX = "/v1";
const LOGOUT_PENDING_KEY = "careflow:patient-logout-pending";

// Access token lives in memory only; refresh is an HttpOnly cookie set by the backend. Nothing token-y is persisted in localStorage.
let inMemoryAccessToken: string | null = null;
let inMemoryCsrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;
let accessTokenRefreshRequest: Promise<string> | null = null;

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

function isLogoutPending() {
  try {
    return window.localStorage.getItem(LOGOUT_PENDING_KEY) === "true";
  } catch {
    return false;
  }
}

function setLogoutPending(isPending: boolean) {
  try {
    if (isPending) {
      window.localStorage.setItem(LOGOUT_PENDING_KEY, "true");
    } else {
      window.localStorage.removeItem(LOGOUT_PENDING_KEY);
    }
  } catch {
    // In-memory token clearing still signs out the current page.
  }
}

function setStoredTokens({ access }: AuthTokens) {
  if (access) {
    inMemoryAccessToken = access;
    setLogoutPending(false);
  }
}

function clearStoredTokens() {
  inMemoryAccessToken = null;
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

async function performTokenRefresh(): Promise<string> {
  const csrfHeaders = await buildCsrfHeaders("POST");
  const response = await fetch(
    `${API_BASE}${API_PREFIX}/portal/auth/refresh/`,
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

// De-duplicate concurrent refreshes: when several requests 401 at once we must
// only POST to /portal/auth/refresh/ once. With rotating refresh tokens,
// parallel refreshes race and all but the first fail on the now-blacklisted
// token, which would wrongly log the patient out mid-session.
async function requestNewAccessToken(): Promise<string> {
  if (!accessTokenRefreshRequest) {
    accessTokenRefreshRequest = performTokenRefresh().finally(() => {
      accessTokenRefreshRequest = null;
    });
  }

  return accessTokenRefreshRequest;
}

export async function restoreAuthSession() {
  if (isLogoutPending()) {
    throw new Error("Signed out locally while server logout is pending.");
  }
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
  const { params, headers: customHeaders = {}, ...restOptions } = options;

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

export function logoutUser() {
  clearStoredTokens();
  setLogoutPending(true);
  const logoutRequest = ensureCsrfToken()
    .then((csrfToken) =>
      fetch(`${API_BASE}${API_PREFIX}/portal/auth/logout/`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "X-CSRFToken": csrfToken },
      })
    )
    .then((response) => {
      if (response.ok) setLogoutPending(false);
    })
    .catch(() => {
      // Keep the marker so a reload cannot restore the unrevoked cookie.
    });
  emitAuthLogout();
  return logoutRequest;
}

export default API_BASE;
