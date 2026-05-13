export function normalizeReturnPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  try {
    const url = new URL(value, "https://resona.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/app";
  }
}

export function appendStatusToReturnPath(path: string, status: string) {
  const url = new URL(path, "https://resona.local");
  url.searchParams.set("calendar", status);
  return `${url.pathname}${url.search}${url.hash}`;
}
