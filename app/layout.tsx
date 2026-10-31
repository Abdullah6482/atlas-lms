import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas Learning | Learn with momentum",
  description: "An advanced learning management platform for courses, lessons, quizzes, assignments, progress, and teaching.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
