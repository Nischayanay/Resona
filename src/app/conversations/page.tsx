"use client";

import { AppShell } from "@/components/app/AppShell";
import { ConversationsIndex } from "@/components/app/ConversationsIndex";

export default function ConversationsPage() {
  return <AppShell>{(session) => <ConversationsIndex session={session} />}</AppShell>;
}
