import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import {
  activateUser,
  approveUser,
  denyUser,
  fetchAdminUsers,
  suspendUser,
  type AdminUserStatusFilter,
} from "../../services/adminService";
import type { User } from "../../services/authService";

const filters: AdminUserStatusFilter[] = ["pending", "approved", "denied", "suspended", "all"];
const categoryLabelKeys = {
  personal: "personalUser",
  family_caregiver: "familyCaregiver",
  institution: "institution",
  professional: "professional",
} as const;
const statusLabelKeys = {
  pending: "pending",
  approved: "approved",
  denied: "denied",
  suspended: "suspended",
} as const;

export function AdminUsersPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>("pending");
  const [users, setUsers] = useState<User[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
  const [userToDeny, setUserToDeny] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = isAuthenticated && user?.role === "admin";

  const loadUsers = async (status: AdminUserStatusFilter, clearSuccess = true) => {
    setIsLoading(true);
    setErrorMessage("");
    if (clearSuccess) {
      setSuccessMessage("");
    }
    try {
      setUsers(await fetchAdminUsers(status));
    } catch {
      setErrorMessage(t("authFormError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadUsers(statusFilter);
    }
  }, [isAdmin, statusFilter]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-6 font-semibold text-amber-900">
        {t("accessDenied")}
      </section>
    );
  }

  const handleApprove = async (targetUser: User) => {
    await approveUser(targetUser.id);
    await loadUsers(statusFilter, false);
    setSuccessMessage(t("userApprovedEmailProcessed"));
  };

  const handleActivate = async (targetUser: User) => {
    await activateUser(targetUser.id);
    await loadUsers(statusFilter, false);
    setSuccessMessage(t("userActivatedEmailProcessed"));
  };

  const handleDeny = async (targetUser: User) => {
    await denyUser(targetUser.id, rejectionReasons[targetUser.id]);
    await loadUsers(statusFilter, false);
    setUserToDeny(null);
    setSuccessMessage(t("userDeniedEmailProcessed"));
  };

  const handleSuspend = async (targetUser: User) => {
    await suspendUser(targetUser.id);
    await loadUsers(statusFilter, false);
    setSuccessMessage(t("userSuspendedEmailProcessed"));
  };

  return (
    <section className="flex flex-1 flex-col">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">{t("adminUsers")}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{t("viewPendingAccounts")}</p>
        </div>
        <Link to="/admin/atm-analytics" className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-slate-900 px-5 font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
          ATM Analytics
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`rounded-lg border px-4 py-2 text-sm font-bold ${
              statusFilter === filter
                ? "border-teal-500 bg-teal-50 text-teal-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {filter === "all" ? t("all") : t(statusLabelKeys[filter])}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-lg font-semibold text-slate-600 shadow-soft">
          {t("loadingScenarios")}
        </div>
      )}

      {errorMessage && (
        <div className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5 font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-8 rounded-lg border border-teal-200 bg-teal-50 p-5 font-semibold text-teal-900">
          {successMessage}
        </div>
      )}

      {!isLoading && !errorMessage && (
        <div className="mt-8 grid gap-5">
          {users.map((item) => {
            const canManageAccount = item.role !== "admin";

            return (
              <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Info label={t("fullName")} value={item.full_name} />
                  <Info label={t("email")} value={item.email} />
                  <Info label={t("userCategory")} value={t(categoryLabelKeys[item.user_category])} />
                  <Info label={t("preferredLanguage")} value={item.preferred_language.toUpperCase()} />
                  <Info label={t("approvalStatus")} value={t(statusLabelKeys[item.approval_status])} />
                  <Info label={t("createdDate")} value={new Date(item.created_at).toLocaleDateString()} />
                </div>

                {canManageAccount && item.approval_status === "pending" && (
                  <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <input
                      value={rejectionReasons[item.id] ?? ""}
                      onChange={(event) =>
                        setRejectionReasons((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                      placeholder={t("rejectionReason")}
                      className="min-h-[48px] rounded-lg border border-slate-300 px-4 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => void handleApprove(item)}
                      className="min-h-[48px] rounded-lg bg-teal-600 px-5 py-2 font-bold text-white hover:bg-teal-700"
                    >
                      {t("approve")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserToDeny(item)}
                      className="min-h-[48px] rounded-lg border border-rose-200 bg-rose-50 px-5 py-2 font-bold text-rose-800 hover:bg-rose-100"
                    >
                      {t("deny")}
                    </button>
                  </div>
                )}

                {canManageAccount && item.approval_status === "approved" && (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleSuspend(item)}
                      className="min-h-[48px] rounded-lg border border-amber-200 bg-amber-50 px-5 py-2 font-bold text-amber-900 hover:bg-amber-100"
                    >
                      {t("suspend")}
                    </button>
                  </div>
                )}

                {canManageAccount && item.approval_status === "suspended" && (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleActivate(item)}
                      className="min-h-[48px] rounded-lg bg-teal-600 px-5 py-2 font-bold text-white hover:bg-teal-700"
                    >
                      {t("activate")}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {userToDeny && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="deny-user-title"
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h2 id="deny-user-title" className="text-2xl font-bold text-slate-950">
              {t("confirmDenyTitle")}
            </h2>
            <p className="mt-3 leading-7 text-slate-600">{t("confirmDenyBody")}</p>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 font-semibold text-slate-900">
              {userToDeny.full_name}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setUserToDeny(null)}
                className="min-h-[48px] rounded-lg border border-slate-200 bg-white px-5 py-2 font-bold text-slate-700 hover:bg-slate-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleDeny(userToDeny)}
                className="min-h-[48px] rounded-lg bg-rose-700 px-5 py-2 font-bold text-white hover:bg-rose-800"
              >
                {t("confirmDeny")}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
