"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DashboardResponse } from "@lending/shared";
import { apiRequest } from "../lib/api";
import { getTelegramWebApp, prepareTelegramShell } from "../lib/telegram";

type AppContextValue = {
  token: string | null;
  dashboard: DashboardResponse | null;
  loading: boolean;
  authError: string | null;
  refreshDashboard: () => Promise<void>;
  request: <T>(path: string, options?: Parameters<typeof apiRequest>[1]) => Promise<T>;
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshDashboard = async () => {
    if (!token) {
      return;
    }
    const data = await apiRequest<DashboardResponse>("/users/dashboard", { token });
    setDashboard(data);
  };

  useEffect(() => {
    const boot = async () => {
      prepareTelegramShell();

      const cachedToken = window.localStorage.getItem("kopa_jwt");
      if (cachedToken) {
        setToken(cachedToken);
        try {
          const data = await apiRequest<DashboardResponse>("/users/dashboard", { token: cachedToken });
          setDashboard(data);
          setLoading(false);
          return;
        } catch {
          window.localStorage.removeItem("kopa_jwt");
        }
      }

      const webApp = getTelegramWebApp();
      if (!webApp?.initData) {
        setAuthError("Open this experience inside Telegram so we can verify your session.");
        setLoading(false);
        return;
      }

      try {
        const auth = await apiRequest<{ token: string }>("/auth/telegram", {
          method: "POST",
          body: { initData: webApp.initData }
        });
        window.localStorage.setItem("kopa_jwt", auth.token);
        setToken(auth.token);
        const data = await apiRequest<DashboardResponse>("/users/dashboard", { token: auth.token });
        setDashboard(data);
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Authentication failed");
      } finally {
        setLoading(false);
      }
    };

    void boot();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      token,
      dashboard,
      loading,
      authError,
      refreshDashboard,
      request: <T,>(path: string, options: Parameters<typeof apiRequest>[1] = {}) =>
        apiRequest<T>(path, { ...options, token })
    }),
    [authError, dashboard, loading, token]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

