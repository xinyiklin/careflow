const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getStoredAccessToken() {
  return localStorage.getItem("accessToken");
}

function getStoredRefreshToken() {
  return localStorage.getItem("refreshToken");
}

function setStoredTokens({ access, refresh }) {
  if (access) localStorage.setItem("accessToken", access);
  if (refresh) localStorage.setItem("refreshToken", refresh);
}

function clearStoredTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

async function requestNewAccessToken() {
  const refresh = getStoredRefreshToken();

  if (!refresh) {
    throw new Error("No refresh token available.");
  }

  const response = await fetch(`${API_BASE}/api/accounts/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearStoredTokens();
    throw new Error("Session expired. Please sign in again.");
  }

  const data = await response.json();
  setStoredTokens({ access: data.access });

  return data.access;
}

export function getAuthHeaders(token) {
  const accessToken = token || getStoredAccessToken();

  if (!accessToken) return {};

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function apiRequest(path, options = {}, retry = true) {
  const authHeaders = getAuthHeaders();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && retry) {
    try {
      const newAccessToken = await requestNewAccessToken();

      return apiRequest(
        path,
        {
          ...options,
          headers: {
            ...(options.headers || {}),
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

export function logoutUser() {
  clearStoredTokens();
  window.dispatchEvent(new Event("auth:logout"));
}

export default API_BASE;
