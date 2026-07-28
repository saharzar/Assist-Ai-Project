import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation, type LanguageCode } from "../i18n";

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
const languageNames: Record<LanguageCode, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  tr: "Türkçe",
  pt: "Português",
  fr: "Français",
};
const roleNames: Record<LanguageCode, Record<string, string>> = {
  en: { user: "User", admin: "Administrator", guest: "Guest" },
  es: { user: "Usuario", admin: "Administrador", guest: "Invitado" },
  de: { user: "Benutzer", admin: "Administrator", guest: "Gast" },
  tr: { user: "Kullanıcı", admin: "Yönetici", guest: "Misafir" },
  pt: { user: "Utilizador", admin: "Administrador", guest: "Convidado" },
  fr: { user: "Utilisateur", admin: "Administrateur", guest: "Invité" },
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isGuest, guestSession, setPreferredLanguage, logout } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState("");

  if (!isAuthenticated && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleLanguageChange = async (preferredLanguage: LanguageCode) => {
    setIsSavingLanguage(true);
    setLanguageError("");
    try {
      await setPreferredLanguage(preferredLanguage);
      setLanguage(preferredLanguage);
    } catch {
      setLanguageError(t("authFormError"));
    } finally {
      setIsSavingLanguage(false);
    }
  };

  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-1 items-start justify-center py-8 sm:py-12">
      <div className="w-full overflow-hidden rounded-lg border border-indigo-950/10 bg-white shadow-[0_24px_60px_rgba(42,37,134,0.12)]">
        <header className="border-b border-indigo-950/10 bg-[#f8f8ff] px-6 py-7 sm:px-10 sm:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#2a2586] text-xl font-extrabold text-white ring-4 ring-cyan-100">
                {initials(user?.full_name ?? t("guestMode"))}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{t("profileTitle")}</p>
                <h1 className="mt-1 truncate font-display text-2xl font-bold text-[#1d1a5e] sm:text-3xl">
                  {user?.full_name ?? t("guestMode")}
                </h1>
                {user?.email && <p className="mt-1 truncate text-sm text-[#5b5a78]">{user.email}</p>}
              </div>
            </div>
            {user && (
              <span className={`inline-flex min-h-[36px] items-center self-start rounded-full px-4 text-sm font-bold sm:self-center ${statusStyle(user.approval_status)}`}>
                <i className="mr-2 h-2 w-2 rounded-full bg-current" />
                {t(statusLabelKeys[user.approval_status])}
              </span>
            )}
          </div>
        </header>

        <div className="px-6 py-7 sm:px-10 sm:py-9">
          {user && (
            <div className="grid gap-x-10 sm:grid-cols-2">
              <ProfileRow label={t("fullName")} value={user.full_name} />
              <ProfileRow label={t("email")} value={user.email} />
              <ProfileRow label={t("userCategory")} value={t(categoryLabelKeys[user.user_category])} />
              <LanguagePreference
                label={t("preferredLanguage")}
                value={user.preferred_language as LanguageCode}
                disabled={isSavingLanguage}
                error={languageError}
                onChange={(value) => void handleLanguageChange(value)}
              />
              <ProfileRow label={t("role")} value={localizedRole(user.role, language)} />
              <ProfileRow label={t("approvalStatus")} value={t(statusLabelKeys[user.approval_status])} />
            </div>
          )}

          {guestSession && (
            <div className="grid gap-x-10 sm:grid-cols-2">
              <ProfileRow label={t("guestMode")} value={t("yes")} />
              <ProfileRow
                label={t("saveProgressLabel")}
                value={guestSession.save_progress ? t("yes") : t("no")}
              />
              <ProfileRow label={t("preferredLanguage")} value={guestSession.preferred_language.toUpperCase()} />
            </div>
          )}
        </div>

        <footer className="flex justify-end border-t border-indigo-950/10 bg-[#fafbff] px-6 py-5 sm:px-10">
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-[52px] w-full rounded-lg bg-[#2a2586] px-7 py-3 text-base font-bold text-white shadow-[0_10px_24px_-10px_rgba(42,37,134,0.6)] transition hover:bg-[#1d1a5e] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 sm:w-auto"
          >
            {t("logout")}
          </button>
        </footer>
      </div>
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-indigo-950/10 py-5 first:pt-0 sm:[&:nth-child(-n+2)]:pt-0">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 break-words text-base font-bold text-[#1d1a5e] sm:text-lg">{value}</p>
    </div>
  );
}

function LanguagePreference({ label, value, disabled, error, onChange }: { label: string; value: LanguageCode; disabled: boolean; error: string; onChange: (value: LanguageCode) => void }) {
  return (
    <label className="border-b border-indigo-950/10 py-5 first:pt-0 sm:[&:nth-child(-n+2)]:pt-0">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as LanguageCode)}
        className="mt-2 min-h-[48px] w-full rounded-lg border border-indigo-950/15 bg-white px-4 font-bold text-[#1d1a5e] outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 disabled:cursor-wait disabled:opacity-60"
      >
        {(Object.entries(languageNames) as Array<[LanguageCode, string]>).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
      {error && <span className="mt-2 block text-sm font-semibold text-rose-700">{error}</span>}
    </label>
  );
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function localizedRole(role: string, language: LanguageCode) {
  return roleNames[language][role.toLowerCase()] ?? role.replace(/_/g, " ");
}

function statusStyle(status: keyof typeof statusLabelKeys) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}
