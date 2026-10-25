"use client";

import { AppShell } from "@/components/app/AppShell";
import { DonnaChatWorkspace } from "@/components/app/DonnaChatWorkspace";

export default function DonnaChatPage() {
  return <AppShell>{(session) => <DonnaChatWorkspace session={session} />}</AppShell>;
}
