import { apiRequest } from "./api";

export type UserCategory = "personal" | "family_caregiver" | "institution" | "professional";
export type UserRole = "user" | "admin";
export type ApprovalStatus = "pending" | "approved" | "denied";

export type User = {
  id: number;
  email: string;
  full_name: string;
  user_category: UserCategory;
  preferred_language: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  approved_by: number | null;
  approved_at: string | null;
  denied_at: string | null;
  rejection_reason: string | null;
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
  user_category: UserCategory;
};

export type RegisterResponse = {
  message: string;
  approval_status: ApprovalStatus;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export function registerUser(payload: RegisterPayload) {
  return apiRequest<RegisterResponse>("/auth/register", {
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
