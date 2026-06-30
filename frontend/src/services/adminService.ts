import { apiRequest } from "./api";
import type { ApprovalStatus, User } from "./authService";

export type AdminUserStatusFilter = ApprovalStatus | "all";

export function fetchAdminUsers(status: AdminUserStatusFilter) {
  return apiRequest<User[]>(`/admin/users?status=${status}`);
}

export function approveUser(userId: number) {
  return apiRequest<User>(`/admin/users/${userId}/approve`, {
    method: "POST",
  });
}

export function denyUser(userId: number, rejectionReason?: string) {
  return apiRequest<User>(`/admin/users/${userId}/deny`, {
    method: "POST",
    body: JSON.stringify({ rejection_reason: rejectionReason || null }),
  });
}

export function suspendUser(userId: number) {
  return apiRequest<User>(`/admin/users/${userId}/suspend`, {
    method: "POST",
  });
}
