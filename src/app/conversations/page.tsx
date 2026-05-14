"use client";

import { AppShell } from "@/components/app/AppShell";
import { QuietRoutePlaceholder } from "@/components/app/QuietRoutePlaceholder";

export default function ConversationsPage() {
  return <AppShell>{(session) => <QuietRoutePlaceholder route="conversations" session={session} />}</AppShell>;
}
