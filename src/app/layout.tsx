import "~/styles/globals.css";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { ThemeProvider } from "~/components/theme/theme-provider";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "EduCore — E-Learning Portal",
  description: "A modern learning management system for students, teachers, and administrators.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
});

// Inline script to set data-theme before React hydrates — prevents flash of wrong theme
const themeScript = `try{var p=localStorage.getItem('theme-preference')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={geist.className}>
        <TRPCReactProvider>
          <AntdRegistry>
            <ThemeProvider fontFamily={geist.style.fontFamily}>
              {children}
            </ThemeProvider>
          </AntdRegistry>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
