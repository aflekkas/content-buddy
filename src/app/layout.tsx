import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Tell me what you want, I'll tell you what to film.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full overflow-hidden antialiased"
      suppressHydrationWarning
    >
      <body className="h-svh overflow-hidden flex flex-col font-sans">
        <NextTopLoader
          color="oklch(0.685 0.169 237.323)"
          height={2}
          showSpinner={false}
          shadow={false}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
