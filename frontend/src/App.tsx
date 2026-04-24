import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { RealtimeProvider } from "./components/providers/RealtimeProvider";
import { ErrorBoundary } from "./components/providers/ErrorBoundary";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const FlightsPage = lazy(() => import("./pages/FlightsPage"));
const UldTrackingPage = lazy(() => import("./pages/UldTrackingPage"));
const ExposureAnalysisPage = lazy(() => import("./pages/ExposureAnalysisPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const InterventionsPage = lazy(() => import("./pages/InterventionsPage"));
const AirportsPage = lazy(() => import("./pages/AirportsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));

function RouteErrorFallback({ name }: { name: string }) {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
          <span className="text-lg font-bold text-rose-600">!</span>
        </div>
        <h3 className="text-base font-semibold text-slate-900">{name} Error</h3>
        <p className="mt-2 text-sm text-slate-600">This module failed to load. Please try again or reload the application.</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <RealtimeProvider>
        <AppLayout>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
                  Loading AeroSentinel module…
                </div>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <ErrorBoundary fallback={<RouteErrorFallback name="Dashboard" />}>
                  <DashboardPage />
                </ErrorBoundary>
              } />
              <Route path="/flights" element={
                <ErrorBoundary fallback={<RouteErrorFallback name="Flights" />}>
                  <FlightsPage />
                </ErrorBoundary>
              } />
              <Route path="/uld-tracking" element={
                <ErrorBoundary fallback={<RouteErrorFallback name="ULD Tracking" />}>
                  <UldTrackingPage />
                </ErrorBoundary>
              } />
              <Route path="/exposure" element={
                <ErrorBoundary fallback={<RouteErrorFallback name="Exposure Analysis" />}>
                  <ExposureAnalysisPage />
                </ErrorBoundary>
              } />
              <Route path="/exposure-analysis" element={<Navigate to="/exposure" replace />} />
              <Route path="/alerts" element={
                <ErrorBoundary fallback={<RouteErrorFallback name="Alerts" />}>
                  <AlertsPage />
                </ErrorBoundary>
              } />
              <Route path="/interventions" element={
                <ErrorBoundary fallback={<RouteErrorFallback name="Interventions" />}>
                  <InterventionsPage />
                </ErrorBoundary>
              } />
              <Route path="/airports" element={
                <ErrorBoundary fallback={<RouteErrorFallback name="Airports" />}>
                  <AirportsPage />
                </ErrorBoundary>
              } />
              <Route path="/analytics" element={
                <ErrorBoundary fallback={<RouteErrorFallback name="Analytics" />}>
                  <AnalyticsPage />
                </ErrorBoundary>
              } />
              <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </RealtimeProvider>
    </BrowserRouter>
  );
}
