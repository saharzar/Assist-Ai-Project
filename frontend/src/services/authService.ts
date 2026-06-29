import { apiRequest } from "./api";

export type UserCategory = "personal" | "family_caregiver" | "institution" | "professional";

export type User = {
  id: number;
  email: string;
  full_name: string;
  user_category: UserCategory;
  preferred_language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  preferred_language: string;
  user_category: UserCategory;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export function registerUser(payload: RegisterPayload) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
}

export function loginUser(payload: LoginPayload) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
}

export function fetchCurrentUser() {
  return apiRequest<User>("/auth/me");
}
