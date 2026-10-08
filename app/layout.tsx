import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";

// Font for headings and brand elements
const jakarta = localFont({
  src: [
    {
      path: "../fonts/PlusJakartaSans-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/PlusJakartaSans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-plus-jakarta",
  display: "swap",
});

// Font for body text, forms, navigation, etc.
const inter = localFont({
  src: [
    {
      path: "../fonts/Inter-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Inter-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/Inter-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SATAT – Continuous, Sustainable Wellness",
  description: "Personal wellness, nutrition, and training system.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SATAT",
  },
  icons: {
    icon: [
      {
        url: "/BrandLogo_Header.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/BrandLogo_Header.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: "/BrandLogo_Header.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08090A" },
    { media: "(prefers-color-scheme: light)", color: "#F7F7F4" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${inter.variable}`}
    >
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange
        >
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}