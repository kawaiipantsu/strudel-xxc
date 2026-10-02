let csrf = "";
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  data?: any,
): Promise<T> {
  const form = data instanceof FormData;
  const headers: Record<string, string> = {};
  if (method !== "GET") headers["X-CSRF-Token"] = csrf;
  if (data && !form) headers["Content-Type"] = "application/json";
  const res = await fetch("/api/" + path, {
    method,
    headers,
    credentials: "same-origin",
    body: data ? (form ? data : JSON.stringify(data)) : undefined,
  });
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(
      "Server response was not JSON. Check network availability.",
    );
  }
  if (!json.ok)
    throw new ApiError(
      json.error?.message || "Request failed",
      json.error?.code,
      res.status,
    );
  return json.data;
}
export async function initSession() {
  const s = await api("session");
  csrf = s.csrf;
  return s;
}
export function setCsrf(value: string) {
  csrf = value;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function mediaLink(id: string) {
  return "/media/" + id;
}
