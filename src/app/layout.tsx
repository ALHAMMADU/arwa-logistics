import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARWA LOGISTICS - Global Shipping Platform",
  description: "Enterprise-grade shipping solutions from China to the world. Air, Sea, and Land freight with real-time tracking.",
  keywords: ["ARWA LOGISTICS", "shipping", "logistics", "freight", "cargo", "tracking", "China shipping"],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%2310b981'/><text x='50' y='65' font-size='45' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'>A</text></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Skip to content link for accessibility */}
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {/* Aria-live region for dynamic announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only" id="aria-announcements" />
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
