import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthHashHandler } from "@/components/auth/AuthHashHandler";

export const metadata: Metadata = {
  title: "TrackFit Pro",
  description: "Seguimiento de entrenamiento personal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrackFit Pro",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#534AB7",
  viewportFit: "cover",
};

// Anti-flash script: applied before first paint to avoid white flash in dark mode.
// Dark mode only applies inside the dashboard — public pages (landing, login,
// register) are always light, so we never add the `dark` class outside /dashboard.
const themeScript = `
try {
  var isDashboard = window.location.pathname.indexOf('/dashboard') === 0;
  var stored = localStorage.getItem('tf-theme');
  var theme = stored || 'system';
  var wantsDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDashboard && wantsDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch(e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
