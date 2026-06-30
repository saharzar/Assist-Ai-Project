import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import { approveUser, denyUser, fetchAdminUsers, type AdminUserStatusFilter } from "../../services/adminService";
import type { User } from "../../services/authService";

const filters: AdminUserStatusFilter[] = ["pending", "approved", "denied", "all"];
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
} as const;

export function AdminUsersPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>("pending");
  const [users, setUsers] = useState<User[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = isAuthenticated && user?.role === "admin";

  const loadUsers = async (status: AdminUserStatusFilter) => {
    setIsLoading(true);
    setErrorMessage("");
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
    await loadUsers(statusFilter);
  };

  const handleDeny = async (targetUser: User) => {
    await denyUser(targetUser.id, rejectionReasons[targetUser.id]);
    await loadUsers(statusFilter);
  };

  return (
    <section className="flex flex-1 flex-col">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">{t("adminUsers")}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{t("viewPendingAccounts")}</p>
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

      {!isLoading && !errorMessage && (
        <div className="mt-8 grid gap-5">
          {users.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Info label={t("fullName")} value={item.full_name} />
                <Info label={t("email")} value={item.email} />
                <Info label={t("userCategory")} value={t(categoryLabelKeys[item.user_category])} />
                <Info label={t("preferredLanguage")} value={item.preferred_language.toUpperCase()} />
                <Info label={t("approvalStatus")} value={t(statusLabelKeys[item.approval_status])} />
                <Info label={t("createdDate")} value={new Date(item.created_at).toLocaleDateString()} />
              </div>

              {item.approval_status === "pending" && (
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
                    onClick={() => void handleDeny(item)}
                    className="min-h-[48px] rounded-lg border border-rose-200 bg-rose-50 px-5 py-2 font-bold text-rose-800 hover:bg-rose-100"
                  >
                    {t("deny")}
                  </button>
                </div>
              )}
            </article>
          ))}
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
