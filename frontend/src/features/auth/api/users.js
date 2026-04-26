import { apiRequest } from "../../../shared/api/client";

export function login(credentials) {
  return apiRequest("/users/token/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function demoLogin() {
  return apiRequest("/users/demo-login/", {
    method: "POST",
  });
}

export function refreshToken() {
  return apiRequest("/users/token/refresh/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function registerUser(data) {
  return apiRequest("/users/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchUserProfile() {
  return apiRequest("/users/me/");
}

export function updateUserPreferences(preferences) {
  return apiRequest("/users/me/preferences/", {
    method: "PATCH",
    body: JSON.stringify({ preferences }),
  });
}
