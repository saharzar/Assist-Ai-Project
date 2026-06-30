import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";

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

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isGuest, guestSession, logout } = useAuth();
  const { t } = useTranslation();

  if (!isAuthenticated && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("profileTitle")}</h1>

      {user && (
        <div className="mt-8 grid gap-4 text-base">
          <ProfileRow label={t("fullName")} value={user.full_name} />
          <ProfileRow label={t("email")} value={user.email} />
          <ProfileRow label={t("userCategory")} value={t(categoryLabelKeys[user.user_category])} />
          <ProfileRow label={t("preferredLanguage")} value={user.preferred_language.toUpperCase()} />
          <ProfileRow label={t("role")} value={user.role} />
          <ProfileRow label={t("approvalStatus")} value={t(statusLabelKeys[user.approval_status])} />
        </div>
      )}

      {guestSession && (
        <div className="mt-8 grid gap-4 text-base">
          <ProfileRow label={t("guestMode")} value={t("yes")} />
          <ProfileRow
            label={t("saveProgressLabel")}
            value={guestSession.save_progress ? t("yes") : t("no")}
          />
          <ProfileRow label={t("preferredLanguage")} value={guestSession.preferred_language.toUpperCase()} />
        </div>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="mt-8 min-h-[52px] rounded-lg bg-slate-900 px-6 py-3 text-base font-bold text-white shadow-soft hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        {t("logout")}
      </button>
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
