import { useEffect, useRef, useState } from "react";
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
  es: { overview: "Resumen de cuentas", emptyTitle: "No hay usuarios en esta cola", emptyBody: "Ahora mismo no hay cuentas con el estado seleccionado.", showAll: "Mostrar todos", users: "Cuentas de usuario", previous: "Anterior", next: "Siguiente", page: "Página" },
  de: { overview: "Kontoübersicht", emptyTitle: "Keine Benutzer in dieser Liste", emptyBody: "Derzeit gibt es keine Konten mit dem ausgewählten Status.", showAll: "Alle Benutzer anzeigen", users: "Benutzerkonten", previous: "Zurück", next: "Weiter", page: "Seite" },
  tr: { overview: "Hesap özeti", emptyTitle: "Bu listede kullanıcı yok", emptyBody: "Seçilen durumla eşleşen hesap bulunmuyor.", showAll: "Tüm kullanıcıları göster", users: "Kullanıcı hesapları", previous: "Önceki", next: "Sonraki", page: "Sayfa" },
  pt: { overview: "Resumo de contas", emptyTitle: "Não há utilizadores nesta fila", emptyBody: "Não existem contas com o estado selecionado neste momento.", showAll: "Mostrar todos", users: "Contas de utilizador", previous: "Anterior", next: "Seguinte", page: "Página" },
  fr: { overview: "Aperçu des comptes", emptyTitle: "Aucun utilisateur dans cette liste", emptyBody: "Aucun compte ne correspond actuellement au statut sélectionné.", showAll: "Afficher tous", users: "Comptes utilisateurs", previous: "Précédent", next: "Suivant", page: "Page" },
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
  const userListRef = useRef<HTMLDivElement>(null);

  const isAdmin = isAuthenticated && user?.role === "admin";

  const loadUsers = async (status: AdminUserStatusFilter, clearSuccess = true) => {
    setIsLoading(true);
    setErrorMessage("");
    if (clearSuccess) {
      setSuccessMessage("");
    }
    try {
      const filteredRequest = fetchAdminUsers(status);
      const allRequest = status === "all" ? filteredRequest : fetchAdminUsers("all");
      const [filteredResult, allResult] = await Promise.allSettled([filteredRequest, allRequest]);
      if (filteredResult.status === "fulfilled") {
        setUsers(filteredResult.value);
      } else {
        setErrorMessage(filteredResult.reason instanceof Error ? filteredResult.reason.message : t("authFormError"));
      }
      if (allResult.status === "fulfilled") {
        setAllUsers(allResult.value.filter((item) => item.role !== "admin"));
      } else if (filteredResult.status === "fulfilled" && status === "all") {
        setAllUsers(filteredResult.value.filter((item) => item.role !== "admin"));
      } else {
        console.error("Optional all-user count request failed", allResult.reason);
      }
      setCurrentPage(1);
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
  const changePage = (nextPage: number) => {
    setCurrentPage(nextPage);
    requestAnimationFrame(() => userListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <section className="flex flex-1 flex-col text-[#1d1a3d]">
      <div className="max-w-3xl border-b border-indigo-950/10 pb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{copy.overview}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1d1a5e]">{t("adminUsers")}</h1>
        <p className="mt-2 text-base leading-7 text-slate-600">{t("viewPendingAccounts")}</p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`flex min-h-[96px] flex-col items-start justify-between rounded-xl border p-5 text-left transition ${
              statusFilter === filter
                ? "border-cyan-300 bg-cyan-50 text-[#1d1a5e] shadow-sm"
                : "border-indigo-950/10 bg-white text-slate-600 hover:border-cyan-200 hover:bg-[#fafbff]"
            }`}
          >
            <span className="text-sm font-semibold">{filter === "all" ? t("all") : t(statusLabelKeys[filter])}</span>
            <span className="text-3xl font-extrabold tabular-nums text-[#2a2586]">{statusCounts[filter]}</span>
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
        <div ref={userListRef} className="mt-7 grid scroll-mt-36 gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-950/10 pb-3">
            <h2 className="text-lg font-bold text-[#1d1a5e]">{copy.users}</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#f3f3fb] px-3 py-1 text-sm font-bold tabular-nums text-[#2a2586]">{filteredUsers.length}</span>
              {totalPages > 1 && <div className="inline-flex items-center rounded-lg border border-indigo-950/10 bg-white p-1"><button type="button" aria-label={copy.previous} disabled={visiblePage === 1} onClick={() => changePage(visiblePage - 1)} className="h-9 min-w-9 rounded-md px-2 font-bold text-[#2a2586] hover:bg-[#f3f3fb] disabled:cursor-not-allowed disabled:opacity-30">←</button><span className="min-w-16 px-2 text-center text-sm font-bold text-slate-500">{visiblePage} / {totalPages}</span><button type="button" aria-label={copy.next} disabled={visiblePage === totalPages} onClick={() => changePage(visiblePage + 1)} className="h-9 min-w-9 rounded-md px-2 font-bold text-[#2a2586] hover:bg-[#f3f3fb] disabled:cursor-not-allowed disabled:opacity-30">→</button></div>}
            </div>
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
              <article key={item.id} className="overflow-hidden rounded-xl border border-indigo-950/10 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-indigo-950/10 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f3f3fb] text-sm font-extrabold text-[#2a2586]" aria-hidden="true">{initials(item.full_name)}</span>
                    <div><h3 className="text-lg font-bold text-[#1d1a5e]">{item.full_name}</h3><p className="text-sm text-slate-400">{item.email}</p></div>
                  </div>
                  <StatusPill status={item.approval_status} label={t(statusLabelKeys[item.approval_status])} />
                </div>
                <div className="grid gap-5 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Info label={t("userCategory")} value={t(categoryLabelKeys[item.user_category])} />
                  <Info label={t("preferredLanguage")} value={item.preferred_language.toUpperCase()} />
                  <Info label={t("createdDate")} value={new Date(item.created_at).toLocaleDateString()} />
                  <Info label={t("approvalStatus")} value={t(statusLabelKeys[item.approval_status])} />
                </div>

                {canManageAccount && item.approval_status === "pending" && (
                  <div className="grid gap-3 border-t border-indigo-950/10 bg-[#fafbff] px-6 py-4 md:grid-cols-[1fr_auto_auto]">
                    <input
                      value={rejectionReasons[item.id] ?? ""}
                      onChange={(event) =>
                        setRejectionReasons((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                      placeholder={t("rejectionReason")}
                      className="min-h-[48px] rounded-lg border border-indigo-950/10 bg-white px-4 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    />
                    <button
                      type="button"
                      onClick={() => void handleApprove(item)}
                      className="min-h-[48px] rounded-lg bg-[#2a2586] px-5 py-2 font-bold text-white hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                  <div className="flex justify-end border-t border-indigo-950/10 bg-[#fafbff] px-6 py-4">
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
                  <div className="flex justify-end border-t border-indigo-950/10 bg-[#fafbff] px-6 py-4">
                    <button
                      type="button"
                      onClick={() => void handleActivate(item)}
                      className="min-h-[48px] rounded-lg bg-[#2a2586] px-5 py-2 font-bold text-white hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                <button type="button" disabled={visiblePage === 1} onClick={() => changePage(visiblePage - 1)} className="min-h-[40px] rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">{copy.previous}</button>
                {pageNumbers.map((pageNumber) => (
                  <button key={pageNumber} type="button" aria-label={`${copy.page} ${pageNumber}`} aria-current={visiblePage === pageNumber ? "page" : undefined} onClick={() => changePage(pageNumber)} className={`h-10 min-w-10 rounded-lg border px-2 text-sm font-bold ${visiblePage === pageNumber ? "border-[#2a2586] bg-[#2a2586] text-white" : "border-indigo-950/10 bg-white text-[#2a2586] hover:bg-[#f3f3fb]"}`}>{pageNumber}</button>
                ))}
                <button type="button" disabled={visiblePage === totalPages} onClick={() => changePage(visiblePage + 1)} className="min-h-[40px] rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">{copy.next}</button>
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
            className="w-full max-w-md rounded-xl border border-indigo-950/10 bg-white p-6 shadow-xl"
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
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-[#1d1a3d]">{value}</p>
    </div>
  );
}

function StatusPill({ status, label }: { status: User["approval_status"]; label: string }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-cyan-50 text-teal-700",
    denied: "bg-rose-50 text-rose-700",
    suspended: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>{label}</span>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}
