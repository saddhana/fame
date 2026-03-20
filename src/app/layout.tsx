import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  title: "FAME — Silsilah Keluarga Kita",
  description: "Aplikasi silsilah keluarga untuk mencatat dan menampilkan pohon keluarga, biodata, dan foto keluarga.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-stone-50">
        <TooltipProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              className: 'font-sans',
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
