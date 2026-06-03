import "~/styles/globals.css";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "EduCore — E-Learning Portal",
  description: "A modern learning management system for students, teachers, and administrators.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <TRPCReactProvider>
          <AntdRegistry>
            <ConfigProvider
              theme={{
                token: {
                  colorPrimary: "#4F46E5",
                  colorLink: "#4F46E5",
                  borderRadius: 8,
                  fontFamily: geist.style.fontFamily,
                },
                algorithm: theme.defaultAlgorithm,
              }}
            >
              <App>
                {children}
              </App>
            </ConfigProvider>
          </AntdRegistry>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
