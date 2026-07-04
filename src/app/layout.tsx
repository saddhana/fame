import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sastro.daniswara.dev"),
  title: "FAME — Silsilah Keluarga Kita",
  description: "Aplikasi silsilah keluarga untuk mencatat dan menampilkan pohon keluarga, biodata, dan foto keluarga.",
  icons: {
    icon: "/og-image.png",
    apple: "/og-image.png",
  },
  openGraph: {
    title: "FAME — Silsilah Keluarga Kita",
    description: "Aplikasi silsilah keluarga untuk mencatat dan menampilkan pohon keluarga, biodata, dan foto keluarga.",
    siteName: "FAME",
    type: "website",
    images: [{ url: "/og-image.png", width: 1080, height: 1080, alt: "FAME" }],
  },
  twitter: {
    card: "summary",
    title: "FAME — Silsilah Keluarga Kita",
    description: "Aplikasi silsilah keluarga untuk mencatat dan menampilkan pohon keluarga, biodata, dan foto keluarga.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-full bg-background">
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
