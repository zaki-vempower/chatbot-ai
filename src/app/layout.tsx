import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ClientThemeProvider } from '@/components/ClientThemeProvider';
import { ToastContextProvider } from '@/components/ToastProvider'
import { I18nProvider } from '@/components/I18nProvider'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Chatbot - Multi-Provider Chat Application",
  description: "A powerful chatbot application with support for OpenAI, Claude, Gemini, and DeepSeek. Features web crawling, user authentication, and conversation management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppRouterCacheProvider>
          <ClientThemeProvider>
            <ToastContextProvider>
              <I18nProvider>
                {children}
              </I18nProvider>
            </ToastContextProvider>
          </ClientThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
