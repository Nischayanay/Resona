"use client";

import { AppShell } from "@/components/app/AppShell";
import { SessionDetailView } from "@/components/app/SessionDetailView";

export default function SessionPage() {
  return <AppShell>{(session) => <SessionDetailView session={session} />}</AppShell>;
}
