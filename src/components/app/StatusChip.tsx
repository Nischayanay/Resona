import type { SessionStatus } from "@/components/app/types";

export function statusTone(status: SessionStatus | string) {
  if (status === "completed" || status === "executed") {
    return "good";
  }
  if (status === "failed" || status === "partial_failed") {
    return "bad";
  }
  return "neutral";
}

export function StatusChip({ status }: { status: SessionStatus | string }) {
  return (
    <span className="status-chip" data-tone={statusTone(status)}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
