"use client";

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (typeof window !== "undefined" ? `${window.location.origin}/api` : "");
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }

  return payload as T;
};
