"use client";

import { AppShell } from "@/components/app/AppShell";
import { QuietRoutePlaceholder } from "@/components/app/QuietRoutePlaceholder";

export default function MemoryPage() {
  return <AppShell>{(session) => <QuietRoutePlaceholder route="memory" session={session} />}</AppShell>;
}
