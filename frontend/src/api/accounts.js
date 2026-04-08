import { apiRequest } from "./client";

export function login(credentials) {
  return apiRequest("/api/accounts/token/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function refreshToken(refresh) {
  return apiRequest("/api/accounts/token/refresh/", {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
}

export function registerUser(data) {
  return apiRequest("/api/accounts/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchMyProfile(token) {
  return apiRequest("/api/accounts/me/", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}