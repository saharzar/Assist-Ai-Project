import { Navigate, Route, Routes } from "react-router-dom";

import { PageShell } from "./components/PageShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { TranslationProvider } from "./i18n";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminAtmAnalyticsPage } from "./pages/admin/AdminAtmAnalyticsPage";
import { AdminScenarioAnalyticsPage } from "./pages/admin/AdminScenarioAnalyticsPage";
import { AdminSpeechProvidersPage } from "./pages/admin/AdminSpeechProvidersPage";
import { AdminUserQuotasPage } from "./pages/admin/AdminUserQuotasPage";
import { MySpeechUsagePage } from "./pages/MySpeechUsagePage";
import { GuestConsentPage } from "./pages/GuestConsentPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ScenarioCataloguePage } from "./pages/ScenarioCataloguePage";
import { ScenarioDetailPage } from "./pages/ScenarioDetailPage";

export function App() {
  return (
    <TranslationProvider>
      <AuthProvider>
        <Routes>
          <Route element={<PageShell />}>
            <Route index element={<LandingPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="guest" element={<GuestConsentPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/scenario-analytics" element={<AdminScenarioAnalyticsPage />} />
            <Route path="admin/atm-analytics" element={<AdminAtmAnalyticsPage />} />
            <Route path="admin/speech-providers" element={<AdminSpeechProvidersPage />} />
            <Route path="admin/user-quotas" element={<AdminUserQuotasPage />} />
            <Route path="speech-usage" element={<MySpeechUsagePage />} />
            <Route path="scenarios" element={<ScenarioCataloguePage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="scenario/:slug" element={<ScenarioDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </TranslationProvider>
  );
}
