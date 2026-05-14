"use client";

import { AppShell } from "@/components/app/AppShell";
import { SessionDetailView } from "@/components/app/SessionDetailView";

export default function ConversationDetailPage() {
  return <AppShell>{(session) => <SessionDetailView session={session} backHref="/conversations" />}</AppShell>;
}
