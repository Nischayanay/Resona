"use client";

import { AppShell } from "@/components/app/AppShell";
import { CaptureWorkspace } from "@/components/app/CaptureWorkspace";

export default function HomeExperiencePage() {
  return <AppShell>{(session) => <CaptureWorkspace session={session} />}</AppShell>;
}
