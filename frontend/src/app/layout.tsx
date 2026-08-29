import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsProvider, THEME_BOOTSTRAP } from "@/lib/settings";
import { WorkspaceProvider } from "@/lib/workspace";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NOESIS — Your AI coding assistant",
  description:
    "Runs and traces your Python step by step, and when you're stuck, works the problem out with you instead of just handing you the fix.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The bootstrap script below writes theme attributes onto <html> before
    // React hydrates, so those attributes legitimately differ from the server
    // markup. suppressHydrationWarning applies to this element only.
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <head>
        {/* Applied before first paint so a stored theme never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="font-sans antialiased">
        <SettingsProvider>
          <WorkspaceProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </WorkspaceProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
