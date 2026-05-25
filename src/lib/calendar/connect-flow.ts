export function normalizeReturnPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }

  try {
    const url = new URL(value, "https://vynora.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/home";
  }
}

export function appendStatusToReturnPath(path: string, status: string, reason?: string) {
  const url = new URL(path, "https://vynora.local");
  url.searchParams.set("calendar", status);
  if (reason) {
    url.searchParams.set("calendar_reason", reason);
  } else {
    url.searchParams.delete("calendar_reason");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
