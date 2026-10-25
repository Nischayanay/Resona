"use client";

import { AppShell } from "@/components/app/AppShell";
import { CaptureWorkspace } from "@/components/app/CaptureWorkspace";

export default function CapturePage() {
  return <AppShell>{(session) => <CaptureWorkspace session={session} />}</AppShell>;
}
