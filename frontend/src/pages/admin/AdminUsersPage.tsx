import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

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

const dashboardCopy = {
  en: { overview: "Account overview", emptyTitle: "No users in this queue", emptyBody: "There are no accounts matching the selected status right now.", showAll: "Show all users", users: "User accounts", previous: "Previous", next: "Next", page: "Page" },
  es: { overview: "Resumen de cuentas", emptyTitle: "No hay usuarios en esta cola", emptyBody: "Ahora mismo no hay cuentas con el estado seleccionado.", showAll: "Mostrar todos", users: "Cuentas de usuario", previous: "Anterior", next: "Siguiente", page: "Pagina" },
  de: { overview: "Kontoubersicht", emptyTitle: "Keine Benutzer in dieser Liste", emptyBody: "Derzeit gibt es keine Konten mit dem ausgewahlten Status.", showAll: "Alle Benutzer anzeigen", users: "Benutzerkonten", previous: "Zuruck", next: "Weiter", page: "Seite" },
  tr: { overview: "Hesap ozeti", emptyTitle: "Bu listede kullanici yok", emptyBody: "Secilen durumla eslesen hesap bulunmuyor.", showAll: "Tum kullanicilari goster", users: "Kullanici hesaplari", previous: "Onceki", next: "Sonraki", page: "Sayfa" },
  pt: { overview: "Resumo de contas", emptyTitle: "Nao ha utilizadores nesta fila", emptyBody: "Nao existem contas com o estado selecionado neste momento.", showAll: "Mostrar todos", users: "Contas de utilizador", previous: "Anterior", next: "Seguinte", page: "Pagina" },
  fr: { overview: "Apercu des comptes", emptyTitle: "Aucun utilisateur dans cette liste", emptyBody: "Aucun compte ne correspond actuellement au statut selectionne.", showAll: "Afficher tous", users: "Comptes utilisateurs", previous: "Precedent", next: "Suivant", page: "Page" },
} as const;

const USERS_PER_PAGE = 5;

export function AdminUsersPage() {
  const { user, isAuthenticated } = useAuth();
  const { language, t } = useTranslation();
  const copy = dashboardCopy[language];
  const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>("pending");
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
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
      const everyUserRequest = fetchAdminUsers("all");
      const [filteredUsers, everyUser] = await Promise.all([
        status === "all" ? everyUserRequest : fetchAdminUsers(status),
        everyUserRequest,
      ]);
      setUsers(filteredUsers);
      setAllUsers(everyUser.filter((item) => item.role !== "admin"));
      setCurrentPage(1);
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

  const statusCounts = filters.reduce<Record<AdminUserStatusFilter, number>>(
    (counts, status) => {
      counts[status] = status === "all" ? allUsers.length : allUsers.filter((item) => item.approval_status === status).length;
      return counts;
    },
    { pending: 0, approved: 0, denied: 0, suspended: 0, all: 0 },
  );
  const filteredUsers = users.filter((item) => item.role !== "admin");
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const visiblePage = Math.min(currentPage, totalPages);
  const pageStart = Math.max(1, Math.min(visiblePage - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageStart + index);
  const paginatedUsers = filteredUsers.slice((visiblePage - 1) * USERS_PER_PAGE, visiblePage * USERS_PER_PAGE);

  return (
    <section className="flex flex-1 flex-col">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase text-teal-700">{copy.overview}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{t("adminUsers")}</h1>
        <p className="mt-2 text-base leading-7 text-slate-600">{t("viewPendingAccounts")}</p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`flex min-h-[76px] items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
              statusFilter === filter
                ? "border-teal-500 bg-teal-50 text-teal-900 shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="text-sm font-bold">{filter === "all" ? t("all") : t(statusLabelKeys[filter])}</span>
            <span className="text-2xl font-bold tabular-nums">{statusCounts[filter]}</span>
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
        <div className="mt-7 grid gap-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-950">{copy.users}</h2>
            <span className="text-sm font-semibold tabular-nums text-slate-500">{filteredUsers.length}</span>
          </div>
          {filteredUsers.length === 0 && (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-2xl font-bold text-teal-700" aria-hidden="true">0</span>
              <h3 className="mt-4 text-xl font-bold text-slate-950">{copy.emptyTitle}</h3>
              <p className="mt-2 max-w-md text-slate-600">{copy.emptyBody}</p>
              {statusFilter !== "all" && <button type="button" onClick={() => setStatusFilter("all")} className="mt-5 min-h-[44px] rounded-lg bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">{copy.showAll}</button>}
            </div>
          )}
          {paginatedUsers.map((item) => {
            const canManageAccount = item.role !== "admin";

            if (!canManageAccount) return null;

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
          {totalPages > 1 && (
            <nav aria-label={`${copy.page} ${visiblePage}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <p className="text-sm font-semibold text-slate-500">{copy.page} {visiblePage} / {totalPages}</p>
              <div className="flex items-center gap-1">
                <button type="button" disabled={visiblePage === 1} onClick={() => setCurrentPage(visiblePage - 1)} className="min-h-[40px] rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">{copy.previous}</button>
                {pageNumbers.map((pageNumber) => (
                  <button key={pageNumber} type="button" aria-label={`${copy.page} ${pageNumber}`} aria-current={visiblePage === pageNumber ? "page" : undefined} onClick={() => setCurrentPage(pageNumber)} className={`h-10 min-w-10 rounded-md border px-2 text-sm font-bold ${visiblePage === pageNumber ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{pageNumber}</button>
                ))}
                <button type="button" disabled={visiblePage === totalPages} onClick={() => setCurrentPage(visiblePage + 1)} className="min-h-[40px] rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">{copy.next}</button>
              </div>
            </nav>
          )}
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
