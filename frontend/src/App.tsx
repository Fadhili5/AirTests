import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { RealtimeProvider } from "./components/providers/RealtimeProvider";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const UldTrackingPage = lazy(() => import("./pages/UldTrackingPage"));
const ExposureAnalysisPage = lazy(() => import("./pages/ExposureAnalysisPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const InterventionsPage = lazy(() => import("./pages/InterventionsPage"));
const AirportsPage = lazy(() => import("./pages/AirportsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

export function App() {
  return (
    <BrowserRouter>
      <RealtimeProvider>
        <AppLayout>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-slate-300">
                  Loading AeroSentinel module…
                </div>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/uld-tracking" element={<UldTrackingPage />} />
              <Route path="/exposure-analysis" element={<ExposureAnalysisPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/interventions" element={<InterventionsPage />} />
              <Route path="/airports" element={<AirportsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </RealtimeProvider>
    </BrowserRouter>
  );
}
