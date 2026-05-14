import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Resona",
  description: "AI memory layer for conversations, people, and opportunities.",
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
