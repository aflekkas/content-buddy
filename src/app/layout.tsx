import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { BRAND_NAME, MASCOT_SRC } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Tell me what you want, I'll tell you what to film.",
  icons: {
    icon: [{ url: MASCOT_SRC, type: "image/png" }],
    shortcut: [{ url: MASCOT_SRC, type: "image/png" }],
    apple: [{ url: MASCOT_SRC, type: "image/png" }],
  },
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
