"use client";

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  MainButton?: {
    hide: () => void;
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export const getTelegramWebApp = () => window.Telegram?.WebApp;

export const prepareTelegramShell = () => {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return;
  }

  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor?.("#0f766e");
  webApp.setBackgroundColor?.("#f8f4eb");
  webApp.MainButton?.hide();
};

