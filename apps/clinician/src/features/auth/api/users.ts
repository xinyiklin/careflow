import { apiRequest } from "../../../shared/api/client";

import type { ApiPayload } from "../../../shared/api/types";
import type {
  UserPreferences,
  UserProfile,
} from "../../../shared/types/domain";

export type LoginCredentials = {
  username: string;
  password: string;
};

export type AuthTokenResponse = {
  access?: string | null;
  refresh?: string | null;
  user?: UserProfile | null;
};

export type UserPreferencesResponse = {
  preferences?: Partial<UserPreferences> | null;
};

export function login(credentials: LoginCredentials) {
  return apiRequest<AuthTokenResponse>("/users/token/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function demoLogin() {
  return apiRequest<AuthTokenResponse>("/users/demo-login/", {
    method: "POST",
  });
}

export function refreshToken() {
  return apiRequest<AuthTokenResponse>("/users/token/refresh/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function registerUser(data: ApiPayload) {
  return apiRequest("/users/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchUserProfile() {
  return apiRequest<UserProfile>("/users/me/");
}

export function updateUserPreferences(
  preferences: Partial<UserPreferences> | ApiPayload
) {
  return apiRequest<UserPreferencesResponse>("/users/me/preferences/", {
    method: "PATCH",
    body: JSON.stringify({ preferences }),
  });
}
