const LOCAL_API_BASE = "http://localhost:8000";
const PRODUCTION_APP_HOST = "careflow.xinyiklin.com";
const PRODUCTION_API_HOST = "api.careflow.xinyiklin.com";
const PRODUCTION_API_BASE = `https://${PRODUCTION_API_HOST}`;
export const API_PREFIX = "/v1";
let inMemoryAccessToken = null;

function normalizeApiBase(rawBase) {
  if (!rawBase) return rawBase;

  const trimmedBase = rawBase.replace(/\/+$/, "");
  return trimmedBase.endsWith(API_PREFIX)
    ? trimmedBase.slice(0, -API_PREFIX.length)
    : trimmedBase;
}

function resolveApiBase() {
  if (import.meta.env.VITE_API_URL) {
    return normalizeApiBase(import.meta.env.VITE_API_URL);
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    if (hostname === PRODUCTION_APP_HOST) {
      return PRODUCTION_API_BASE;
    }

    if (hostname === PRODUCTION_API_HOST) {
      return normalizeApiBase(`${protocol}//${hostname}`);
    }
  }

  return normalizeApiBase(
    import.meta.env.DEV ? LOCAL_API_BASE : PRODUCTION_API_BASE
  );
}

const API_BASE = resolveApiBase();

function getStoredAccessToken() {
  return inMemoryAccessToken;
}

function clearLegacyStoredTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

function setStoredTokens({ access }) {
  if (access) {
    inMemoryAccessToken = access;
  }
  clearLegacyStoredTokens();
}

function clearStoredTokens() {
  inMemoryAccessToken = null;
  clearLegacyStoredTokens();
}

export function setAuthTokens({ access = null, refresh = null } = {}) {
  if (access === null && refresh === null) {
    clearStoredTokens();
    return;
  }

  setStoredTokens({ access, refresh });
}

async function requestNewAccessToken() {
  const response = await fetch(
    `${API_BASE}${API_PREFIX}/users/token/refresh/`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    clearStoredTokens();
    throw new Error("Session expired. Please sign in again.");
  }

  const data = await response.json();
  setStoredTokens({ access: data.access });

  return data.access;
}

function buildUrl(path, params = {}) {
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const pathWithPrefix =
    normalizedPath.startsWith(`${API_PREFIX}/`) || normalizedPath === API_PREFIX
      ? normalizedPath
      : `${API_PREFIX}${normalizedPath}`;
  const url = new URL(`${API_BASE}${pathWithPrefix}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export async function apiRequest(path, options = {}, retry = true) {
  const { params, headers: customHeaders = {}, ...restOptions } = options;

  const url = buildUrl(path, params);
  const accessToken = getStoredAccessToken();
  const isFormData =
    typeof FormData !== "undefined" && restOptions.body instanceof FormData;

  const response = await fetch(url, {
    ...restOptions,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
      window.dispatchEvent(new Event("auth:logout"));
      throw error;
    }
  }

  if (!response.ok) {
    let errorData = null;
    let errorMessage = "API request failed";

    try {
      errorData = await response.json();
      errorMessage =
        errorData?.detail ||
        errorData?.message ||
        response.statusText ||
        errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function apiBlobRequest(path, options = {}, retry = true) {
  const { params, headers: customHeaders = {}, ...restOptions } = options;
  const url = buildUrl(path, params);
  const accessToken = getStoredAccessToken();

  const response = await fetch(url, {
    ...restOptions,
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
      window.dispatchEvent(new Event("auth:logout"));
      throw error;
    }
  }

  if (!response.ok) {
    let errorMessage = response.statusText || "API request failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData?.detail || errorData?.message || errorMessage;
    } catch {
      // Binary endpoints may not return JSON on failure.
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get("Content-Disposition") || "",
    contentType: response.headers.get("Content-Type") || "",
  };
}

export function logoutUser() {
  clearStoredTokens();
  fetch(`${API_BASE}${API_PREFIX}/users/logout/`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
  window.dispatchEvent(new Event("auth:logout"));
}

export default API_BASE;
