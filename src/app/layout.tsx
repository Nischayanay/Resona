import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Resona | AI Memory for Conversations, People, and Follow-ups",
  description: "Resona remembers important conversations, people, opportunities, action items, calendar suggestions, and follow-ups so meaningful context does not disappear.",
  keywords: ["AI conversation memory", "meeting memory", "follow-up tracker", "AI notes", "conversation intelligence", "calendar follow-up"],
  openGraph: {
    title: "Resona | AI Memory for Conversations",
    description: "Remember people, opportunities, action items, and follow-ups from important conversations.",
    type: "website"
  },
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
