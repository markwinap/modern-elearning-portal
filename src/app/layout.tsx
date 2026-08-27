import "~/styles/globals.css";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { type Metadata, type Viewport } from "next";
import { Geist } from "next/font/google";

import { ThemeProvider } from "~/components/theme/theme-provider";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Modern E-Learning Portal",
  description:
    "A modern learning management system for students, teachers, and administrators.",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/icons/icon-192x192.png" },
    { rel: "apple-touch-icon", url: "/icons/icon-192x192.png" },
  ],
};

export const viewport: Viewport = {
  themeColor: "#1677ff",
  viewportFit: "cover",
};

const geist = Geist({
  subsets: ["latin"],
});

// Inline script to set data-theme before React hydrates — prevents flash of wrong theme
const themeScript = `try{var p=localStorage.getItem('theme-preference')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}`;

// Register the PWA service worker on supported browsers. Skip registration in
// development so that Next.js client-side navigation is not interfered with
// during local HMR/testing.
const isDev = process.env.NODE_ENV === "development";
const swScript = `if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW registration failed',e);});});}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {!isDev && <script dangerouslySetInnerHTML={{ __html: swScript }} />}
      </head>
      <body className={geist.className}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <TRPCReactProvider>
          <AntdRegistry>
            <ThemeProvider fontFamily={geist.style.fontFamily}>
              <div id="main-content" tabIndex={-1}>
                {children}
              </div>
            </ThemeProvider>
          </AntdRegistry>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
