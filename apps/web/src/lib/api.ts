type RequestOptions = {
  method?: string;
  body?: Record<string, unknown>;
  next?: { revalidate?: number };
};

export const CLIENT_API_BASE = "/backend";

const normalizeApiOrigin = (input?: string) => {
  const origin = input && input.length > 0 ? input : "http://127.0.0.1:4000";
  return origin.endsWith("/api") ? origin : `${origin}/api`;
};

export const resolveBaseUrl = () => {
  if (typeof window !== "undefined") {
    return CLIENT_API_BASE;
  }

  return normalizeApiOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    next: options.next
  });

  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }

  return payload;
};
