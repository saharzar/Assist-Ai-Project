import { apiRequest, expectArrayResponse } from "./api";
import type { ApprovalStatus, User } from "./authService";

export type AdminUserStatusFilter = ApprovalStatus | "all";

export async function fetchAdminUsers(status: AdminUserStatusFilter) {
  const path = `/api/admin/users?status=${status}`;
  return expectArrayResponse<User>(await apiRequest<unknown>(path), path, ["users", "items", "data"]);
}

export function approveUser(userId: number) {
  return apiRequest<User>(`/api/admin/users/${userId}/approve`, {
    method: "POST",
  });
}

export function activateUser(userId: number) {
  return apiRequest<User>(`/api/admin/users/${userId}/activate`, {
    method: "POST",
  });
}

export function denyUser(userId: number, rejectionReason?: string) {
  return apiRequest<User>(`/api/admin/users/${userId}/deny`, {
    method: "POST",
    body: JSON.stringify({ rejection_reason: rejectionReason || null }),
  });
}

export function suspendUser(userId: number) {
  return apiRequest<User>(`/api/admin/users/${userId}/suspend`, {
    method: "POST",
  });
}
