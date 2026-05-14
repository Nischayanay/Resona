"use client";

import { AppShell } from "@/components/app/AppShell";
import { SettingsControlCenter } from "@/components/app/SettingsControlCenter";

export default function SettingsPage() {
  return <AppShell>{(session) => <SettingsControlCenter session={session} />}</AppShell>;
}
