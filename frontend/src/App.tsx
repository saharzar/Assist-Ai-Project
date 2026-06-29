import { Navigate, Route, Routes } from "react-router-dom";

import { PageShell } from "./components/PageShell";
import { TranslationProvider } from "./i18n";
import { LandingPage } from "./pages/LandingPage";
import { ScenarioCataloguePage } from "./pages/ScenarioCataloguePage";
import { ScenarioDetailPage } from "./pages/ScenarioDetailPage";

export function App() {
  return (
    <TranslationProvider>
      <Routes>
        <Route element={<PageShell />}>
          <Route index element={<LandingPage />} />
          <Route path="scenarios" element={<ScenarioCataloguePage />} />
          <Route path="scenario/:slug" element={<ScenarioDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </TranslationProvider>
  );
}
