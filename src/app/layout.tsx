import type { Metadata, Viewport } from "next";
import { Anuphan, Kanit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/app/components/ui/toaster";
import { Providers } from "@/app/components/providers";
import { getSession } from "@/actions/auth";

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
  display: "swap",
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f4a96" },
    { media: "(prefers-color-scheme: dark)", color: "#07101d" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "MSS Admin",
    template: "%s | MSS Admin",
  },
  description: "MSS Admin",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSession();

  return (
    <html lang="th" className={`${anuphan.variable} ${kanit.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <Providers initialUser={sessionUser}>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
